import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

// GET /api/analytics/dashboard - Comprehensive dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '30d';
    const includeRealtime = searchParams.get('realtime') === 'true';

    const userId = session.user.id;
    const timeRangeMs = parseTimeRange(timeRange);
    const startDate = new Date(Date.now() - timeRangeMs);

    // Parallel data fetching for performance
    const [
      userEngagement,
      contentMetrics,
      aiPerformance,
      businessInsights,
      realtimeMetrics
    ] = await Promise.all([
      getUserEngagement(userId, startDate),
      getContentMetrics(userId, startDate),
      getAIPerformance(userId, startDate),
      getBusinessInsights(userId, startDate),
      includeRealtime ? getRealtimeMetrics(userId) : null
    ]);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      timeRange,
      userId,
      userEngagement,
      contentMetrics,
      aiPerformance,
      businessInsights,
      ...(realtimeMetrics && { realtime: realtimeMetrics })
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard analytics' },
      { status: 500 }
    );
  }
}

async function getUserEngagement(userId: string, startDate: Date) {
  // User activity patterns
  const [
    totalSessions,
    dailyActivity,
    featureUsage,
    mostAccessedContent,
    userProductivity
  ] = await Promise.all([
    // Total sessions from audit logs
    prisma.auditLog.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        createdAt: { gte: startDate },
        action: { in: ['login', 'view', 'create', 'update'] }
      },
      _count: true
    }),
    
    // Daily activity breakdown
    prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: true
    }),

    // Feature adoption metrics
    prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        action: { in: ['optimize', 'classify', 'search', 'duplicate_check', 'template_use'] }
      },
      select: {
        action: true,
        createdAt: true,
        metadata: true
      },
      orderBy: { createdAt: 'desc' }
    }),

    // Most accessed content
    prisma.auditLog.groupBy({
      by: ['itemId'],
      where: {
        userId,
        createdAt: { gte: startDate },
        action: 'view',
        itemId: { not: null }
      },
      _count: true,
      orderBy: { _count: { itemId: 'desc' } },
      take: 10
    }),

    // User productivity metrics
    prisma.item.groupBy({
      by: ['type'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: true
    })
  ]);

  // Calculate session aggregates
  const sessionsByDay = totalSessions.reduce((acc: Record<string, number>, session) => {
    const day = session.createdAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + session._count;
    return acc;
  }, {});

  // Feature adoption rates
  const featureStats = featureUsage.reduce((acc: Record<string, number>, usage) => {
    acc[usage.action] = (acc[usage.action] || 0) + 1;
    return acc;
  }, {});

  return {
    totalSessions: Object.values(sessionsByDay).reduce((sum, count) => sum + count, 0),
    avgSessionsPerDay: Object.values(sessionsByDay).length > 0 
      ? Object.values(sessionsByDay).reduce((sum, count) => sum + count, 0) / Object.values(sessionsByDay).length 
      : 0,
    dailyActivity: sessionsByDay,
    activityBreakdown: dailyActivity.reduce((acc: Record<string, number>, activity) => {
      acc[activity.action] = activity._count;
      return acc;
    }, {}),
    featureAdoption: {
      optimizationUsage: featureStats.optimize || 0,
      classificationUsage: featureStats.classify || 0,
      searchUsage: featureStats.search || 0,
      duplicateCheckUsage: featureStats.duplicate_check || 0,
      templateUsage: featureStats.template_use || 0
    },
    mostAccessedContent: mostAccessedContent.map(item => ({
      itemId: item.itemId,
      viewCount: item._count
    })),
    productivity: {
      itemsCreated: userProductivity.reduce((sum, type) => sum + type._count, 0),
      byType: userProductivity.reduce((acc: Record<string, number>, type) => {
        acc[type.type] = type._count;
        return acc;
      }, {})
    }
  };
}

