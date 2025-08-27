import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['prompt', 'agent', 'rule', 'template']),
  content: z.string(),
  format: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  author: z.string().optional(),
  language: z.string().optional(),
  targetModels: z.string().optional(),
  tags: z.array(z.string()).optional(),
  collectionId: z.string().optional(),
});

// GET /api/items - Fetch all items for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const collectionId = url.searchParams.get('collectionId');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    if (type) {
      where.type = type;
    }

    if (collectionId) {
      where.collections = {
        some: {
          collectionId: collectionId,
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, totalCount] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          collections: {
            include: {
              collection: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.item.count({ where }),
    ]);

    // Transform the response to include tags as simple strings and collections info
    const transformedItems = items.map(item => ({
      ...item,
      tags: item.tags.map(tagRelation => tagRelation.tag.name),
      collections: item.collections.map(collectionRelation => collectionRelation.collection),
    }));

    return NextResponse.json({
      items: transformedItems,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// POST /api/items - Create a new item
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received body:', JSON.stringify(body, null, 2));
    const validatedData = createItemSchema.parse(body);

    // Create the item
    const item = await prisma.item.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        content: validatedData.content,
        format: validatedData.format || 'text',
        metadata: JSON.stringify(validatedData.metadata || {}),
        author: validatedData.author || user.name || user.email,
        language: validatedData.language || 'en',
        targetModels: validatedData.targetModels,
        userId: user.id,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Handle collection linking if provided
    if (validatedData.collectionId) {
      await prisma.itemCollection.create({
        data: {
          itemId: item.id,
          collectionId: validatedData.collectionId,
        },
      });
    }

    // Handle tags if provided
    if (validatedData.tags && validatedData.tags.length > 0) {
      // Create or find tags
      for (const tagName of validatedData.tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });

        // Link tag to item
        await prisma.itemTag.create({
          data: {
            itemId: item.id,
            tagId: tag.id,
          },
        });
      }

      // Fetch the updated item with tags
      const updatedItem = await prisma.item.findUnique({
        where: { id: item.id },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          collections: {
            include: {
              collection: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        ...updatedItem,
        tags: updatedItem?.tags.map(tagRelation => tagRelation.tag.name) || [],
        collections: updatedItem?.collections.map(collectionRelation => collectionRelation.collection) || [],
      }, { status: 201 });
    }

    return NextResponse.json({
      ...item,
      tags: [],
      collections: [],
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}