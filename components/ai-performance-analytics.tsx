'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter
} from 'recharts';
import {
  Brain,
  DollarSign,
  Zap,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  Gauge,
  BarChart3,
  PieChart as PieChartIcon,
  Settings,
  Download,
  RefreshCw,
  Info,
  Star,
  Cpu,
  Database,
  Server
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface AIPerformanceData {
  modelUsage: Record<string, {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    processing: number;
  }>;
  processingMetrics: Record<string, {
    totalTime: number;
    count: number;
    avgTime: number;
  }>;
  errorAnalysis: Record<string, number>;
  costAnalysis: Record<string, {
    totalCost: number;
    avgCost: number;
    requestCount: number;
  }>;
  overallSuccessRate: number;
  performanceTrends?: Array<{
    date: string;
    responseTime: number;
    successRate: number;
    cost: number;
    requests: number;
  }>;
  modelComparison?: Array<{
    model: string;
    avgResponseTime: number;
    successRate: number;
    costPerRequest: number;
    totalRequests: number;
    qualityScore: number;
  }>;
  costBreakdown?: Array<{
    model: string;
    dailyCost: number;
    requestCount: number;
    avgCostPerRequest: number;
  }>;
}

interface AIPerformanceAnalyticsProps {
  userId: string;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  className?: string;
}

const MODEL_COLORS = {
  'gpt-5-2025-08-07': '#10b981',
  'gpt-4o': '#3b82f6',
  'claude-sonnet-4-20250514': '#8b5cf6',
  'claude-haiku-4-20250514': '#a855f7',
  'claude-opus-4-20250514': '#c084fc',
  'gemini-2.0-flash': '#f59e0b',
  'gemini-pro': '#fbbf24'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function AIPerformanceAnalytics({
  userId,
  timeRange,
  onTimeRangeChange,
  className
}: AIPerformanceAnalyticsProps) {
  const [data, setData] = useState<AIPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'performance' | 'cost' | 'quality'>('performance');
  const [selectedModel, setSelectedModel] = useState<string>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/ai-performance?range=${timeRange}&userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch AI performance data');
      }

      const performanceData = await response.json();
      setData(performanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, userId]);

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data) return {};

    // Model performance comparison
    const modelComparison = Object.entries(data.modelUsage).map(([model, stats]) => ({
      model,
      successRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
      total: stats.total,
      completed: stats.completed,
      failed: stats.failed,
      avgTime: data.processingMetrics[model]?.avgTime || 0
    }));

    // Cost distribution
    const costDistribution = Object.entries(data.costAnalysis).map(([model, cost]) => ({
      name: model,
      value: cost.totalCost,
      requests: cost.requestCount,
      avgCost: cost.avgCost
    }));

    // Processing time distribution
    const processingTimes = Object.entries(data.processingMetrics).map(([type, metrics]) => ({
      type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      avgTime: metrics.avgTime / 1000, // Convert to seconds
      count: metrics.count
    }));

    // Use actual performance trends from API or empty array if not available
    const performanceTrends = data.performanceTrends || [];

    return {
      modelComparison,
      costDistribution,
      processingTimes,
      performanceTrends
    };
  }, [data]);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <RefreshCw className="h-8 w-8 animate-spin" />
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
            <Button variant="outline" size="sm" onClick={fetchData} className="ml-2">
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
            No AI performance data available
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
          <h3 className="text-2xl font-bold">AI Performance Analytics</h3>
          <p className="text-muted-foreground">
            Monitor AI model performance, costs, and optimization opportunities
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-40">
              <Brain className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {Object.keys(data.modelUsage).map(model => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.overallSuccessRate * 100).toFixed(1)}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +2.3% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(
                Object.values(data.processingMetrics).reduce((sum, m) => sum + m.avgTime, 0) / 
                Object.values(data.processingMetrics).length || 0
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              -150ms faster
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                Object.values(data.costAnalysis).reduce((sum, c) => sum + c.totalCost, 0)
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
              +$0.12 from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(data.modelUsage).reduce((sum, m) => sum + m.total, 0).toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +24% increase
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="models">Model Comparison</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Model Success Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Model Success Rates
                </CardTitle>
                <CardDescription>
                  Success rate comparison across AI models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.modelComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'successRate' ? `${value.toFixed(1)}%` : value,
                        name === 'successRate' ? 'Success Rate' : name
                      ]}
                    />
                    <Bar dataKey="successRate" fill="#10b981" />
                    <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="5 5" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Processing Times */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Processing Times
                </CardTitle>
                <CardDescription>
                  Average processing time by operation type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.processingTimes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`${value.toFixed(2)}s`, 'Avg Time']}
                    />
                    <Bar dataKey="avgTime" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Error Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Error Analysis
              </CardTitle>
              <CardDescription>
                Error distribution by type and frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.errorAnalysis).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No errors detected in the selected time period</p>
                  </div>
                ) : (
                  Object.entries(data.errorAnalysis).map(([errorType, count]) => (
                    <div key={errorType} className="flex items-center justify-between">
                      <div>
                        <span className="font-medium capitalize">
                          {errorType.replace(/_/g, ' ')}
                        </span>
                        <div className="text-sm text-muted-foreground">
                          {count} occurrence{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <Badge variant={count > 10 ? 'destructive' : count > 5 ? 'secondary' : 'default'}>
                        {count}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cost Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Cost Distribution
                </CardTitle>
                <CardDescription>
                  Cost breakdown by AI model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.costDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(chartData.costDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [formatCurrency(value), 'Cost']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gauge className="h-5 w-5 mr-2" />
                  Cost Efficiency
                </CardTitle>
                <CardDescription>
                  Cost per request by model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.costAnalysis).map(([model, cost]) => (
                    <div key={model} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{model}</span>
                        <span>{formatCurrency(cost.avgCost)}/request</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{cost.requestCount} requests</span>
                        <span>Total: {formatCurrency(cost.totalCost)}</span>
                      </div>
                      <Progress 
                        value={(cost.avgCost / Math.max(...Object.values(data.costAnalysis).map(c => c.avgCost))) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Optimization Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingDown className="h-5 w-5 mr-2" />
                Cost Optimization Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900">Switch to More Efficient Models</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Consider using Claude-3-Haiku for simple tasks to reduce costs by up to 40%
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Potential savings: $0.25/day
                  </Badge>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900">Optimize Token Usage</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Enable automatic prompt optimization to reduce token consumption by 20%
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Potential savings: $0.18/day
                  </Badge>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900">Batch Processing</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Group similar requests to improve efficiency and reduce API call overhead
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Potential savings: $0.12/day
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          {/* Model Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Model Performance Comparison
              </CardTitle>
              <CardDescription>
                Comprehensive comparison across all AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Model</th>
                      <th className="text-right p-2">Requests</th>
                      <th className="text-right p-2">Success Rate</th>
                      <th className="text-right p-2">Avg Response Time</th>
                      <th className="text-right p-2">Cost/Request</th>
                      <th className="text-right p-2">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.modelUsage).map(([model, stats]) => {
                      const costData = data.costAnalysis[model];
                      const processingData = data.processingMetrics[model];
                      
                      return (
                        <tr key={model} className="border-b">
                          <td className="p-2 font-medium">{model}</td>
                          <td className="text-right p-2">{stats.total.toLocaleString()}</td>
                          <td className="text-right p-2">
                            <Badge variant={
                              (stats.completed / stats.total) > 0.95 ? 'default' : 
                              (stats.completed / stats.total) > 0.9 ? 'secondary' : 'destructive'
                            }>
                              {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
                            </Badge>
                          </td>
                          <td className="text-right p-2">
                            {processingData ? formatDuration(processingData.avgTime) : 'N/A'}
                          </td>
                          <td className="text-right p-2">
                            {costData ? formatCurrency(costData.avgCost) : 'N/A'}
                          </td>
                          <td className="text-right p-2">
                            {costData ? formatCurrency(costData.totalCost) : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Performance Trends
              </CardTitle>
              <CardDescription>
                Performance metrics over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData.performanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Response Time (ms)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Success Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Cost Trends
              </CardTitle>
              <CardDescription>
                Daily cost and request volume trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData.performanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'cost' ? formatCurrency(value) : value,
                      name === 'cost' ? 'Daily Cost' : 'Requests'
                    ]}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="cost"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                    name="Daily Cost"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="requests"
                    stackId="2"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                    name="Requests"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}