async function getContentMetrics(userId: string, startDate: Date) {
  const [
    contentQuality,
    optimizationImpact,
    duplicatePatterns,
    semanticClusters,
    contentGrowth
  ] = await Promise.all([
    // Content quality trends
    prisma.contentSummary.aggregate({
      where: {
        item: { userId },
        createdAt: { gte: startDate }
      },
      _avg: {
        readabilityScore: true,
        sentimentScore: true,
        confidence: true
      },
      _count: true
    }),

    // Optimization impact analysis
    prisma.modelOptimization.findMany({
      where: {
        item: { userId },
        createdAt: { gte: startDate }
      },
      select: {
        originalTokens: true,
        optimizedTokens: true,
        tokenSavings: true,
        qualityScore: true,
        targetModel: true,
        costEstimate: true,
        status: true
      }
    }),

    // Duplicate detection patterns
    prisma.item.groupBy({
      by: ['isDuplicate'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: true
    }),

    // Semantic clustering insights
    prisma.semanticCluster.findMany({
      include: {
        items: {
          include: {
            item: {
              select: {
                userId: true,
                type: true,
                name: true
              }
            }
          },
          where: {
            item: { userId }
          }
        },
        _count: {
          select: { items: true }
        }
      },
      where: {
        items: {
          some: {
            item: { userId }
          }
        }
      }
    }),

    // Content growth over time
    prisma.item.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: true
    })
  ]);

  // Calculate optimization savings
  const optimizationStats = optimizationImpact.reduce((acc, opt) => {
    if (opt.tokenSavings && opt.costEstimate) {
      acc.totalTokenSavings += opt.tokenSavings;
      acc.totalCostSavings += opt.costEstimate;
      acc.optimizationCount++;
      if (opt.qualityScore) {
        acc.avgQualityScore += opt.qualityScore;
      }
    }
    acc.byModel[opt.targetModel] = (acc.byModel[opt.targetModel] || 0) + 1;
    acc.byStatus[opt.status] = (acc.byStatus[opt.status] || 0) + 1;
    return acc;
  }, {
    totalTokenSavings: 0,
    totalCostSavings: 0,
    optimizationCount: 0,
    avgQualityScore: 0,
    byModel: {} as Record<string, number>,
    byStatus: {} as Record<string, number>
  });

  if (optimizationStats.optimizationCount > 0) {
    optimizationStats.avgQualityScore /= optimizationStats.optimizationCount;
  }

  return {
    qualityTrends: {
      avgReadability: contentQuality._avg.readabilityScore || 0,
      avgSentiment: contentQuality._avg.sentimentScore || 0,
      avgConfidence: contentQuality._avg.confidence || 0,
      totalAnalyzed: contentQuality._count
    },
    optimizationImpact: optimizationStats,
    duplicateDetection: {
      totalItems: duplicatePatterns.reduce((sum, pattern) => sum + pattern._count, 0),
      duplicatesFound: duplicatePatterns.find(p => p.isDuplicate)._count || 0,
      duplicateRate: duplicatePatterns.length > 0 
        ? (duplicatePatterns.find(p => p.isDuplicate)?._count || 0) / duplicatePatterns.reduce((sum, p) => sum + p._count, 0)
        : 0
    },
    semanticClustering: {
      totalClusters: semanticClusters.length,
      avgClusterSize: semanticClusters.length > 0 
        ? semanticClusters.reduce((sum, cluster) => sum + cluster._count.items, 0) / semanticClusters.length 
        : 0,
      clusterDistribution: semanticClusters.map(cluster => ({
        id: cluster.id,
        name: cluster.name,
        size: cluster._count.items,
        algorithm: cluster.algorithm
      }))
    },
    contentGrowth: contentGrowth.reduce((acc: Record<string, number>, growth) => {
      const day = growth.createdAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + growth._count;
      return acc;
    }, {})
  };
}

async function getAIPerformance(userId: string, startDate: Date) {
  const [
    modelUsage,
    processingMetrics,
    errorAnalysis,
    costAnalysis
  ] = await Promise.all([
    // Model-specific usage and performance
    prisma.workflowQueue.groupBy({
      by: ['type', 'status'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: true,
      _avg: {
        // This would need to be calculated from execution time
      }
    }),

    // Processing time and throughput
    prisma.workflowQueue.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'completed',
        startedAt: { not: null },
        completedAt: { not: null }
      },
      select: {
        type: true,
        startedAt: true,
        completedAt: true,
        payload: true
      }
    }),

    // Error rates and failure analysis
    prisma.workflowQueue.groupBy({
      by: ['type', 'status'],
      where: {
        createdAt: { gte: startDate },
        status: { in: ['failed'] }
      },
      _count: true
    }),

    // Cost estimates from optimizations
    prisma.modelOptimization.groupBy({
      by: ['targetModel'],
      where: {
        item: { userId },
        createdAt: { gte: startDate },
        costEstimate: { not: null }
      },
      _sum: {
        costEstimate: true
      },
      _avg: {
        costEstimate: true
      },
      _count: true
    })
  ]);

  // Calculate processing metrics
  const processingStats = processingMetrics.reduce((acc, metric) => {
    if (metric.startedAt && metric.completedAt) {
      const processingTime = metric.completedAt.getTime() - metric.startedAt.getTime();
      if (!acc[metric.type]) {
        acc[metric.type] = { totalTime: 0, count: 0, avgTime: 0 };
      }
      acc[metric.type].totalTime += processingTime;
      acc[metric.type].count++;
      acc[metric.type].avgTime = acc[metric.type].totalTime / acc[metric.type].count;
    }
    return acc;
  }, {} as Record<string, { totalTime: number; count: number; avgTime: number }>);

  return {
    modelUsage: modelUsage.reduce((acc: Record<string, any>, usage) => {
      if (!acc[usage.type]) {
        acc[usage.type] = { total: 0, completed: 0, failed: 0, pending: 0, processing: 0 };
      }
      acc[usage.type][usage.status] = usage._count;
      acc[usage.type].total += usage._count;
      return acc;
    }, {}),
    
    processingMetrics: processingStats,
    
    errorAnalysis: errorAnalysis.reduce((acc: Record<string, number>, error) => {
      acc[error.type] = error._count;
      return acc;
    }, {}),
    
    costAnalysis: costAnalysis.reduce((acc: Record<string, any>, cost) => {
      acc[cost.targetModel] = {
        totalCost: cost._sum.costEstimate || 0,
        avgCost: cost._avg.costEstimate || 0,
        requestCount: cost._count
      };
      return acc;
    }, {}),
    
    overallSuccessRate: modelUsage.length > 0 
      ? modelUsage.filter(m => m.status === 'completed').reduce((sum, m) => sum + m._count, 0) / 
        modelUsage.reduce((sum, m) => sum + m._count, 0)
      : 0
  };
}

