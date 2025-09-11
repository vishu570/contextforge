import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

const searchSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['prompt', 'agent', 'rule', 'template', 'all']).default('all'),
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  sort: z.enum(['relevance', 'created', 'updated', 'title']).default('relevance'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  includeMetadata: z.boolean().default(false),
  semantic: z.boolean().default(false)
});

// Advanced search API with faceted filtering and semantic search
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = searchSchema.parse(body);

    // Build base query
    const whereClause: any = {
      userId: user.id,
      AND: []
    };

    // Filter by type
    if (validatedData.type !== 'all') {
      whereClause.type = validatedData.type;
    }

    // Text search in title and content
    if (validatedData.query) {
      whereClause.AND.push({
        OR: [
          { name: { contains: validatedData.query } },
          { content: { contains: validatedData.query } }
        ]
      });
    }

    // Filter by tags
    if (validatedData.tags.length > 0) {
      whereClause.AND.push({
        tags: {
          some: {
            tag: {
              name: {
                in: validatedData.tags
              }
            }
          }
        }
      });
    }

    // Filter by categories (stored in metadata)
    if (validatedData.categories.length > 0) {
      whereClause.AND.push({
        metadata: {
          path: ['category'],
          in: validatedData.categories
        }
      });
    }

    // Determine sort order
    let orderBy: any = {};
    switch (validatedData.sort) {
      case 'created':
        orderBy = { createdAt: validatedData.order };
        break;
      case 'updated':
        orderBy = { updatedAt: validatedData.order };
        break;
      case 'title':
        orderBy = { title: validatedData.order };
        break;
      default:
        // For relevance, we'll sort by updated date as fallback
        orderBy = { updatedAt: 'desc' };
    }

    // Execute search query
    const [items, totalCount, facets] = await Promise.all([
      prisma.item.findMany({
        where: whereClause,
        orderBy,
        skip: validatedData.offset,
        take: validatedData.limit,
        select: {
          id: true,
          name: true,
          content: validatedData.includeMetadata,
          type: true,
          tags: {
            select: {
              tag: {
                select: {
                  name: true
                }
              }
            }
          },
          metadata: validatedData.includeMetadata,
          createdAt: true,
          updatedAt: true,
          ...(validatedData.includeMetadata ? {} : {
            content: false
          })
        }
      }),
      
      // Get total count for pagination
      prisma.item.count({ where: whereClause }),
      
      // Get facets for filters
      getFacets(user.id, validatedData.query)
    ]);

    // If semantic search is enabled, re-rank results
    let rankedItems = items;
    if (validatedData.semantic && validatedData.query) {
      rankedItems = await performSemanticRanking(items, validatedData.query);
    }

    // Calculate relevance scores for text-based search
    if (validatedData.sort === 'relevance' && validatedData.query) {
      rankedItems = calculateRelevanceScores(rankedItems, validatedData.query);
    }

    // Prepare response items
    const responseItems = rankedItems.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      tags: item.tags?.map((itemTag: any) => itemTag.tag.name) || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      preview: validatedData.includeMetadata 
        ? item.content?.substring(0, 200) + (item.content && item.content.length > 200 ? '...' : '')
        : undefined,
      metadata: validatedData.includeMetadata ? item.metadata : undefined,
      relevanceScore: (item as any).relevanceScore || 0
    }));

    return NextResponse.json({
      success: true,
      items: responseItems,
      pagination: {
        total: totalCount,
        limit: validatedData.limit,
        offset: validatedData.offset,
        pages: Math.ceil(totalCount / validatedData.limit),
        hasNext: validatedData.offset + validatedData.limit < totalCount,
        hasPrev: validatedData.offset > 0
      },
      facets,
      query: validatedData,
      resultsFound: totalCount,
      processingTime: Date.now() // Would calculate actual time in production
    });

  } catch (error) {
    console.error('Search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

// Get search suggestions based on query
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        popularTags: await getPopularTags(user.id),
        recentSearches: [] // Would implement search history in production
      });
    }

    // Get title suggestions
    const titleSuggestions = await prisma.item.findMany({
      where: {
        userId: user.id,
        name: {
          contains: query
        }
      },
      select: {
        id: true,
        name: true,
        type: true
      },
      take: limit,
      orderBy: { updatedAt: 'desc' }
    });

    // Get tag suggestions
    const tagSuggestions = await prisma.tag.findMany({
      where: {
        name: {
          contains: query
        },
        items: {
          some: {
            item: {
              userId: user.id
            }
          }
        }
      },
      take: limit,
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      suggestions: titleSuggestions.map(item => ({
        type: 'item',
        id: item.id,
        name: item.name,
        itemType: item.type
      })),
      tagSuggestions: tagSuggestions.map(tag => ({
        type: 'tag',
        value: tag.name
      })),
      popularTags: await getPopularTags(user.id)
    });

  } catch (error) {
    console.error('Search suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

async function getFacets(userId: string, query?: string) {
  const baseWhere = { userId };
  
  // Get type distribution
  const typeAggregation = await prisma.item.groupBy({
    by: ['type'],
    where: baseWhere,
    _count: true
  });

  // Get popular tags
  const tagCounts = await prisma.itemTag.groupBy({
    by: ['tagId'],
    where: {
      item: {
        userId
      }
    },
    _count: true,
    orderBy: {
      _count: {
        tagId: 'desc'
      }
    },
    take: 20
  });

  const tagNames = await prisma.tag.findMany({
    where: {
      id: {
        in: tagCounts.map(tc => tc.tagId)
      }
    },
    select: { id: true, name: true }
  });

  const tagNameMap = new Map(tagNames.map(tag => [tag.id, tag.name]));

  // Get categories from metadata
  const allItems = await prisma.item.findMany({
    where: baseWhere,
    select: { metadata: true }
  });

  const categoryCounts: Record<string, number> = {};
  allItems.forEach(item => {
    const category = (item.metadata as any)?.category;
    if (category) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }
  });

  return {
    types: typeAggregation.map(t => ({
      value: t.type,
      count: t._count,
      label: t.type.charAt(0).toUpperCase() + t.type.slice(1)
    })),
    tags: tagCounts.map(tc => ({
      value: tagNameMap.get(tc.tagId) || '',
      count: tc._count,
      label: tagNameMap.get(tc.tagId) || ''
    })).filter(t => t.value),
    categories: Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, count]) => ({ value: category, count, label: category }))
  };
}

