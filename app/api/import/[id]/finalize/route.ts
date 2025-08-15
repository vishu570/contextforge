import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const importId = params.id;

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

    // Count approved and rejected items
    const items = await prisma.item.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: importRecord.startedAt,
        },
      },
    });

    let approvedCount = 0;
    let rejectedCount = 0;

    for (const item of items) {
      const metadata = JSON.parse(item.metadata || '{}');
      if (metadata.reviewStatus === 'approved') {
        approvedCount++;
      } else if (metadata.reviewStatus === 'rejected') {
        rejectedCount++;
        // Optionally delete rejected items
        await prisma.item.delete({
          where: { id: item.id },
        });
      }
    }

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