async function getBusinessInsights(userId: string, startDate: Date) {
  const [
    userProductivity,
    timeToValue,
    featureROI,
    costSavings
  ] = await Promise.all([
    // User productivity improvements
    prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        userId,
        createdAt: { gte: startDate },
        action: { in: ['create', 'optimize', 'classify', 'search'] }
      },
      _count: true
    }),

    // Time to value metrics
    prisma.item.findMany({
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true,
        optimizations: {
          select: {
            createdAt: true,
            status: true
          },
          where: {
            status: 'approved'
          },
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      }
    }),

    // Feature utilization and ROI
    prisma.modelOptimization.aggregate({
      where: {
        item: { userId },
        createdAt: { gte: startDate },
        status: 'approved'
      },
      _sum: {
        tokenSavings: true,
        costEstimate: true
      },
      _count: true
    }),

    // Cost reduction measurements
    prisma.contentSummary.aggregate({
      where: {
        item: { userId },
        createdAt: { gte: startDate }
      },
      _avg: {
        confidence: true
      },
      _count: true
    })
  ]);

  // Calculate time to value
  const timeToValueStats = timeToValue.reduce((acc, item) => {
    if (item.optimizations.length > 0) {
      const timeToOptimization = item.optimizations[0].createdAt.getTime() - item.createdAt.getTime();
      acc.total += timeToOptimization;
      acc.count++;
    }
    return acc;
  }, { total: 0, count: 0 });

  const avgTimeToValue = timeToValueStats.count > 0 
    ? timeToValueStats.total / timeToValueStats.count 
    : 0;

  return {
    productivity: {
      itemsCreated: userProductivity.find(p => p.action === 'create')?._count || 0,
      optimizationsApplied: userProductivity.find(p => p.action === 'optimize')?._count || 0,
      classificationsRun: userProductivity.find(p => p.action === 'classify')?._count || 0,
      searchesPerformed: userProductivity.find(p => p.action === 'search')?._count || 0
    },
    
    timeToValue: {
      avgTimeToOptimization: avgTimeToValue,
      itemsOptimized: timeToValueStats.count,
      optimizationRate: timeToValue.length > 0 ? timeToValueStats.count / timeToValue.length : 0
    },
    
    roi: {
      tokenSavings: featureROI._sum.tokenSavings || 0,
      costSavings: featureROI._sum.costEstimate || 0,
      optimizationsApproved: featureROI._count,
      avgSavingsPerOptimization: featureROI._count > 0 
        ? (featureROI._sum.costEstimate || 0) / featureROI._count 
        : 0
    },
    
    qualityImprovements: {
      avgConfidence: costSavings._avg.confidence || 0,
      itemsAnalyzed: costSavings._count
    }
  };
}

async function getRealtimeMetrics(userId: string) {
  // Get real-time metrics from Redis
  const [
    activeJobs,
    recentActivity,
    systemHealth
  ] = await Promise.all([
    redis.hgetall(`user:${userId}:active_jobs`),
    redis.lrange(`user:${userId}:recent_activity`, 0, 9),
    redis.hgetall('system:health')
  ]);

  return {
    activeJobs: Object.entries(activeJobs).map(([type, count]) => ({
      type,
      count: parseInt(count)
    })),
    recentActivity: recentActivity.map(activity => JSON.parse(activity)),
    systemHealth: {
      queueSize: parseInt(systemHealth.queue_size || '0'),
      avgProcessingTime: parseFloat(systemHealth.avg_processing_time || '0'),
      errorRate: parseFloat(systemHealth.error_rate || '0')
    }
  };
}

function parseTimeRange(range: string): number {
  const unit = range.slice(-1);
  const value = parseInt(range.slice(0, -1));
  
  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000; // Approximate month
    default: return 30 * 24 * 60 * 60 * 1000; // Default to 30 days
  }
}