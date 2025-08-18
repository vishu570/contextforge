import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmbeddingService } from '@/lib/embeddings';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, content, providerId } = body;

    if (!itemId || !content) {
      return NextResponse.json(
        { error: 'Item ID and content are required' },
        { status: 400 }
      );
    }

    const embeddingService = new EmbeddingService(session.user.id);
    
    // Generate and store embedding
    const result = await embeddingService.embedItem(itemId, content, providerId);

    return NextResponse.json({
      success: true,
      result: {
        dimensions: result.dimensions,
        tokenCount: result.tokenCount,
        provider: result.provider,
        model: result.model,
      },
    });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const itemId = url.searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const embedding = await prisma.itemEmbedding.findUnique({
      where: { itemId },
      include: {
        item: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!embedding || embedding.item.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Embedding not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: embedding.id,
      provider: embedding.provider,
      model: embedding.model,
      dimensions: embedding.dimensions,
      tokenCount: embedding.tokenCount,
      createdAt: embedding.createdAt,
      updatedAt: embedding.updatedAt,
    });
  } catch (error) {
    console.error('Error retrieving embedding:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve embedding' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const itemId = url.searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const embeddingService = new EmbeddingService(session.user.id);
    await embeddingService.deleteEmbeddings(itemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting embedding:', error);
    return NextResponse.json(
      { error: 'Failed to delete embedding' },
      { status: 500 }
    );
  }
}