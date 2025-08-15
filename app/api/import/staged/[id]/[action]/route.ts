import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
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

    const itemId = params.id;
    const action = params.action;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Find the item
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        userId: user.id,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Item is already in the database, just update any metadata if needed
      await prisma.item.update({
        where: { id: itemId },
        data: {
          metadata: JSON.stringify({
            ...JSON.parse(item.metadata || '{}'),
            reviewStatus: 'approved',
            reviewedAt: new Date().toISOString(),
          }),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          itemId: itemId,
          action: 'approve',
          entityType: 'item',
          metadata: JSON.stringify({
            reviewedAt: new Date().toISOString(),
          }),
        },
      });
    } else {
      // Reject: mark as rejected or delete based on preferences
      await prisma.item.update({
        where: { id: itemId },
        data: {
          metadata: JSON.stringify({
            ...JSON.parse(item.metadata || '{}'),
            reviewStatus: 'rejected',
            reviewedAt: new Date().toISOString(),
          }),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          itemId: itemId,
          action: 'reject',
          entityType: 'item',
          metadata: JSON.stringify({
            reviewedAt: new Date().toISOString(),
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      action,
      itemId,
    });
  } catch (error) {
    console.error(`Error ${params.action}ing item:`, error);
    return NextResponse.json(
      { error: `Failed to ${params.action} item` },
      { status: 500 }
    );
  }
}