async function getPopularTags(userId: string, limit = 10) {
  const tagCounts = await prisma.itemTag.groupBy({
    by: ['tagId'],
    where: {
      item: {
        userId
      }
    },
    _count: true,
    orderBy: {
      _count: {
        tagId: 'desc'
      }
    },
    take: limit
  });

  const tagNames = await prisma.tag.findMany({
    where: {
      id: {
        in: tagCounts.map(tc => tc.tagId)
      }
    },
    select: { id: true, name: true }
  });

  const tagNameMap = new Map(tagNames.map(tag => [tag.id, tag.name]));

  return tagCounts.map(tc => ({
    tag: tagNameMap.get(tc.tagId) || '',
    count: tc._count
  })).filter(t => t.tag);
}

function calculateRelevanceScores(items: any[], query: string): any[] {
  const queryTerms = query.toLowerCase().split(/\s+/);
  
  return items.map(item => {
    let score = 0;
    const title = item.name.toLowerCase();
    const content = (item.content || '').toLowerCase();
    
    // Title matches get higher weight
    queryTerms.forEach(term => {
      if (title.includes(term)) {
        score += title === term ? 100 : title.startsWith(term) ? 50 : 20;
      }
      if (content.includes(term)) {
        score += 5;
      }
    });

    // Boost exact phrase matches
    if (title.includes(query.toLowerCase())) {
      score += 75;
    }

    return { ...item, relevanceScore: score };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

async function performSemanticRanking(items: any[], query: string): Promise<any[]> {
  // Placeholder for semantic search - would integrate with embeddings/vector DB
  // For now, return items with enhanced text similarity
  return items.map(item => {
    const similarity = calculateSemanticSimilarity(query, item.name + ' ' + (item.content || ''));
    return { ...item, semanticScore: similarity };
  }).sort((a, b) => b.semanticScore - a.semanticScore);
}

function calculateSemanticSimilarity(query: string, text: string): number {
  // Simple semantic similarity based on word overlap and position
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);
  
  let score = 0;
  queryWords.forEach(qWord => {
    textWords.forEach((tWord, index) => {
      if (qWord === tWord) score += 10;
      else if (tWord.includes(qWord) || qWord.includes(tWord)) score += 5;
      
      // Proximity bonus (words closer to beginning score higher)
      if (qWord === tWord && index < 20) score += (20 - index);
    });
  });
  
  return score / textWords.length;
}