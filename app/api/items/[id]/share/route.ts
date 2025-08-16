import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const shareConfigSchema = z.object({
  expiresAt: z.string().optional(),
  requireAuth: z.boolean().default(false),
  allowComments: z.boolean().default(false),
  permissions: z.enum(['view', 'comment', 'edit']).default('view'),
});

export async function POST(
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
    const config = shareConfigSchema.parse(body);

    // Check if item exists and belongs to user
    const item = await prisma.item.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Generate a unique share token
    const shareToken = generateShareToken();
    
    // Store share configuration in item metadata
    const currentMetadata = JSON.parse(item.metadata || '{}');
    const shareConfig = {
      token: shareToken,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      expiresAt: config.expiresAt,
      requireAuth: config.requireAuth,
      allowComments: config.allowComments,
      permissions: config.permissions,
    };

    currentMetadata.shareConfig = shareConfig;

    await prisma.item.update({
      where: { id },
      data: {
        metadata: JSON.stringify(currentMetadata),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        itemId: id,
        action: 'share',
        entityType: 'item',
        entityId: id,
        metadata: JSON.stringify(shareConfig),
      },
    });

    const shareUrl = `${request.nextUrl.origin}/shared/${shareToken}`;

    return NextResponse.json({
      shareUrl,
      shareToken,
      config: shareConfig,
    });
  } catch (error) {
    console.error('Error creating share link:', error);
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
    const item = await prisma.item.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Remove share configuration from metadata
    const currentMetadata = JSON.parse(item.metadata || '{}');
    delete currentMetadata.shareConfig;

    await prisma.item.update({
      where: { id },
      data: {
        metadata: JSON.stringify(currentMetadata),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        itemId: id,
        action: 'unshare',
        entityType: 'item',
        entityId: id,
        metadata: JSON.stringify({ action: 'removed_share_link' }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing share link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateShareToken(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}