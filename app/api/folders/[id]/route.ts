import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().optional(),
  autoOrganize: z.boolean().optional(),
  organizationRules: z.record(z.any()).optional(),
});

// GET /api/folders/[id] - Get a specific folder
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folder = await prisma.collection.findUnique({
      where: { 
        id: params.id,
        userId: user.id 
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
          },
          orderBy: [
            { sortOrder: 'asc' },
            { name: 'asc' }
          ]
        },
        parent: true,
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                type: true,
                subType: true,
                format: true,
                createdAt: true,
                updatedAt: true
              }
            }
          },
          orderBy: [
            { position: 'asc' },
            { createdAt: 'desc' }
          ]
        },
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json({ error: 'Failed to fetch folder' }, { status: 500 });
  }
}

// PATCH /api/folders/[id] - Update a folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const data = updateFolderSchema.parse(body);

    // Check if folder exists and belongs to user
    const existingFolder = await prisma.collection.findUnique({
      where: { 
        id: params.id,
        userId: user.id 
      }
    });

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    let path = existingFolder.path;
    let level = existingFolder.level;

    // Handle parent change or name change
    if (data.parentId !== undefined || data.name) {
      const newParentId = data.parentId !== undefined ? data.parentId : existingFolder.parentId;
      const newName = data.name || existingFolder.name;

      // Check for cycles if changing parent
      if (newParentId && newParentId !== existingFolder.parentId) {
        const wouldCreateCycle = await checkForCycle(newParentId, params.id);
        if (wouldCreateCycle) {
          return NextResponse.json({ 
            error: 'Cannot move folder: would create a cycle' 
          }, { status: 400 });
        }
      }

      // Calculate new path and level
      if (newParentId) {
        const parent = await prisma.collection.findUnique({
          where: { id: newParentId }
        });

        if (!parent || parent.userId !== user.id) {
          return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
        }

        path = `${parent.path}/${newName}`;
        level = parent.level + 1;
      } else {
        path = `/${newName}`;
        level = 0;
      }

      // Check for duplicate names in new location
      if (newName !== existingFolder.name || newParentId !== existingFolder.parentId) {
        const duplicateFolder = await prisma.collection.findFirst({
          where: {
            userId: user.id,
            parentId: newParentId || null,
            name: newName,
            NOT: { id: params.id }
          }
        });

        if (duplicateFolder) {
          return NextResponse.json({ 
            error: 'A folder with this name already exists in this location' 
          }, { status: 409 });
        }
      }
    }

    const updateData: any = {
      ...data,
      path,
      level,
    };

    if (data.organizationRules) {
      updateData.organizationRules = JSON.stringify(data.organizationRules);
    }

    const folder = await prisma.collection.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      }
    });

    // Update all descendant paths if path changed
    if (path !== existingFolder.path) {
      await updateDescendantPaths(params.id, path, level);
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Error updating folder:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

// DELETE /api/folders/[id] - Delete a folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const force = searchParams.get('force') === 'true';

    // Check if folder exists and belongs to user
    const folder = await prisma.collection.findUnique({
      where: { 
        id: params.id,
        userId: user.id 
      },
      include: {
        children: true,
        items: true
      }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Check if folder is empty or force delete
    if (!force && (folder.children.length > 0 || folder.items.length > 0)) {
      return NextResponse.json({ 
        error: 'Folder is not empty. Use force=true to delete non-empty folders.',
        hasChildren: folder.children.length > 0,
        hasItems: folder.items.length > 0
      }, { status: 409 });
    }

    // Delete the folder (cascade will handle children and items)
    await prisma.collection.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}

// Helper function to check for cycles in folder hierarchy
async function checkForCycle(parentId: string, childId: string): Promise<boolean> {
  let currentId = parentId;
  
  while (currentId) {
    if (currentId === childId) {
      return true; // Cycle detected
    }
    
    const parent = await prisma.collection.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    });
    
    currentId = parent?.parentId || null;
  }
  
  return false;
}

// Helper function to update all descendant paths when a folder is moved
async function updateDescendantPaths(folderId: string, newPath: string, newLevel: number) {
  const descendants = await prisma.collection.findMany({
    where: {
      path: {
        startsWith: newPath + '/'
      }
    }
  });

  for (const descendant of descendants) {
    const relativePath = descendant.path.substring(newPath.length);
    const newDescendantPath = newPath + relativePath;
    const newDescendantLevel = newLevel + relativePath.split('/').length - 1;

    await prisma.collection.update({
      where: { id: descendant.id },
      data: {
        path: newDescendantPath,
        level: newDescendantLevel
      }
    });
  }
}