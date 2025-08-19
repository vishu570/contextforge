import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/analytics/dashboard - Basic dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '30d';
    
    const userId = user.id;
    const timeRangeMs = parseTimeRange(timeRange);
    const startDate = new Date(Date.now() - timeRangeMs);

    // Get basic metrics from the database
    const [
      itemStats,
      recentItems,
      collectionStats,
      apiKeyCount
    ] = await Promise.all([
      // Item statistics
      prisma.item.groupBy({
        by: ['type'],
        where: { 
          userId,
          createdAt: { gte: startDate }
        },
        _count: true
      }),
      
      // Recent items
      prisma.item.findMany({
        where: { 
          userId,
          createdAt: { gte: startDate }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          type: true,
          format: true,
          updatedAt: true
        }
      }),
      
      // Collection statistics
      prisma.collection.count({
        where: { userId }
      }),
      
      // API key count
      prisma.apiKey.count({
        where: { userId }
      })
    ]);

    // Calculate summary statistics
    const totalItems = itemStats.reduce((sum, stat) => sum + stat._count, 0);
    const itemsByType = itemStats.reduce((acc, stat) => {
      acc[stat.type] = stat._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      timeRange,
      userId,
      summary: {
        totalItems,
        totalCollections: collectionStats,
        totalApiKeys: apiKeyCount,
        itemsByType
      },
      recentActivity: {
        items: recentItems
      },
      userEngagement: {
        totalSessions: 0, // Placeholder - would need session tracking
        avgSessionsPerDay: 0,
        featureAdoption: {
          optimizationUsage: 0,
          classificationUsage: 0,
          searchUsage: 0
        }
      },
      contentMetrics: {
        qualityTrends: {
          avgReadability: 0,
          avgConfidence: 0
        },
        optimizationImpact: {
          totalTokenSavings: 0,
          totalCostSavings: 0
        }
      },
      aiPerformance: {
        modelUsage: {},
        overallSuccessRate: 0
      },
      businessInsights: {
        productivity: {
          itemsCreated: totalItems
        },
        roi: {
          costSavings: 0
        }
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard analytics' },
      { status: 500 }
    );
  }
}

function parseTimeRange(range: string): number {
  const unit = range.slice(-1);
  const value = parseInt(range.slice(0, -1));
  
  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
    default: return 30 * 24 * 60 * 60 * 1000;
  }
}