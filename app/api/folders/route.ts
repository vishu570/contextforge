import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  parentId: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isTemplate: z.boolean().default(false),
  autoOrganize: z.boolean().default(false),
  organizationRules: z.record(z.string(), z.any()).default({}),
});

// GET /api/folders - Get user's folder hierarchy
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

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const includeItems = searchParams.get('includeItems') === 'true';
    const flat = searchParams.get('flat') === 'true';

    let folders;
    
    if (flat) {
      // Return all folders in a flat structure
      folders = await prisma.collection.findMany({
        where: { userId: user.id },
        include: {
          children: true,
          parent: true,
          items: includeItems ? {
            include: { item: true }
          } : false,
          _count: {
            select: {
              children: true,
              items: true
            }
          }
        },
        orderBy: [
          { level: 'asc' },
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      });
    } else {
      // Return hierarchical structure
      folders = await prisma.collection.findMany({
        where: { 
          userId: user.id,
          parentId: parentId || null
        },
        include: {
          children: {
            include: {
              _count: {
                select: {
                  children: true,
                  items: true
                }
              }
            }
          },
          items: includeItems ? {
            include: { item: true }
          } : false,
          _count: {
            select: {
              children: true,
              items: true
            }
          }
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      });
    }

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

// POST /api/folders - Create a new folder
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
    const data = createFolderSchema.parse(body);

    // Calculate path and level
    let path = `/${data.name}`;
    let level = 0;
    let parent = null;

    if (data.parentId) {
      parent = await prisma.collection.findUnique({
        where: { id: data.parentId }
      });

      if (!parent || parent.userId !== user.id) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }

      path = `${parent.path}/${data.name}`;
      level = parent.level + 1;
    }

    // Check for duplicate names within the same parent
    const existingFolder = await prisma.collection.findFirst({
      where: {
        userId: user.id,
        parentId: data.parentId || null,
        name: data.name
      }
    });

    if (existingFolder) {
      return NextResponse.json({ 
        error: 'A folder with this name already exists in this location' 
      }, { status: 409 });
    }

    const folder = await prisma.collection.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        path,
        level,
        color: data.color,
        icon: data.icon,
        isTemplate: data.isTemplate,
        autoOrganize: data.autoOrganize,
        organizationRules: JSON.stringify(data.organizationRules),
      },
      include: {
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      }
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    console.error('Error creating folder:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}