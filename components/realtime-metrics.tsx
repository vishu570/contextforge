'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Gauge,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Users,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface RealtimeMetricsProps {
  userId: string;
  autoUpdate?: boolean;
  updateInterval?: number; // seconds
  className?: string;
}

interface MetricsData {
  timestamp: string;
  connection: {
    activeConnections: number;
    connectedUsers: number;
    userConnected: boolean;
  };
  activeJobs: Array<{
    type: string;
    count: number;
    status: string;
    startedAt?: string;
    estimatedCompletion?: string;
  }>;
  recentActivity: Array<{
    type: string;
    timestamp: string;
    data?: any;
  }>;
  systemMetrics: {
    queueSize: number;
    avgProcessingTime: number;
    errorRate: number;
    throughput: number;
    cpuUsage: number;
    memoryUsage: number;
    activeWorkers: number;
    lastUpdated: string;
  };
  userMetrics: {
    activeRequests: number;
    requestsPerMinute: number;
    avgResponseTime: number;
    errorCount: number;
    lastActivity: string | null;
    sessionDuration: number;
    itemsProcessed: number;
    optimizationsToday: number;
    searchesToday: number;
  };
  alerts: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    createdAt: string;
  }>;
}

const ACTIVITY_ICONS = {
  item_created: CheckCircle,
  optimization_applied: Zap,
  search_performed: Activity,
  request_started: Play,
  request_completed: CheckCircle,
  error_occurred: AlertTriangle,
  user_login: Users,
  user_logout: Users
};

const ACTIVITY_COLORS = {
  item_created: 'text-green-500',
  optimization_applied: 'text-blue-500',
  search_performed: 'text-purple-500',
  request_started: 'text-orange-500',
  request_completed: 'text-green-500',
  error_occurred: 'text-red-500',
  user_login: 'text-blue-500',
  user_logout: 'text-gray-500'
};

export function RealtimeMetrics({
  userId,
  autoUpdate = true,
  updateInterval = 5,
  className
}: RealtimeMetricsProps) {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/analytics/realtime');
      
      if (!response.ok) {
        throw new Error('Failed to fetch real-time metrics');
      }

      const metricsData = await response.json();
      setData(metricsData);
      setIsConnected(true);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
      setLoading(false);
    }
  }, []);

  // Auto-update effect
  useEffect(() => {
    if (!autoUpdate || isPaused) return;

    fetchMetrics(); // Initial fetch
    const interval = setInterval(fetchMetrics, updateInterval * 1000);
    
    return () => clearInterval(interval);
  }, [autoUpdate, isPaused, updateInterval, fetchMetrics]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/websocket`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        // Subscribe to analytics updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'analytics',
          userId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'analytics_update') {
            // Update specific metric without full refresh
            setData(prevData => {
              if (!prevData) return prevData;
              return {
                ...prevData,
                recentActivity: [message.data, ...prevData.recentActivity.slice(0, 9)]
              };
            });
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      return () => {
        ws.close();
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setIsConnected(false);
    }
  }, [userId]);

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return `${Math.floor(diff / 86400000)}d ago`;
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading real-time metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-6", className)}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchMetrics}
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn("p-6", className)}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No real-time data available
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold">Real-time Metrics</h3>
          <div className="flex items-center space-x-1">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePause}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <div className="text-sm text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {/* Active Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.slice(0, 3).map((alert) => (
            <Alert key={alert.id} variant={alert.severity === 'high' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>{alert.title}: {alert.message}</span>
                  <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.systemMetrics.queueSize}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              {data.systemMetrics.throughput.toFixed(1)} jobs/min
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.systemMetrics.avgProcessingTime.toFixed(1)}s
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Activity className="h-3 w-3 mr-1" />
              {data.systemMetrics.activeWorkers} workers
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.systemMetrics.errorRate * 100).toFixed(1)}%
            </div>
            <Progress 
              value={data.systemMetrics.errorRate * 100} 
              className={`mt-2 ${data.systemMetrics.errorRate > 0.05 ? 'bg-red-100' : ''}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.connection.connectedUsers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Wifi className="h-3 w-3 mr-1" />
              {data.connection.activeConnections} connections
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Resources */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Cpu className="h-4 w-4 mr-2" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage</span>
                <span>{data.systemMetrics.cpuUsage.toFixed(1)}%</span>
              </div>
              <Progress value={data.systemMetrics.cpuUsage} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <MemoryStick className="h-4 w-4 mr-2" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage</span>
                <span>{data.systemMetrics.memoryUsage.toFixed(1)}%</span>
              </div>
              <Progress value={data.systemMetrics.memoryUsage} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Server className="h-4 w-4 mr-2" />
              Server Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Status</span>
                <Badge variant={data.systemMetrics.errorRate < 0.05 ? "default" : "destructive"}>
                  {data.systemMetrics.errorRate < 0.05 ? 'Healthy' : 'Issues'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Last updated: {formatTimeAgo(data.systemMetrics.lastUpdated)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Activity & Jobs */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Active Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gauge className="h-5 w-5 mr-2" />
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.activeJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active jobs</p>
              ) : (
                data.activeJobs.map((job, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium capitalize">
                        {job.type.replace(/_/g, ' ')}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        Status: {job.status}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {job.count} {job.count === 1 ? 'job' : 'jobs'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                data.recentActivity.slice(0, 5).map((activity, index) => {
                  const IconComponent = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || Activity;
                  const iconColor = ACTIVITY_COLORS[activity.type as keyof typeof ACTIVITY_COLORS] || 'text-gray-500';
                  
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <IconComponent className={cn("h-4 w-4", iconColor)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">
                          {activity.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Your Activity Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{data.userMetrics.itemsProcessed}</div>
              <p className="text-sm text-muted-foreground">Items Processed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data.userMetrics.optimizationsToday}</div>
              <p className="text-sm text-muted-foreground">Optimizations</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data.userMetrics.searchesToday}</div>
              <p className="text-sm text-muted-foreground">Searches</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data.userMetrics.requestsPerMinute.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground">Requests/min</p>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Average Response Time</span>
              <span>{data.userMetrics.avgResponseTime.toFixed(0)}ms</span>
            </div>
            <Progress 
              value={Math.min(data.userMetrics.avgResponseTime / 50, 100)} // Scale to 0-5000ms
              className="h-2"
            />
            
            {data.userMetrics.sessionDuration > 0 && (
              <div className="flex justify-between text-sm">
                <span>Session Duration</span>
                <span>{formatDuration(data.userMetrics.sessionDuration)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}