import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  content: z.string().optional(),
  format: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  author: z.string().optional(),
  language: z.string().optional(),
  targetModels: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await prisma.item.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10,
        },
        optimizations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        conversions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        source: true,
        canonical: true,
        duplicates: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateItemSchema.parse(body);

    // Check if item exists and belongs to user
    const existingItem = await prisma.item.findFirst({
      where: {
        id,
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

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Create a new version if content changed
    let shouldCreateVersion = false;
    if (validatedData.content && validatedData.content !== existingItem.content) {
      shouldCreateVersion = true;
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : undefined,
      updatedAt: new Date(),
    };

    // Handle tags separately
    const { tags, ...itemUpdateData } = updateData;

    const result = await prisma.$transaction(async (tx) => {
      // Update the item
      const updatedItem = await tx.item.update({
        where: { id },
        data: itemUpdateData,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Create version if content changed
      if (shouldCreateVersion) {
        const latestVersion = await tx.version.findFirst({
          where: { itemId: id },
          orderBy: { versionNumber: 'desc' },
        });

        await tx.version.create({
          data: {
            itemId: id,
            versionNumber: (latestVersion?.versionNumber || 0) + 1,
            content: validatedData.content!,
            metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : '{}',
            changeReason: 'Manual edit',
            changedBy: user.email,
          },
        });
      }

      // Handle tag updates
      if (tags && Array.isArray(tags)) {
        // Remove existing tags
        await tx.itemTag.deleteMany({
          where: { itemId: id },
        });

        // Add new tags
        for (const tagName of tags) {
          // Create tag if it doesn't exist
          const tag = await tx.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });

          // Create item-tag relationship
          await tx.itemTag.create({
            data: {
              itemId: id,
              tagId: tag.id,
            },
          });
        }
      }

      return updatedItem;
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        itemId: id,
        action: 'update',
        entityType: 'item',
        entityId: id,
        metadata: JSON.stringify({
          changes: validatedData,
          versionCreated: shouldCreateVersion,
        }),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating item:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if item exists and belongs to user
    const existingItem = await prisma.item.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Use transaction to ensure audit log is created before deletion
    await prisma.$transaction(async (tx) => {
      // Create audit log before deletion
      await tx.auditLog.create({
        data: {
          userId: user.id,
          itemId: id,
          action: 'delete',
          entityType: 'item',
          entityId: id,
          metadata: JSON.stringify({
            deletedItem: {
              name: existingItem.name,
              type: existingItem.type,
              format: existingItem.format,
            },
          }),
        },
      });

      // Delete the item (cascade will handle related records)
      await tx.item.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}