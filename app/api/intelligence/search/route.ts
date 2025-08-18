import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmbeddingService } from '@/lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      query, 
      limit = 10, 
      threshold = 0.7, 
      algorithm = 'cosine',
      providerId 
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const embeddingService = new EmbeddingService(session.user.id);
    
    const searchResults = await embeddingService.semanticSearch(
      query,
      session.user.id,
      {
        limit,
        threshold,
        algorithm,
        providerId,
      }
    );

    // Get item details for results
    const { prisma } = await import('@/lib/db');
    const itemIds = searchResults.results.map(r => r.itemId);
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        type: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const enhancedResults = searchResults.results.map(result => {
      const item = items.find(i => i.id === result.itemId);
      return {
        ...result,
        item: item ? {
          id: item.id,
          name: item.name,
          type: item.type,
          content: item.content.substring(0, 200) + '...', // Truncate for preview
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        } : null,
      };
    }).filter(result => result.item !== null);

    return NextResponse.json({
      query,
      results: enhancedResults,
      metadata: {
        totalResults: enhancedResults.length,
        executionTime: searchResults.executionTime,
        threshold,
        algorithm,
      },
    });
  } catch (error) {
    console.error('Error performing semantic search:', error);
    return NextResponse.json(
      { error: 'Failed to perform semantic search' },
      { status: 500 }
    );
  }
}