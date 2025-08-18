import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/analytics/export - Export analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const type = searchParams.get('type') || 'summary';
    const timeRange = searchParams.get('range') || '30d';

    const userId = session.user.id;
    const timeRangeMs = parseTimeRange(timeRange);
    const startDate = new Date(Date.now() - timeRangeMs);

    let data: any;

    switch (type) {
      case 'summary':
        data = await getAnalyticsSummary(userId, startDate);
        break;
      case 'detailed':
        data = await getDetailedAnalytics(userId, startDate);
        break;
      case 'performance':
        data = await getPerformanceAnalytics(userId, startDate);
        break;
      case 'usage':
        data = await getUsageAnalytics(userId, startDate);
        break;
      default:
        data = await getAnalyticsSummary(userId, startDate);
    }

    // Format response based on requested format
    switch (format) {
      case 'csv':
        return new NextResponse(formatAsCSV(data, type), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="contextforge-analytics-${type}-${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      
      case 'json':
        return new NextResponse(JSON.stringify(data, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="contextforge-analytics-${type}-${new Date().toISOString().split('T')[0]}.json"`
          }
        });
      
      default:
        return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
}

async function getAnalyticsSummary(userId: string, startDate: Date) {
  const [
    totalItems,
    totalOptimizations,
    totalSearches,
    avgQuality,
    costSavings
  ] = await Promise.all([
    prisma.item.count({ where: { userId, createdAt: { gte: startDate } } }),
    prisma.modelOptimization.count({
      where: { item: { userId }, createdAt: { gte: startDate } }
    }),
    prisma.semanticSearch.count({
      where: { userId, createdAt: { gte: startDate } }
    }),
    prisma.contentSummary.aggregate({
      where: { item: { userId }, createdAt: { gte: startDate } },
      _avg: { confidence: true, readabilityScore: true }
    }),
    prisma.modelOptimization.aggregate({
      where: { 
        item: { userId }, 
        createdAt: { gte: startDate },
        status: 'approved' 
      },
      _sum: { tokenSavings: true, costEstimate: true }
    })
  ]);

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      days: Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    },
    summary: {
      totalItems,
      totalOptimizations,
      totalSearches,
      avgQualityScore: avgQuality._avg.confidence || 0,
      avgReadabilityScore: avgQuality._avg.readabilityScore || 0,
      totalTokenSavings: costSavings._sum.tokenSavings || 0,
      totalCostSavings: costSavings._sum.costEstimate || 0
    }
  };
}

async function getDetailedAnalytics(userId: string, startDate: Date) {
  const [
    items,
    optimizations,
    searches,
    clusters,
    activity
  ] = await Promise.all([
    prisma.item.findMany({
      where: { userId, createdAt: { gte: startDate } },
      include: {
        summary: true,
        embedding: true,
        optimizations: true,
        auditLogs: {
          where: { action: 'view' },
          select: { createdAt: true }
        }
      }
    }),
    prisma.modelOptimization.findMany({
      where: { item: { userId }, createdAt: { gte: startDate } },
      include: { item: { select: { name: true, type: true } } }
    }),
    prisma.semanticSearch.findMany({
      where: { userId, createdAt: { gte: startDate } }
    }),
    prisma.semanticCluster.findMany({
      include: {
        items: {
          include: { item: { select: { name: true, type: true } } },
          where: { item: { userId } }
        }
      }
    }),
    prisma.auditLog.findMany({
      where: { userId, createdAt: { gte: startDate } },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return {
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      createdAt: item.createdAt,
      viewCount: item.auditLogs.length,
      hasEmbedding: !!item.embedding,
      hasSummary: !!item.summary,
      optimizationCount: item.optimizations.length,
      qualityScore: item.summary?.confidence || null,
      readabilityScore: item.summary?.readabilityScore || null
    })),
    optimizations: optimizations.map(opt => ({
      id: opt.id,
      itemName: opt.item.name,
      itemType: opt.item.type,
      targetModel: opt.targetModel,
      tokenSavings: opt.tokenSavings,
      costEstimate: opt.costEstimate,
      qualityScore: opt.qualityScore,
      status: opt.status,
      createdAt: opt.createdAt
    })),
    searches: searches.map(search => ({
      id: search.id,
      query: search.query,
      resultCount: search.resultCount,
      executionTime: search.executionTime,
      createdAt: search.createdAt
    })),
    clusters: clusters.map(cluster => ({
      id: cluster.id,
      name: cluster.name,
      algorithm: cluster.algorithm,
      itemCount: cluster.items.length,
      items: cluster.items.map(item => ({
        name: item.item.name,
        type: item.item.type,
        similarity: item.similarity
      }))
    })),
    activity: activity.map(log => ({
      action: log.action,
      entityType: log.entityType,
      createdAt: log.createdAt,
      metadata: JSON.parse(log.metadata || '{}')
    }))
  };
}

async function getPerformanceAnalytics(userId: string, startDate: Date) {
  const [
    processingTimes,
    errorRates,
    modelPerformance,
    throughputMetrics
  ] = await Promise.all([
    prisma.workflowQueue.findMany({
      where: {
        createdAt: { gte: startDate },
        startedAt: { not: null },
        completedAt: { not: null }
      },
      select: {
        type: true,
        startedAt: true,
        completedAt: true,
        status: true
      }
    }),
    prisma.workflowQueue.groupBy({
      by: ['type', 'status'],
      where: { createdAt: { gte: startDate } },
      _count: true
    }),
    prisma.modelOptimization.groupBy({
      by: ['targetModel'],
      where: {
        item: { userId },
        createdAt: { gte: startDate }
      },
      _avg: { qualityScore: true },
      _count: true
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: true
    })
  ]);

  const processingStats = processingTimes.reduce((acc: any, job) => {
    if (job.startedAt && job.completedAt) {
      const duration = job.completedAt.getTime() - job.startedAt.getTime();
      if (!acc[job.type]) {
        acc[job.type] = { times: [], count: 0 };
      }
      acc[job.type].times.push(duration);
      acc[job.type].count++;
    }
    return acc;
  }, {});

  Object.keys(processingStats).forEach(type => {
    const times = processingStats[type].times;
    processingStats[type].avgTime = times.reduce((sum: number, time: number) => sum + time, 0) / times.length;
    processingStats[type].minTime = Math.min(...times);
    processingStats[type].maxTime = Math.max(...times);
  });

  return {
    processingTimes: processingStats,
    errorRates: errorRates.reduce((acc: any, error) => {
      if (!acc[error.type]) {
        acc[error.type] = { total: 0, failed: 0 };
      }
      acc[error.type].total += error._count;
      if (error.status === 'failed') {
        acc[error.type].failed = error._count;
      }
      return acc;
    }, {}),
    modelPerformance: modelPerformance.reduce((acc: any, model) => {
      acc[model.targetModel] = {
        avgQualityScore: model._avg.qualityScore,
        optimizationCount: model._count
      };
      return acc;
    }, {}),
    throughput: throughputMetrics.reduce((acc: any, metric) => {
      acc[metric.action] = metric._count;
      return acc;
    }, {})
  };
}

async function getUsageAnalytics(userId: string, startDate: Date) {
  const [
    dailyUsage,
    featureUsage,
    contentTypes,
    userFlow
  ] = await Promise.all([
    prisma.auditLog.groupBy({
      by: ['createdAt'],
      where: { userId, createdAt: { gte: startDate } },
      _count: true
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where: { userId, createdAt: { gte: startDate } },
      _count: true
    }),
    prisma.item.groupBy({
      by: ['type'],
      where: { userId, createdAt: { gte: startDate } },
      _count: true
    }),
    prisma.auditLog.findMany({
      where: { userId, createdAt: { gte: startDate } },
      select: { action: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    })
  ]);

  const dailyStats = dailyUsage.reduce((acc: any, usage) => {
    const day = usage.createdAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + usage._count;
    return acc;
  }, {});

  return {
    dailyUsage: dailyStats,
    featureUsage: featureUsage.reduce((acc: any, feature) => {
      acc[feature.action] = feature._count;
      return acc;
    }, {}),
    contentTypes: contentTypes.reduce((acc: any, type) => {
      acc[type.type] = type._count;
      return acc;
    }, {}),
    userFlow: userFlow.map(flow => ({
      action: flow.action,
      timestamp: flow.createdAt
    }))
  };
}

function formatAsCSV(data: any, type: string): string {
  switch (type) {
    case 'summary':
      return [
        'Metric,Value',
        `Total Items,${data.summary.totalItems}`,
        `Total Optimizations,${data.summary.totalOptimizations}`,
        `Total Searches,${data.summary.totalSearches}`,
        `Average Quality Score,${data.summary.avgQualityScore}`,
        `Average Readability Score,${data.summary.avgReadabilityScore}`,
        `Total Token Savings,${data.summary.totalTokenSavings}`,
        `Total Cost Savings,${data.summary.totalCostSavings}`
      ].join('\n');

    case 'detailed':
      const itemsCSV = [
        'ID,Name,Type,Created,View Count,Has Embedding,Has Summary,Optimization Count,Quality Score,Readability Score',
        ...data.items.map((item: any) => 
          `${item.id},${item.name},${item.type},${item.createdAt},${item.viewCount},${item.hasEmbedding},${item.hasSummary},${item.optimizationCount},${item.qualityScore || ''},${item.readabilityScore || ''}`
        )
      ].join('\n');
      return itemsCSV;

    case 'performance':
      const perfLines = ['Metric,Value'];
      Object.entries(data.processingTimes).forEach(([type, stats]: [string, any]) => {
        perfLines.push(`${type} Avg Time,${stats.avgTime}`);
        perfLines.push(`${type} Min Time,${stats.minTime}`);
        perfLines.push(`${type} Max Time,${stats.maxTime}`);
      });
      return perfLines.join('\n');

    case 'usage':
      const usageLines = ['Date,Usage Count'];
      Object.entries(data.dailyUsage).forEach(([date, count]) => {
        usageLines.push(`${date},${count}`);
      });
      return usageLines.join('\n');

    default:
      return JSON.stringify(data, null, 2);
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