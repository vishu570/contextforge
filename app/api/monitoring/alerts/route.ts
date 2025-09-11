import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { z } from 'zod';
import { redis } from '@/lib/redis';
import { WebSocketManager } from '@/lib/websocket/manager';

const AlertConfigSchema = z.object({
  name: z.string(),
  type: z.enum(['threshold', 'anomaly', 'error_rate']),
  metric: z.string(),
  threshold: z.number().optional(),
  enabled: z.boolean().default(true),
  notifications: z.object({
    email: z.boolean().default(false),
    webhook: z.string().url().optional(),
    websocket: z.boolean().default(true),
  }).optional(),
});

// GET /api/monitoring/alerts - Get alert configurations
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

    const alertsData = await redis.get(`alerts:${user.id}`);
    const alerts = alertsData ? JSON.parse(alertsData) : [];

    // Get recent alert history
    const historyData = await redis.get(`alert_history:${user.id}`);
    const history = historyData ? JSON.parse(historyData) : [];

    return NextResponse.json({
      alerts,
      history: history.slice(0, 50), // Last 50 alerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/monitoring/alerts - Create or update alert configuration
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = AlertConfigSchema.parse(body);

    // Get existing alerts
    const alertsData = await redis.get(`alerts:${user.id}`);
    const alerts = alertsData ? JSON.parse(alertsData) : [];

    // Add or update alert
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAlert = {
      id: alertId,
      ...validatedData,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };

    const existingIndex = alerts.findIndex((alert: any) => alert.name === validatedData.name);
    if (existingIndex >= 0) {
      alerts[existingIndex] = { ...alerts[existingIndex], ...newAlert };
    } else {
      alerts.push(newAlert);
    }

    // Save updated alerts
    await redis.setex(`alerts:${user.id}`, 86400 * 7, JSON.stringify(alerts)); // 7 days

    return NextResponse.json({
      success: true,
      alert: newAlert,
      message: existingIndex >= 0 ? 'Alert updated' : 'Alert created',
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/monitoring/alerts - Delete alert configuration
export async function DELETE(request: NextRequest) {
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
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID required' },
        { status: 400 }
      );
    }

    // Get existing alerts
    const alertsData = await redis.get(`alerts:${user.id}`);
    const alerts = alertsData ? JSON.parse(alertsData) : [];

    // Remove alert
    const filteredAlerts = alerts.filter((alert: any) => alert.id !== alertId);

    if (filteredAlerts.length === alerts.length) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Save updated alerts
    await redis.setex(`alerts:${user.id}`, 86400 * 7, JSON.stringify(filteredAlerts));

    return NextResponse.json({
      success: true,
      message: 'Alert deleted',
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Alert evaluation function (would be called by monitoring system)
async function evaluateAlerts(userId: string, metrics: any) {
  try {
    const alertsData = await redis.get(`alerts:${userId}`);
    if (!alertsData) return;

    const alerts = JSON.parse(alertsData);
    const triggeredAlerts = [];

    for (const alert of alerts) {
      if (!alert.enabled) continue;

      const isTriggered = await evaluateAlert(alert, metrics);
      if (isTriggered) {
        triggeredAlerts.push(alert);
        await recordAlert(userId, alert, metrics);
        await sendAlertNotification(alert, metrics);
      }
    }

    return triggeredAlerts;
  } catch (error) {
    console.error('Error evaluating alerts:', error);
  }
}

async function evaluateAlert(alert: any, metrics: any): Promise<boolean> {
  const metricValue = getMetricValue(metrics, alert.metric);
  
  switch (alert.type) {
    case 'threshold':
      return metricValue > alert.threshold;
    
    case 'error_rate':
      // Calculate error rate from metrics
      const errorRate = calculateErrorRate(metrics);
      return errorRate > alert.threshold;
    
    case 'anomaly':
      // Simple anomaly detection (would be more sophisticated in production)
      const historical = await getHistoricalMetrics(alert.metric);
      return isAnomaly(metricValue, historical);
    
    default:
      return false;
  }
}

function getMetricValue(metrics: any, metricPath: string): number {
  const parts = metricPath.split('.');
  let value = metrics;
  
  for (const part of parts) {
    value = value?.[part];
  }
  
  return typeof value === 'number' ? value : 0;
}

function calculateErrorRate(metrics: any): number {
  const total = metrics.jobs?.total || 0;
  const failed = metrics.jobs?.failed || 0;
  
  return total > 0 ? (failed / total) * 100 : 0;
}

async function getHistoricalMetrics(metric: string): Promise<number[]> {
  // In a production system, you'd fetch historical data from a time-series database
  // For now, return empty array
  return [];
}

function isAnomaly(value: number, historical: number[]): boolean {
  if (historical.length < 10) return false;
  
  const mean = historical.reduce((sum, val) => sum + val, 0) / historical.length;
  const stdDev = Math.sqrt(
    historical.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historical.length
  );
  
  // Consider value anomalous if it's more than 2 standard deviations from mean
  return Math.abs(value - mean) > 2 * stdDev;
}

async function recordAlert(userId: string, alert: any, metrics: any) {
  const historyData = await redis.get(`alert_history:${userId}`);
  const history = historyData ? JSON.parse(historyData) : [];
  
  const alertRecord = {
    id: `alert_record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    alertId: alert.id,
    alertName: alert.name,
    triggeredAt: new Date().toISOString(),
    metricValue: getMetricValue(metrics, alert.metric),
    threshold: alert.threshold,
    severity: determineSeverity(alert, metrics),
  };
  
  history.unshift(alertRecord);
  
  // Keep only last 100 alerts
  const trimmedHistory = history.slice(0, 100);
  
  await redis.setex(`alert_history:${userId}`, 86400 * 30, JSON.stringify(trimmedHistory)); // 30 days
}

function determineSeverity(alert: any, metrics: any): 'low' | 'medium' | 'high' | 'critical' {
  const metricValue = getMetricValue(metrics, alert.metric);
  const threshold = alert.threshold;
  
  if (metricValue > threshold * 2) return 'critical';
  if (metricValue > threshold * 1.5) return 'high';
  if (metricValue > threshold * 1.2) return 'medium';
  return 'low';
}

async function sendAlertNotification(alert: any, metrics: any) {
  const wsManager = WebSocketManager.getInstance();
  
  if (alert.notifications?.websocket) {
    wsManager.sendNotification(alert.userId, {
      title: `Alert: ${alert.name}`,
      message: `Metric ${alert.metric} exceeded threshold`,
      type: 'warning',
      userId: alert.userId,
      read: false,
    });
  }
  
  // Additional notification methods (email, webhook) would be implemented here
}