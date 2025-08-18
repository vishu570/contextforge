'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  Activity,
  BarChart3,
  Brain,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Eye,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  Settings,
  Bell,
  Maximize2,
  Minimize2,
  Info,
  Star,
  Gauge,
  Layers,
  FileText,
  Globe,
  Database
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface AnalyticsDashboardProps {
  userId: string;
  initialData?: any;
  realtime?: boolean;
  className?: string;
}

interface DashboardData {
  userEngagement: {
    totalSessions: number;
    avgSessionsPerDay: number;
    dailyActivity: Record<string, number>;
    activityBreakdown: Record<string, number>;
    featureAdoption: Record<string, number>;
    mostAccessedContent: Array<{ itemId: string; viewCount: number }>;
    productivity: {
      itemsCreated: number;
      byType: Record<string, number>;
    };
  };
  contentMetrics: {
    qualityTrends: {
      avgReadability: number;
      avgSentiment: number;
      avgConfidence: number;
      totalAnalyzed: number;
    };
    optimizationImpact: {
      totalTokenSavings: number;
      totalCostSavings: number;
      optimizationCount: number;
      avgQualityScore: number;
      byModel: Record<string, number>;
      byStatus: Record<string, number>;
    };
    duplicateDetection: {
      totalItems: number;
      duplicatesFound: number;
      duplicateRate: number;
    };
    semanticClustering: {
      totalClusters: number;
      avgClusterSize: number;
      clusterDistribution: Array<{
        id: string;
        name: string;
        size: number;
        algorithm: string;
      }>;
    };
    contentGrowth: Record<string, number>;
  };
  aiPerformance: {
    modelUsage: Record<string, any>;
    processingMetrics: Record<string, any>;
    errorAnalysis: Record<string, number>;
    costAnalysis: Record<string, any>;
    overallSuccessRate: number;
  };
  businessInsights: {
    productivity: Record<string, number>;
    timeToValue: {
      avgTimeToOptimization: number;
      itemsOptimized: number;
      optimizationRate: number;
    };
    roi: {
      tokenSavings: number;
      costSavings: number;
      optimizationsApproved: number;
      avgSavingsPerOptimization: number;
    };
    qualityImprovements: {
      avgConfidence: number;
      itemsAnalyzed: number;
    };
  };
  realtime?: {
    activeJobs: Array<{ type: string; count: number; status: string }>;
    recentActivity: Array<{ type: string; timestamp: string; data?: any }>;
    systemHealth: {
      queueSize: number;
      avgProcessingTime: number;
      errorRate: number;
    };
  };
}

