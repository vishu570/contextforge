import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const resolvedParams = await params;
    const importId = resolvedParams.id;

    // Get the import record
    const importRecord = await prisma.import.findFirst({
      where: {
        id: importId,
        userId: user.id,
      },
    });

    if (!importRecord) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }

    // Count approved and rejected staged items
    const stagedItems = await prisma.stagedItem.findMany({
      where: {
        importId: importId,
      },
    });

    const approvedCount = stagedItems.filter(item => item.status === 'approved').length;
    const rejectedCount = stagedItems.filter(item => item.status === 'rejected').length;
    const pendingCount = stagedItems.filter(item => item.status === 'pending').length;

    // If there are still pending items, don't allow finalization
    if (pendingCount > 0) {
      return NextResponse.json({ 
        error: `Cannot finalize import with ${pendingCount} pending items. Please approve or reject all items first.` 
      }, { status: 400 });
    }

    // Clean up rejected staged items (optional)
    await prisma.stagedItem.deleteMany({
      where: {
        importId: importId,
        status: 'rejected'
      }
    });

    // Update import record as completed
    await prisma.import.update({
      where: { id: importId },
      data: {
        status: 'completed',
        processedFiles: approvedCount + rejectedCount,
        completedAt: new Date(),
        metadata: JSON.stringify({
          ...JSON.parse(importRecord.metadata || '{}'),
          finalizedAt: new Date().toISOString(),
          approvedItems: approvedCount,
          rejectedItems: rejectedCount,
        }),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'finalize_import',
        entityType: 'import',
        entityId: importId,
        metadata: JSON.stringify({
          approvedItems: approvedCount,
          rejectedItems: rejectedCount,
          totalItems: approvedCount + rejectedCount,
          finalizedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      approvedItems: approvedCount,
      rejectedItems: rejectedCount,
      totalItems: approvedCount + rejectedCount,
    });
  } catch (error) {
    console.error('Error finalizing import:', error);
    return NextResponse.json(
      { error: 'Failed to finalize import' },
      { status: 500 }
    );
  }
}