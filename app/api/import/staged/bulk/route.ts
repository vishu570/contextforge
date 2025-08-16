import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    // Validate that all items exist and belong to the user
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        userId: user.id,
      },
    });

    if (items.length !== itemIds.length) {
      return NextResponse.json({ 
        error: 'Some items not found or unauthorized' 
      }, { status: 404 });
    }

    const results = [];
    const timestamp = new Date().toISOString();

    // Process items in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        try {
          if (action === 'approve') {
            // Update item metadata to mark as approved
            await prisma.item.update({
              where: { id: item.id },
              data: {
                metadata: JSON.stringify({
                  ...JSON.parse(item.metadata || '{}'),
                  reviewStatus: 'approved',
                  reviewedAt: timestamp,
                }),
              },
            });

            // Create audit log
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                itemId: item.id,
                action: 'bulk_approve',
                entityType: 'item',
                metadata: JSON.stringify({
                  reviewedAt: timestamp,
                }),
              },
            });
          } else {
            // Reject: mark as rejected
            await prisma.item.update({
              where: { id: item.id },
              data: {
                metadata: JSON.stringify({
                  ...JSON.parse(item.metadata || '{}'),
                  reviewStatus: 'rejected',
                  reviewedAt: timestamp,
                }),
              },
            });

            // Create audit log
            await prisma.auditLog.create({
              data: {
                userId: user.id,
                itemId: item.id,
                action: 'bulk_reject',
                entityType: 'item',
                metadata: JSON.stringify({
                  reviewedAt: timestamp,
                }),
              },
            });
          }

          return { success: true, itemId: item.id };
        } catch (error) {
          console.error(`Error ${action}ing item ${item.id}:`, error);
          return { success: false, itemId: item.id, error: error instanceof Error ? error.message : 'Unknown error' };
        }
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