const TIME_RANGES = [
  { value: '1h', label: '1 Hour' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' }
];

const COLORS = {
  primary: '#3b82f6',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316'
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.purple,
  COLORS.pink,
  COLORS.orange,
  COLORS.info,
  COLORS.error
];

export function AnalyticsDashboard({
  userId,
  initialData,
  realtime = false,
  className
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [autoRefresh, setAutoRefresh] = useState(realtime);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch dashboard data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        range: timeRange,
        realtime: realtime.toString()
      });

      const response = await fetch(`/api/analytics/dashboard?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, timeRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data) return {};

    // Daily activity chart
    const dailyActivity = Object.entries(data.userEngagement.dailyActivity || {})
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString(),
        sessions: count
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Content growth chart
    const contentGrowth = Object.entries(data.contentMetrics.contentGrowth || {})
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString(),
        items: count
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Feature adoption pie chart
    const featureAdoption = Object.entries(data.userEngagement.featureAdoption || {})
      .map(([feature, count]) => ({
        name: feature.replace(/([A-Z])/g, ' $1').toLowerCase(),
        value: count
      }));

    // Content type distribution
    const contentTypes = Object.entries(data.userEngagement.productivity.byType || {})
      .map(([type, count]) => ({
        name: type,
        value: count
      }));

    // Model performance comparison
    const modelPerformance = Object.entries(data.aiPerformance.modelUsage || {})
      .map(([model, stats]: [string, any]) => ({
        model,
        completed: stats.completed || 0,
        failed: stats.failed || 0,
        total: stats.total || 0,
        successRate: stats.total > 0 ? ((stats.completed || 0) / stats.total) * 100 : 0
      }));

    // Cost analysis over time
    const costAnalysis = Object.entries(data.aiPerformance.costAnalysis || {})
      .map(([model, cost]: [string, any]) => ({
        model,
        totalCost: cost.totalCost || 0,
        avgCost: cost.avgCost || 0,
        requests: cost.requestCount || 0
      }));

    return {
      dailyActivity,
      contentGrowth,
      featureAdoption,
      contentTypes,
      modelPerformance,
      costAnalysis
    };
  }, [data]);

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        format,
        type: 'detailed',
        range: timeRange
      });

      const response = await fetch(`/api/analytics/export?${params}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contextforge-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  if (loading && !data) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics dashboard...</p>
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
            Failed to load analytics: {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
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
          <Info className="h-4 w-4" />
          <AlertDescription>
            No analytics data available. Start using ContextForge to see insights here.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your AI context management
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          
          <div className="flex items-center space-x-2">
            <Switch 
              checked={autoRefresh} 
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.userEngagement.totalSessions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.userEngagement.avgSessionsPerDay.toFixed(1)} avg per day
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Created</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.userEngagement.productivity.itemsCreated.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(data.userEngagement.productivity.byType).length} different types
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.businessInsights.roi.costSavings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.businessInsights.roi.tokenSavings.toLocaleString()} tokens saved
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.aiPerformance.overallSuccessRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              AI processing success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Alerts */}
      {realtime && data.realtime && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {data.realtime.activeJobs.length} active jobs, 
                Queue size: {data.realtime.systemHealth.queueSize}
              </span>
              <Badge variant={data.realtime.systemHealth.errorRate > 0.05 ? "destructive" : "default"}>
                {(data.realtime.systemHealth.errorRate * 100).toFixed(1)}% error rate
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content Intelligence</TabsTrigger>
          <TabsTrigger value="performance">AI Performance</TabsTrigger>
          <TabsTrigger value="business">Business Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Daily Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Daily Activity
                </CardTitle>
                <CardDescription>
                  User sessions over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Feature Adoption */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Feature Adoption
                </CardTitle>
                <CardDescription>
                  Usage of different AI features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.featureAdoption}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.featureAdoption.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Content Growth */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Content Growth
              </CardTitle>
              <CardDescription>
                Items created over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.contentGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="items" 
                    stroke={COLORS.success}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average Confidence</span>
                    <span>{(data.contentMetrics.qualityTrends.avgConfidence * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={data.contentMetrics.qualityTrends.avgConfidence * 100} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Readability Score</span>
                    <span>{(data.contentMetrics.qualityTrends.avgReadability * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={data.contentMetrics.qualityTrends.avgReadability * 100} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sentiment Score</span>
                    <span>{((data.contentMetrics.qualityTrends.avgSentiment + 1) * 50).toFixed(1)}%</span>
                  </div>
                  <Progress value={(data.contentMetrics.qualityTrends.avgSentiment + 1) * 50} />
                </div>
              </CardContent>
            </Card>

            {/* Optimization Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Optimization Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Token Savings</span>
                  <span className="font-bold">{data.contentMetrics.optimizationImpact.totalTokenSavings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cost Savings</span>
                  <span className="font-bold">${data.contentMetrics.optimizationImpact.totalCostSavings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Optimizations</span>
                  <span className="font-bold">{data.contentMetrics.optimizationImpact.optimizationCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Quality</span>
                  <span className="font-bold">{data.contentMetrics.optimizationImpact.avgQualityScore.toFixed(2)}/10</span>
                </div>
              </CardContent>
            </Card>

            {/* Duplicate Detection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="h-5 w-5 mr-2" />
                  Duplicate Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Items</span>
                  <span className="font-bold">{data.contentMetrics.duplicateDetection.totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duplicates Found</span>
                  <span className="font-bold">{data.contentMetrics.duplicateDetection.duplicatesFound}</span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Duplicate Rate</span>
                    <span>{(data.contentMetrics.duplicateDetection.duplicateRate * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={data.contentMetrics.duplicateDetection.duplicateRate * 100} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Semantic Clustering */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Semantic Clustering
              </CardTitle>
              <CardDescription>
                Content organization and clustering insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Clusters</span>
                    <span className="font-bold">{data.contentMetrics.semanticClustering.totalClusters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Cluster Size</span>
                    <span className="font-bold">{data.contentMetrics.semanticClustering.avgClusterSize.toFixed(1)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.contentMetrics.semanticClustering.clusterDistribution.slice(0, 3).map((cluster, index) => (
                    <div key={cluster.id} className="flex justify-between text-sm">
                      <span className="truncate">{cluster.name}</span>
                      <Badge variant="secondary">{cluster.size} items</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Model Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Model Performance Comparison
              </CardTitle>
              <CardDescription>
                Success rates across different AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.modelPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill={COLORS.success} name="Completed" />
                  <Bar dataKey="failed" fill={COLORS.error} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Analysis */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Cost Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.costAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`$${value.toFixed(4)}`, 'Cost']} />
                    <Bar dataKey="totalCost" fill={COLORS.warning} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gauge className="h-5 w-5 mr-2" />
                  Processing Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(data.aiPerformance.processingMetrics).slice(0, 4).map(([type, metrics]: [string, any]) => (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                      <span>{metrics.avgTime ? `${(metrics.avgTime / 1000).toFixed(1)}s` : 'N/A'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {metrics.count || 0} requests processed
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* ROI Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Return on Investment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cost Savings</span>
                  <span className="font-bold text-green-600">
                    ${data.businessInsights.roi.costSavings.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Token Savings</span>
                  <span className="font-bold">
                    {data.businessInsights.roi.tokenSavings.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Optimizations</span>
                  <span className="font-bold">
                    {data.businessInsights.roi.optimizationsApproved}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg per Optimization</span>
                  <span className="font-bold">
                    ${data.businessInsights.roi.avgSavingsPerOptimization.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Productivity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Productivity Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.businessInsights.productivity).map(([metric, value]) => (
                  <div key={metric} className="flex justify-between">
                    <span className="text-sm text-muted-foreground capitalize">
                      {metric.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                    <span className="font-bold">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Time to Value */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Time to Value
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Time to Optimization</span>
                  <span className="font-bold">
                    {data.businessInsights.timeToValue.avgTimeToOptimization > 0 
                      ? `${(data.businessInsights.timeToValue.avgTimeToOptimization / (1000 * 60 * 60)).toFixed(1)}h`
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Items Optimized</span>
                  <span className="font-bold">
                    {data.businessInsights.timeToValue.itemsOptimized}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Optimization Rate</span>
                    <span>{(data.businessInsights.timeToValue.optimizationRate * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={data.businessInsights.timeToValue.optimizationRate * 100} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quality Improvements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2" />
                Quality Improvements
              </CardTitle>
              <CardDescription>
                Content quality enhancements over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-2xl font-bold">
                    {(data.businessInsights.qualityImprovements.avgConfidence * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Average confidence score</p>
                  <Progress 
                    value={data.businessInsights.qualityImprovements.avgConfidence * 100} 
                    className="mt-2"
                  />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {data.businessInsights.qualityImprovements.itemsAnalyzed.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Items analyzed for quality</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}