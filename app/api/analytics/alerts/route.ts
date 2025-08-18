import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { WebSocketManager } from '@/lib/websocket/manager';

// GET /api/analytics/alerts - Get user alerts and monitoring status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const includeResolved = searchParams.get('resolved') === 'true';

    const [
      activeAlerts,
      alertSettings,
      systemHealth,
      performanceAlerts
    ] = await Promise.all([
      getActiveAlerts(userId, includeResolved),
      getAlertSettings(userId),
      getSystemHealthAlerts(),
      getPerformanceAlerts(userId)
    ]);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      alerts: {
        active: activeAlerts,
        performance: performanceAlerts,
        system: systemHealth
      },
      settings: alertSettings,
      summary: {
        totalActive: activeAlerts.length,
        highPriority: activeAlerts.filter(a => a.severity === 'high').length,
        mediumPriority: activeAlerts.filter(a => a.severity === 'medium').length,
        lowPriority: activeAlerts.filter(a => a.severity === 'low').length
      }
    });
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST /api/analytics/alerts - Create or update alert
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { type, title, message, severity, threshold, metadata, autoResolve } = body;

    const alert = await createAlert({
      userId,
      type,
      title,
      message,
      severity: severity || 'medium',
      threshold,
      metadata: metadata || {},
      autoResolve: autoResolve || false
    });

    // Broadcast alert to user
    const wsManager = WebSocketManager.getInstance();
    wsManager.broadcastToUser(userId, {
      type: 'new_alert',
      data: alert
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Create alert error:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

// PUT /api/analytics/alerts - Update alert settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { settings } = body;

    await updateAlertSettings(userId, settings);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update alert settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update alert settings' },
      { status: 500 }
    );
  }
}

// DELETE /api/analytics/alerts - Resolve or dismiss alert
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    const action = searchParams.get('action') || 'resolve';

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
    }

    await resolveAlert(userId, alertId, action);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resolve alert error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}

