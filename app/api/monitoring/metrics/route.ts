import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/db';
import { getWorkerStats } from '@/lib/queue/workers';
import { jobQueue } from '@/lib/queue';
import { WebSocketManager } from '@/lib/websocket/manager';

// GET /api/monitoring/metrics - Get system metrics
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value; if (!token) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); } const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '1h';
    const includeSystem = searchParams.get('system') === 'true';

    const metrics = {
      timestamp: new Date().toISOString(),
      timeRange,
    } as any;

    // User-specific metrics
    const userMetrics = await getUserMetrics(user.id, timeRange);
    metrics.user = userMetrics;

    // System metrics (if requested and user has permission)
    if (includeSystem) {
      const systemMetrics = await getSystemMetrics();
      metrics.system = systemMetrics;
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getUserMetrics(userId: string, timeRange: string) {
  const timeRangeMs = parseTimeRange(timeRange);
  const startTime = new Date(Date.now() - timeRangeMs);

  // Job metrics
  const userJobs = await jobQueue.getUserJobs(userId, 1000);
  const recentJobs = userJobs.filter(job => job.createdAt >= startTime);

  const jobMetrics = {
    total: recentJobs.length,
    completed: recentJobs.filter(job => job.status === 'completed').length,
    failed: recentJobs.filter(job => job.status === 'failed').length,
    processing: recentJobs.filter(job => job.status === 'processing').length,
    pending: recentJobs.filter(job => job.status === 'pending').length,
    byType: recentJobs.reduce((acc, job) => {
      acc[job.type] = (acc[job.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  // Item metrics
  const itemMetrics = await prisma.item.groupBy({
    by: ['type'],
    where: {
      userId,
      createdAt: { gte: startTime },
    },
    _count: true,
  });

  // Activity metrics
  const activityMetrics = await prisma.auditLog.groupBy({
    by: ['action'],
    where: {
      userId,
      createdAt: { gte: startTime },
    },
    _count: true,
  });

  return {
    jobs: jobMetrics,
    items: itemMetrics.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as Record<string, number>),
    activity: activityMetrics.reduce((acc, activity) => {
      acc[activity.action] = activity._count;
      return acc;
    }, {} as Record<string, number>),
  };
}

async function getSystemMetrics() {
  const wsManager = WebSocketManager.getInstance();
  
  // Worker metrics
  const workerStats = await getWorkerStats();
  
  // Queue metrics
  const queueStats = await jobQueue.getQueueStats();
  
  // WebSocket metrics
  const wsMetricsData = await redis.get('websocket_metrics');
  const wsMetrics = wsMetricsData ? JSON.parse(wsMetricsData) : null;
  
  // Memory metrics
  const memoryUsage = process.memoryUsage();
  
  // Database metrics
  const dbMetrics = await getDatabaseMetrics();
  
  return {
    workers: workerStats,
    queues: queueStats,
    websocket: {
      activeConnections: wsManager.getConnectionCount(),
      connectedUsers: wsManager.getConnectedUsers().length,
      ...wsMetrics,
    },
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    },
    process: {
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version,
      platform: process.platform,
    },
    database: dbMetrics,
  };
}

async function getDatabaseMetrics() {
  try {
    // Get table counts
    const [users, items, jobs, auditLogs] = await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.workflowQueue.count(),
      prisma.auditLog.count(),
    ]);

    // Get recent activity
    const recentActivity = await prisma.auditLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    return {
      tables: {
        users,
        items,
        jobs,
        auditLogs,
      },
      recentActivity,
    };
  } catch (error) {
    console.error('Error getting database metrics:', error);
    return {
      error: 'Failed to fetch database metrics',
    };
  }
}

function parseTimeRange(range: string): number {
  const unit = range.slice(-1);
  const value = parseInt(range.slice(0, -1));
  
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000; // Default to 1 hour
  }
}