import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const addItemsSchema = z.object({
  itemIds: z.array(z.string()),
  position: z.number().optional(),
});

const moveItemsSchema = z.object({
  itemIds: z.array(z.string()),
  targetFolderId: z.string(),
  position: z.number().optional(),
});

// POST /api/folders/[id]/items - Add items to folder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const resolvedParams = await params;
    const folderId = resolvedParams.id;

    const body = await request.json();
    const data = addItemsSchema.parse(body);

    // Check if folder exists and belongs to user
    const folder = await prisma.collection.findUnique({
      where: { 
        id: folderId,
        userId: user.id 
      }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Verify all items belong to the user
    const items = await prisma.item.findMany({
      where: {
        id: { in: data.itemIds },
        userId: user.id
      }
    });

    if (items.length !== data.itemIds.length) {
      return NextResponse.json({ error: 'Some items not found or not accessible' }, { status: 404 });
    }

    // Get current max position in folder
    const maxPosition = await prisma.itemCollection.findFirst({
      where: { collectionId: folderId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const startPosition = data.position ?? (maxPosition?.position || 0) + 1;

    // Create item-collection relationships
    const itemCollections = data.itemIds.map((itemId, index) => ({
      itemId,
      collectionId: folderId,
      position: startPosition + index
    }));

    await prisma.itemCollection.createMany({
      data: itemCollections
    });

    return NextResponse.json({ success: true, addedItems: data.itemIds.length });
  } catch (error) {
    console.error('Error adding items to folder:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add items to folder' }, { status: 500 });
  }
}

// PATCH /api/folders/[id]/items - Move items between folders or reorder within folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const resolvedParams = await params;
    const folderId = resolvedParams.id;

    const body = await request.json();
    const { action } = body;

    if (action === 'move') {
      const data = moveItemsSchema.parse(body);
      
      // Verify source folder belongs to user
      const sourceFolder = await prisma.collection.findUnique({
        where: { 
          id: folderId,
          userId: user.id 
        }
      });

      if (!sourceFolder) {
        return NextResponse.json({ error: 'Source folder not found' }, { status: 404 });
      }

      // Verify target folder belongs to user
      const targetFolder = await prisma.collection.findUnique({
        where: { 
          id: data.targetFolderId,
          userId: user.id 
        }
      });

      if (!targetFolder) {
        return NextResponse.json({ error: 'Target folder not found' }, { status: 404 });
      }

      // Move items to target folder
      await prisma.itemCollection.updateMany({
        where: {
          collectionId: folderId,
          itemId: { in: data.itemIds }
        },
        data: {
          collectionId: data.targetFolderId,
          position: data.position || 0
        }
      });

      return NextResponse.json({ success: true, movedItems: data.itemIds.length });
    } else if (action === 'reorder') {
      const { itemPositions } = body as { itemPositions: Array<{ itemId: string; position: number }> };
      
      // Update positions for each item
      for (const { itemId, position } of itemPositions) {
        await prisma.itemCollection.updateMany({
          where: {
            collectionId: folderId,
            itemId: itemId
          },
          data: { position }
        });
      }

      return NextResponse.json({ success: true, reorderedItems: itemPositions.length });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating folder items:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update folder items' }, { status: 500 });
  }
}

// DELETE /api/folders/[id]/items - Remove items from folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const resolvedParams = await params;
    const folderId = resolvedParams.id;

    const { searchParams } = new URL(request.url);
    const itemIds = searchParams.get('itemIds')?.split(',') || [];

    if (itemIds.length === 0) {
      return NextResponse.json({ error: 'No items specified' }, { status: 400 });
    }

    // Check if folder exists and belongs to user
    const folder = await prisma.collection.findUnique({
      where: { 
        id: folderId,
        userId: user.id 
      }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Remove items from folder
    const deleted = await prisma.itemCollection.deleteMany({
      where: {
        collectionId: folderId,
        itemId: { in: itemIds }
      }
    });

    return NextResponse.json({ success: true, removedItems: deleted.count });
  } catch (error) {
    console.error('Error removing items from folder:', error);
    return NextResponse.json({ error: 'Failed to remove items from folder' }, { status: 500 });
  }
}