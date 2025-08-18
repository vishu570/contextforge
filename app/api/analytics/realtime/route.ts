import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { WebSocketManager } from '@/lib/websocket/manager';

// GET /api/analytics/realtime - Get real-time analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const wsManager = WebSocketManager.getInstance();

    // Get real-time metrics from Redis
    const [
      activeJobs,
      recentActivity,
      systemMetrics,
      userMetrics,
      alertsData
    ] = await Promise.all([
      getActiveJobs(userId),
      getRecentActivity(userId),
      getSystemMetrics(),
      getUserMetrics(userId),
      getActiveAlerts(userId)
    ]);

    // Get WebSocket connection info
    const connectionInfo = {
      activeConnections: wsManager.getConnectionCount(),
      connectedUsers: wsManager.getConnectedUsers().length,
      userConnected: wsManager.isUserConnected(userId)
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      userId,
      connection: connectionInfo,
      activeJobs,
      recentActivity,
      systemMetrics,
      userMetrics,
      alerts: alertsData
    });
  } catch (error) {
    console.error('Real-time analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real-time analytics' },
      { status: 500 }
    );
  }
}

// POST /api/analytics/realtime - Update real-time metrics
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { type, data, timestamp } = body;

    // Store activity in Redis
    await recordActivity(userId, type, data, timestamp);

    // Broadcast to connected clients
    const wsManager = WebSocketManager.getInstance();
    wsManager.broadcastToUser(userId, {
      type: 'analytics_update',
      data: {
        type,
        data,
        timestamp: timestamp || new Date().toISOString()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Real-time analytics update error:', error);
    return NextResponse.json(
      { error: 'Failed to update real-time analytics' },
      { status: 500 }
    );
  }
}

async function getActiveJobs(userId: string) {
  try {
    const jobData = await redis.hgetall(`user:${userId}:active_jobs`);
    
    return Object.entries(jobData).map(([type, data]) => {
      try {
        const parsed = JSON.parse(data);
        return {
          type,
          count: parsed.count || 0,
          status: parsed.status || 'unknown',
          startedAt: parsed.startedAt,
          estimatedCompletion: parsed.estimatedCompletion
        };
      } catch {
        return { type, count: parseInt(data) || 0, status: 'unknown' };
      }
    });
  } catch (error) {
    console.error('Error getting active jobs:', error);
    return [];
  }
}

async function getRecentActivity(userId: string) {
  try {
    const activities = await redis.lrange(`user:${userId}:recent_activity`, 0, 19);
    
    return activities.map(activity => {
      try {
        return JSON.parse(activity);
      } catch {
        return { type: 'unknown', timestamp: new Date().toISOString() };
      }
    });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

async function getSystemMetrics() {
  try {
    const metrics = await redis.hgetall('system:realtime_metrics');
    
    return {
      queueSize: parseInt(metrics.queue_size || '0'),
      avgProcessingTime: parseFloat(metrics.avg_processing_time || '0'),
      errorRate: parseFloat(metrics.error_rate || '0'),
      throughput: parseFloat(metrics.throughput || '0'),
      cpuUsage: parseFloat(metrics.cpu_usage || '0'),
      memoryUsage: parseFloat(metrics.memory_usage || '0'),
      activeWorkers: parseInt(metrics.active_workers || '0'),
      lastUpdated: metrics.last_updated || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting system metrics:', error);
    return {
      queueSize: 0,
      avgProcessingTime: 0,
      errorRate: 0,
      throughput: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      activeWorkers: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

async function getUserMetrics(userId: string) {
  try {
    const metrics = await redis.hgetall(`user:${userId}:realtime_metrics`);
    
    return {
      activeRequests: parseInt(metrics.active_requests || '0'),
      requestsPerMinute: parseFloat(metrics.requests_per_minute || '0'),
      avgResponseTime: parseFloat(metrics.avg_response_time || '0'),
      errorCount: parseInt(metrics.error_count || '0'),
      lastActivity: metrics.last_activity || null,
      sessionDuration: parseInt(metrics.session_duration || '0'),
      itemsProcessed: parseInt(metrics.items_processed || '0'),
      optimizationsToday: parseInt(metrics.optimizations_today || '0'),
      searchesToday: parseInt(metrics.searches_today || '0')
    };
  } catch (error) {
    console.error('Error getting user metrics:', error);
    return {
      activeRequests: 0,
      requestsPerMinute: 0,
      avgResponseTime: 0,
      errorCount: 0,
      lastActivity: null,
      sessionDuration: 0,
      itemsProcessed: 0,
      optimizationsToday: 0,
      searchesToday: 0
    };
  }
}

async function getActiveAlerts(userId: string) {
  try {
    const alerts = await redis.lrange(`user:${userId}:alerts`, 0, 9);
    
    return alerts.map(alert => {
      try {
        return JSON.parse(alert);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error('Error getting active alerts:', error);
    return [];
  }
}

async function recordActivity(userId: string, type: string, data: any, timestamp?: string) {
  const activity = {
    type,
    data,
    timestamp: timestamp || new Date().toISOString()
  };

  // Store in recent activity list (keep last 20)
  await redis.lpush(
    `user:${userId}:recent_activity`,
    JSON.stringify(activity)
  );
  await redis.ltrim(`user:${userId}:recent_activity`, 0, 19);

  // Update user metrics based on activity type
  await updateUserMetrics(userId, type, data);

  // Set activity expiration (24 hours)
  await redis.expire(`user:${userId}:recent_activity`, 86400);
}

async function updateUserMetrics(userId: string, type: string, data: any) {
  const metricsKey = `user:${userId}:realtime_metrics`;
  
  try {
    // Update last activity
    await redis.hset(metricsKey, 'last_activity', new Date().toISOString());
    
    // Update counters based on activity type
    switch (type) {
      case 'item_created':
        await redis.hincrby(metricsKey, 'items_processed', 1);
        break;
      case 'optimization_applied':
        await redis.hincrby(metricsKey, 'optimizations_today', 1);
        break;
      case 'search_performed':
        await redis.hincrby(metricsKey, 'searches_today', 1);
        break;
      case 'request_started':
        await redis.hincrby(metricsKey, 'active_requests', 1);
        break;
      case 'request_completed':
        await redis.hincrby(metricsKey, 'active_requests', -1);
        if (data.responseTime) {
          // Update rolling average response time
          const currentAvg = parseFloat(await redis.hget(metricsKey, 'avg_response_time') || '0');
          const newAvg = (currentAvg * 0.9) + (data.responseTime * 0.1); // Exponential moving average
          await redis.hset(metricsKey, 'avg_response_time', newAvg.toString());
        }
        break;
      case 'error_occurred':
        await redis.hincrby(metricsKey, 'error_count', 1);
        break;
    }

    // Update requests per minute (using sliding window)
    const now = Date.now();
    const windowKey = `user:${userId}:requests_window`;
    await redis.zadd(windowKey, now, now);
    await redis.zremrangebyscore(windowKey, 0, now - 60000); // Remove entries older than 1 minute
    const requestCount = await redis.zcard(windowKey);
    await redis.hset(metricsKey, 'requests_per_minute', requestCount.toString());
    await redis.expire(windowKey, 300); // Window expires in 5 minutes

    // Set metrics expiration (reset daily)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const secondsUntilMidnight = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
    await redis.expire(metricsKey, secondsUntilMidnight);
    
  } catch (error) {
    console.error('Error updating user metrics:', error);
  }
}