async function getActiveAlerts(userId: string, includeResolved: boolean = false) {
  try {
    const alertsKey = `user:${userId}:alerts`;
    const alerts = await redis.lrange(alertsKey, 0, -1);
    
    return alerts
      .map(alert => {
        try {
          return JSON.parse(alert);
        } catch {
          return null;
        }
      })
      .filter(alert => alert && (includeResolved || alert.status !== 'resolved'))
      .sort((a, b) => {
        // Sort by severity (high > medium > low) then by timestamp
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  } catch (error) {
    console.error('Error getting active alerts:', error);
    return [];
  }
}

async function getAlertSettings(userId: string) {
  try {
    const settingsData = await redis.hgetall(`user:${userId}:alert_settings`);
    
    const defaultSettings = {
      emailNotifications: true,
      pushNotifications: true,
      alertTypes: {
        performance: true,
        errors: true,
        optimization: true,
        usage: false,
        system: true
      },
      thresholds: {
        errorRate: 0.05, // 5%
        responseTime: 5000, // 5 seconds
        queueSize: 100,
        costIncrease: 0.2, // 20%
        qualityDecrease: 0.1 // 10%
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC'
      }
    };

    if (Object.keys(settingsData).length === 0) {
      return defaultSettings;
    }

    return {
      emailNotifications: settingsData.emailNotifications === 'true',
      pushNotifications: settingsData.pushNotifications === 'true',
      alertTypes: settingsData.alertTypes ? JSON.parse(settingsData.alertTypes) : defaultSettings.alertTypes,
      thresholds: settingsData.thresholds ? JSON.parse(settingsData.thresholds) : defaultSettings.thresholds,
      quietHours: settingsData.quietHours ? JSON.parse(settingsData.quietHours) : defaultSettings.quietHours
    };
  } catch (error) {
    console.error('Error getting alert settings:', error);
    return {};
  }
}

async function getSystemHealthAlerts() {
  try {
    const systemAlerts = await redis.lrange('system:alerts', 0, 9);
    
    return systemAlerts.map(alert => {
      try {
        return JSON.parse(alert);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error('Error getting system health alerts:', error);
    return [];
  }
}

async function getPerformanceAlerts(userId: string) {
  try {
    // Check recent performance metrics for anomalies
    const recentMetrics = await redis.hgetall(`user:${userId}:realtime_metrics`);
    const alerts = [];

    // Check response time
    const avgResponseTime = parseFloat(recentMetrics.avg_response_time || '0');
    if (avgResponseTime > 5000) { // 5 seconds
      alerts.push({
        id: `perf_response_time_${Date.now()}`,
        type: 'performance',
        title: 'High Response Time',
        message: `Average response time is ${avgResponseTime.toFixed(0)}ms`,
        severity: avgResponseTime > 10000 ? 'high' : 'medium',
        createdAt: new Date().toISOString(),
        status: 'active',
        metric: 'response_time',
        value: avgResponseTime,
        threshold: 5000
      });
    }

    // Check error rate
    const errorCount = parseInt(recentMetrics.error_count || '0');
    const totalRequests = parseInt(recentMetrics.requests_per_minute || '0') * 60; // Approximate
    if (totalRequests > 0) {
      const errorRate = errorCount / totalRequests;
      if (errorRate > 0.05) { // 5%
        alerts.push({
          id: `perf_error_rate_${Date.now()}`,
          type: 'performance',
          title: 'High Error Rate',
          message: `Error rate is ${(errorRate * 100).toFixed(1)}%`,
          severity: errorRate > 0.1 ? 'high' : 'medium',
          createdAt: new Date().toISOString(),
          status: 'active',
          metric: 'error_rate',
          value: errorRate,
          threshold: 0.05
        });
      }
    }

    // Check active requests backlog
    const activeRequests = parseInt(recentMetrics.active_requests || '0');
    if (activeRequests > 10) {
      alerts.push({
        id: `perf_backlog_${Date.now()}`,
        type: 'performance',
        title: 'Request Backlog',
        message: `${activeRequests} requests are currently processing`,
        severity: activeRequests > 20 ? 'high' : 'medium',
        createdAt: new Date().toISOString(),
        status: 'active',
        metric: 'active_requests',
        value: activeRequests,
        threshold: 10
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error getting performance alerts:', error);
    return [];
  }
}

async function createAlert(alertData: any) {
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...alertData,
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  // Store alert
  const alertsKey = `user:${alertData.userId}:alerts`;
  await redis.lpush(alertsKey, JSON.stringify(alert));
  await redis.ltrim(alertsKey, 0, 99); // Keep last 100 alerts
  await redis.expire(alertsKey, 86400 * 7); // Expire after 7 days

  // Store in audit log
  await prisma.auditLog.create({
    data: {
      userId: alertData.userId,
      action: 'alert_created',
      entityType: 'alert',
      entityId: alert.id,
      metadata: JSON.stringify({
        type: alert.type,
        severity: alert.severity,
        title: alert.title
      })
    }
  });

  return alert;
}

async function updateAlertSettings(userId: string, settings: any) {
  const settingsKey = `user:${userId}:alert_settings`;
  
  await redis.hset(settingsKey, {
    emailNotifications: settings.emailNotifications ? 'true' : 'false',
    pushNotifications: settings.pushNotifications ? 'true' : 'false',
    alertTypes: JSON.stringify(settings.alertTypes || {}),
    thresholds: JSON.stringify(settings.thresholds || {}),
    quietHours: JSON.stringify(settings.quietHours || {})
  });

  await redis.expire(settingsKey, 86400 * 365); // Expire after 1 year
}

async function resolveAlert(userId: string, alertId: string, action: string) {
  const alertsKey = `user:${userId}:alerts`;
  const alerts = await redis.lrange(alertsKey, 0, -1);
  
  const updatedAlerts = alerts
    .map(alertStr => {
      try {
        const alert = JSON.parse(alertStr);
        if (alert.id === alertId) {
          alert.status = action === 'dismiss' ? 'dismissed' : 'resolved';
          alert.resolvedAt = new Date().toISOString();
        }
        return JSON.stringify(alert);
      } catch {
        return alertStr;
      }
    });

  // Replace the alerts list
  await redis.del(alertsKey);
  if (updatedAlerts.length > 0) {
    await redis.rpush(alertsKey, ...updatedAlerts);
    await redis.expire(alertsKey, 86400 * 7);
  }

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId,
      action: `alert_${action}`,
      entityType: 'alert',
      entityId: alertId,
      metadata: JSON.stringify({ action })
    }
  });
}