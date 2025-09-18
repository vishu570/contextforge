import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface BulkResult {
  success: boolean;
  itemId: string;
  error?: string;
}

async function approveStagedItem(
  stagedItem: any,
  userId: string,
  timestamp: string
): Promise<BulkResult> {
  try {
    const stagedMetadata = JSON.parse(stagedItem.metadata || '{}');
    const suggestedTags: string[] = stagedMetadata.suggested_tags || [];

    const newItem = await prisma.item.create({
      data: {
        userId,
        type: stagedItem.type,
        name: stagedItem.name,
        content: stagedItem.content,
        format: stagedItem.format,
        sourceType: 'github',
        sourceMetadata: stagedItem.metadata,
        metadata: JSON.stringify({
          importId: stagedItem.importId,
          originalPath: stagedItem.originalPath,
          size: stagedItem.size,
          reviewStatus: 'approved',
          reviewedAt: timestamp,
          aiClassification: stagedMetadata.classification,
        }),
      },
    });

    if (suggestedTags.length > 0) {
      for (const tagName of suggestedTags) {
        if (!tagName || !tagName.trim()) continue;
        try {
          let category = await prisma.category.findFirst({
            where: {
              userId,
              name: tagName.trim(),
            },
          });

          if (!category) {
            category = await prisma.category.create({
              data: {
                userId,
                name: tagName.trim(),
                color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
              },
            });
          }

          await prisma.itemCategory.create({
            data: {
              userId,
              itemId: newItem.id,
              categoryId: category.id,
              source: 'ai_suggested',
              confidence: 0.8,
            },
          });
        } catch (tagError) {
          console.warn(
            `Failed to create tag "${tagName}" for item ${newItem.id}:`,
            tagError
          );
        }
      }
    }

    await prisma.stagedItem.update({
      where: { id: stagedItem.id },
      data: { status: 'approved' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        itemId: newItem.id,
        action: 'bulk_approve',
        entityType: 'item',
        metadata: JSON.stringify({
          stagedItemId: stagedItem.id,
          reviewedAt: timestamp,
        }),
      },
    });

    return { success: true, itemId: stagedItem.id };
  } catch (error) {
    console.error(`Bulk approve failed for ${stagedItem.id}:`, error);
    return {
      success: false,
      itemId: stagedItem.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function rejectStagedItem(
  stagedItem: any,
  userId: string,
  timestamp: string
): Promise<BulkResult> {
  try {
    await prisma.stagedItem.update({
      where: { id: stagedItem.id },
      data: { status: 'rejected' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'bulk_reject',
        entityType: 'staged_item',
        entityId: stagedItem.id,
        metadata: JSON.stringify({
          reviewedAt: timestamp,
        }),
      },
    });

    return { success: true, itemId: stagedItem.id };
  } catch (error) {
    console.error(`Bulk reject failed for ${stagedItem.id}:`, error);
    return {
      success: false,
      itemId: stagedItem.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemIds, action } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Item IDs array is required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Load staged items and ensure they belong to the user
    const stagedItems = await prisma.stagedItem.findMany({
      where: {
        id: { in: itemIds },
      },
      include: {
        import: true,
      },
    });

    if (stagedItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'Some staged items not found' },
        { status: 404 }
      );
    }

    const unauthorizedItem = stagedItems.find(
      (item) => item.import.userId !== user.id
    );
    if (unauthorizedItem) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const results: BulkResult[] = [];
    const timestamp = new Date().toISOString();

    // Process items in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < stagedItems.length; i += batchSize) {
      const batch = stagedItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        if (action === 'approve') {
          return approveStagedItem(item, user.id, timestamp);
        }
        return rejectStagedItem(item, user.id, timestamp);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      action,
      totalItems: itemIds.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
