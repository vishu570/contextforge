import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

const shareSchema = z.object({
  permission: z.enum(['view', 'comment', 'edit']).default('view'),
  expiresAt: z.string().optional(),
  password: z.string().optional(),
  allowDownload: z.boolean().default(false),
  recipientEmail: z.string().email().optional()
});

// Create a share link for an item
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = shareSchema.parse(body);

    // Verify item ownership
    const item = await prisma.item.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Generate secure share token
    const shareToken = randomBytes(32).toString('hex');
    const expiresAt = validatedData.expiresAt 
      ? new Date(validatedData.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    // Create share record in database
    // For now, store in item metadata - in production use separate shares table
    const shareData = {
      token: shareToken,
      permission: validatedData.permission,
      expiresAt: expiresAt.toISOString(),
      password: validatedData.password,
      allowDownload: validatedData.allowDownload,
      recipientEmail: validatedData.recipientEmail,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      views: 0,
      lastAccessedAt: null
    };

    const updatedItem = await prisma.item.update({
      where: { id },
      data: {
        metadata: {
          ...item.metadata,
          shares: {
            ...item.metadata?.shares,
            [shareToken]: shareData
          }
        },
        updatedAt: new Date()
      }
    });

    // Generate share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/shared/${shareToken}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      shareToken,
      permission: validatedData.permission,
      expiresAt: expiresAt.toISOString(),
      item: {
        id: item.id,
        title: item.title,
        type: item.type
      }
    });

  } catch (error) {
    console.error('Share creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid share data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

// Get existing shares for an item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const item = await prisma.item.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const shares = item.metadata?.shares || {};
    const activeShares = Object.entries(shares)
      .filter(([token, share]: [string, any]) => {
        const expiresAt = new Date(share.expiresAt);
        return expiresAt > new Date();
      })
      .map(([token, share]: [string, any]) => ({
        token,
        permission: share.permission,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        views: share.views || 0,
        lastAccessedAt: share.lastAccessedAt,
        recipientEmail: share.recipientEmail
      }));

    return NextResponse.json({
      success: true,
      shares: activeShares,
      total: activeShares.length
    });

  } catch (error) {
    console.error('Share retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve shares' },
      { status: 500 }
    );
  }
}

// Revoke a share link
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get('token');

    if (!shareToken) {
      return NextResponse.json({ error: 'Share token required' }, { status: 400 });
    }

    const item = await prisma.item.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const shares = item.metadata?.shares || {};
    if (!shares[shareToken]) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Remove the share
    delete shares[shareToken];

    await prisma.item.update({
      where: { id },
      data: {
        metadata: {
          ...item.metadata,
          shares
        },
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully'
    });

  } catch (error) {
    console.error('Share revocation error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}