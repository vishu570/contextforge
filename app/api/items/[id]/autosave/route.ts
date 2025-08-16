import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const autosaveSchema = z.object({
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
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
    const validatedData = autosaveSchema.parse(body);

    // Check if item exists and belongs to user
    const existingItem = await prisma.item.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Create or update draft
    const draftKey = `draft_${id}_${user.id}`;
    const draftData = {
      content: validatedData.content,
      metadata: validatedData.metadata || {},
      lastSaved: new Date().toISOString(),
      originalItemId: id,
    };

    // Store draft in user settings (simple approach)
    const userSettings = JSON.parse(existingItem.metadata || '{}');
    userSettings.drafts = userSettings.drafts || {};
    userSettings.drafts[draftKey] = draftData;

    // We'll store drafts in a simple way for now - in practice, you might want a separate drafts table
    // For this implementation, we'll create a temporary item with a special flag
    const existingDraft = await prisma.item.findFirst({
      where: {
        userId: user.id,
        metadata: {
          contains: `"isDraft":true,"originalItemId":"${id}"`,
        },
      },
    });

    const draftMetadata = {
      isDraft: true,
      originalItemId: id,
      lastAutoSaved: new Date().toISOString(),
      ...validatedData.metadata,
    };

    if (existingDraft) {
      // Update existing draft
      await prisma.item.update({
        where: { id: existingDraft.id },
        data: {
          content: validatedData.content,
          metadata: JSON.stringify(draftMetadata),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new draft
      await prisma.item.create({
        data: {
          userId: user.id,
          type: existingItem.type,
          subType: existingItem.subType,
          name: `${existingItem.name} (Draft)`,
          content: validatedData.content,
          format: existingItem.format,
          metadata: JSON.stringify(draftMetadata),
          author: existingItem.author,
          language: existingItem.language,
          targetModels: existingItem.targetModels,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      message: 'Draft saved successfully',
    });
  } catch (error) {
    console.error('Error saving draft:', error);
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

export async function GET(
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

    // Find existing draft
    const draft = await prisma.item.findFirst({
      where: {
        userId: user.id,
        metadata: {
          contains: `"isDraft":true,"originalItemId":"${id}"`,
        },
      },
    });

    if (!draft) {
      return NextResponse.json({ draft: null });
    }

    const metadata = JSON.parse(draft.metadata || '{}');
    
    return NextResponse.json({
      draft: {
        content: draft.content,
        metadata: metadata,
        lastSaved: metadata.lastAutoSaved,
      },
    });
  } catch (error) {
    console.error('Error retrieving draft:', error);
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

    // Delete draft
    await prisma.item.deleteMany({
      where: {
        userId: user.id,
        metadata: {
          contains: `"isDraft":true,"originalItemId":"${id}"`,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}