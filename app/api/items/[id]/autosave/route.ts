import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

const autosaveSchema = z.object({
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  version: z.number().optional(),
  lastModified: z.string().optional()
});

// Auto-save functionality for draft protection
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const validatedData = autosaveSchema.parse(body);

    // Get existing item to verify ownership
    const existingItem = await prisma.item.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Create or update autosave record
    const autosaveData = {
      itemId: id,
      userId: user.id,
      content: validatedData.content,
      metadata: validatedData.metadata || {},
      version: validatedData.version || 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In a real implementation, this would use a separate autosave table
    // For now, we'll store it as metadata on the item
    const existingMetadata = existingItem.metadata ? JSON.parse(existingItem.metadata) : {};
    const updatedMetadata = {
      ...existingMetadata,
      autosave: {
        content: validatedData.content,
        savedAt: new Date().toISOString(),
        version: validatedData.version || 1
      }
    };

    const updatedItem = await prisma.item.update({
      where: { id },
      data: {
        metadata: JSON.stringify(updatedMetadata),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      autosaveId: `autosave_${id}_${Date.now()}`,
      savedAt: new Date().toISOString(),
      version: validatedData.version || 1,
      message: 'Draft saved successfully'
    });

  } catch (error) {
    console.error('Autosave error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid autosave data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 }
    );
  }
}

// Retrieve autosaved content
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const item = await prisma.item.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const metadata = item.metadata ? JSON.parse(item.metadata) : {};
    const autosave = metadata.autosave;
    
    if (!autosave) {
      return NextResponse.json({ 
        success: true,
        hasAutosave: false,
        message: 'No autosaved content found'
      });
    }

    return NextResponse.json({
      success: true,
      hasAutosave: true,
      autosave: {
        content: autosave.content,
        savedAt: autosave.savedAt,
        version: autosave.version || 1
      }
    });

  } catch (error) {
    console.error('Autosave retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve autosaved content' },
      { status: 500 }
    );
  }
}

// Delete autosaved content
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const item = await prisma.item.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Remove autosave from metadata
    const metadata = item.metadata ? JSON.parse(item.metadata) : {};
    delete metadata.autosave;

    await prisma.item.update({
      where: { id },
      data: {
        metadata: JSON.stringify(metadata),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Autosaved content deleted successfully'
    });

  } catch (error) {
    console.error('Autosave deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete autosaved content' },
      { status: 500 }
    );
  }
}