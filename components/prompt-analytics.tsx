'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Clock,
  Zap,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Star,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Search,
  Settings,
  Info,
  ArrowUp,
  ArrowDown,
  Minus,
  MoreHorizontal,
  Maximize2,
  TrendingUp as TrendingUpIcon,
  Gauge,
  Cpu,
  Database,
  Globe,
  Layers,
  Hash,
  FileText,
  MessageSquare,
  Brain,
  Lightbulb,
} from 'lucide-react';

export interface PerformanceMetrics {
  id: string;
  promptId: string;
  promptName: string;
  timestamp: string;
  model: string;
  metrics: {
    // Quality metrics
    qualityScore: number;
    coherenceScore: number;
    relevanceScore: number;
    completenessScore: number;
    
    // Performance metrics
    responseTime: number;
    tokenCount: number;
    costPerRequest: number;
    
    // Usage metrics
    requestCount: number;
    successRate: number;
    errorRate: number;
    
    // User metrics
    userSatisfaction: number;
    thumbsUp: number;
    thumbsDown: number;
    
    // Efficiency metrics
    tokensPerSecond: number;
    costEfficiency: number;
    
    // Advanced metrics
    hallucination_rate: number;
    factualAccuracy: number;
    biasScore: number;
    toxicityScore: number;
  };
  tags: string[];
  version: string;
}

export interface AnalyticsSummary {
  totalRequests: number;
  totalCost: number;
  avgQualityScore: number;
  avgResponseTime: number;
  successRate: number;
  topPerformingPrompts: Array<{
    id: string;
    name: string;
    score: number;
    improvement: number;
  }>;
  trends: {
    quality: 'up' | 'down' | 'stable';
    performance: 'up' | 'down' | 'stable';
    cost: 'up' | 'down' | 'stable';
    usage: 'up' | 'down' | 'stable';
  };
}

interface PromptAnalyticsProps {
  metrics: PerformanceMetrics[];
  summary: AnalyticsSummary;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  onExport: (format: 'csv' | 'json' | 'pdf') => void;
  readonly?: boolean;
}

const TIME_RANGES = [
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const METRIC_CATEGORIES = [
  {
    id: 'quality',
    name: 'Quality',
    icon: Star,
    color: 'text-yellow-600',
    metrics: ['qualityScore', 'coherenceScore', 'relevanceScore', 'completenessScore'],
  },
  {
    id: 'performance',
    name: 'Performance',
    icon: Zap,
    color: 'text-blue-600',
    metrics: ['responseTime', 'tokensPerSecond', 'successRate'],
  },
  {
    id: 'cost',
    name: 'Cost',
    icon: DollarSign,
    color: 'text-green-600',
    metrics: ['costPerRequest', 'costEfficiency', 'tokenCount'],
  },
  {
    id: 'safety',
    name: 'Safety',
    icon: AlertTriangle,
    color: 'text-red-600',
    metrics: ['hallucination_rate', 'factualAccuracy', 'biasScore', 'toxicityScore'],
  },
];

const METRIC_DEFINITIONS = {
  qualityScore: { name: 'Quality Score', description: 'Overall quality rating', unit: '/10', format: 'decimal' },
  coherenceScore: { name: 'Coherence', description: 'Logical consistency', unit: '/10', format: 'decimal' },
  relevanceScore: { name: 'Relevance', description: 'Relevance to prompt', unit: '/10', format: 'decimal' },
  completenessScore: { name: 'Completeness', description: 'Response completeness', unit: '/10', format: 'decimal' },
  responseTime: { name: 'Response Time', description: 'Time to generate response', unit: 'ms', format: 'integer' },
  tokenCount: { name: 'Token Count', description: 'Number of tokens used', unit: 'tokens', format: 'integer' },
  costPerRequest: { name: 'Cost per Request', description: 'Average cost per request', unit: '$', format: 'currency' },
  requestCount: { name: 'Request Count', description: 'Total number of requests', unit: '', format: 'integer' },
  successRate: { name: 'Success Rate', description: 'Percentage of successful requests', unit: '%', format: 'percentage' },
  errorRate: { name: 'Error Rate', description: 'Percentage of failed requests', unit: '%', format: 'percentage' },
  userSatisfaction: { name: 'User Satisfaction', description: 'Average user rating', unit: '/5', format: 'decimal' },
  thumbsUp: { name: 'Thumbs Up', description: 'Positive feedback count', unit: '', format: 'integer' },
  thumbsDown: { name: 'Thumbs Down', description: 'Negative feedback count', unit: '', format: 'integer' },
  tokensPerSecond: { name: 'Tokens/Second', description: 'Token generation speed', unit: 'tps', format: 'decimal' },
  costEfficiency: { name: 'Cost Efficiency', description: 'Quality per dollar spent', unit: '', format: 'decimal' },
  hallucination_rate: { name: 'Hallucination Rate', description: 'Rate of factual errors', unit: '%', format: 'percentage' },
  factualAccuracy: { name: 'Factual Accuracy', description: 'Accuracy of factual claims', unit: '%', format: 'percentage' },
  biasScore: { name: 'Bias Score', description: 'Detected bias level', unit: '/10', format: 'decimal' },
  toxicityScore: { name: 'Toxicity Score', description: 'Toxic content level', unit: '/10', format: 'decimal' },
};

export function PromptAnalytics({
  metrics,
  summary,
  timeRange,
  onTimeRangeChange,
  onExport,
  readonly = false,
}: PromptAnalyticsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('quality');
  const [selectedPrompt, setSelectedPrompt] = useState<string>('all');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison'>('overview');
  const [comparisonPrompts, setComparisonPrompts] = useState<string[]>([]);

  // Filter metrics based on selections
  const filteredMetrics = useMemo(() => {
    return metrics.filter(metric => {
      const promptMatch = selectedPrompt === 'all' || metric.promptId === selectedPrompt;
      const modelMatch = selectedModel === 'all' || metric.model === selectedModel;
      return promptMatch && modelMatch;
    });
  }, [metrics, selectedPrompt, selectedModel]);

  // Get unique prompts and models
  const uniquePrompts = useMemo(() => {
    const prompts = Array.from(new Set(metrics.map(m => ({ id: m.promptId, name: m.promptName }))));
    return prompts.filter((prompt, index, self) => 
      index === self.findIndex(p => p.id === prompt.id)
    );
  }, [metrics]);

  const uniqueModels = useMemo(() => {
    return Array.from(new Set(metrics.map(m => m.model)));
  }, [metrics]);

  // Calculate aggregated metrics
  const aggregatedMetrics = useMemo(() => {
    if (filteredMetrics.length === 0) return null;

    const totals = filteredMetrics.reduce((acc, metric) => {
      Object.entries(metric.metrics).forEach(([key, value]) => {
        if (typeof value === 'number') {
          acc[key] = (acc[key] || 0) + value;
        }
      });
      return acc;
    }, {} as Record<string, number>);

    const averages = Object.entries(totals).reduce((acc, [key, total]) => {
      acc[key] = total / filteredMetrics.length;
      return acc;
    }, {} as Record<string, number>);

    return averages;
  }, [filteredMetrics]);

  // Calculate trends
  const calculateTrend = (metricKey: string) => {
    if (filteredMetrics.length < 2) return { direction: 'stable', change: 0 };

    const sortedMetrics = [...filteredMetrics].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const midpoint = Math.floor(sortedMetrics.length / 2);
    const firstHalf = sortedMetrics.slice(0, midpoint);
    const secondHalf = sortedMetrics.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, m) => sum + (m.metrics as any)[metricKey], 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + (m.metrics as any)[metricKey], 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    const direction = Math.abs(change) < 5 ? 'stable' : change > 0 ? 'up' : 'down';

    return { direction, change };
  };

  const formatMetricValue = (value: number, metricKey: string) => {
    const definition = METRIC_DEFINITIONS[metricKey as keyof typeof METRIC_DEFINITIONS];
    if (!definition) return value.toString();

    switch (definition.format) {
      case 'currency':
        return `$${value.toFixed(4)}`;
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'decimal':
        return value.toFixed(2);
      case 'integer':
        return Math.round(value).toLocaleString();
      default:
        return value.toString();
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderMetricCard = (metricKey: string, value: number, category: string) => {
    const definition = METRIC_DEFINITIONS[metricKey as keyof typeof METRIC_DEFINITIONS];
    const trend = calculateTrend(metricKey);
    
    if (!definition) return null;

    const categoryInfo = METRIC_CATEGORIES.find(c => c.id === category);
    const isPositiveMetric = !['errorRate', 'responseTime', 'costPerRequest', 'hallucination_rate', 'biasScore', 'toxicityScore'].includes(metricKey);
    const trendColor = trend.direction === 'stable' ? 'text-gray-600' : 
      (trend.direction === 'up' && isPositiveMetric) || (trend.direction === 'down' && !isPositiveMetric) ? 'text-green-600' : 'text-red-600';

    return (
      <Card key={metricKey}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {categoryInfo && <categoryInfo.icon className={`h-4 w-4 ${categoryInfo.color}`} />}
              <span className="text-sm font-medium">{definition.name}</span>
            </div>
            <div className={`flex items-center space-x-1 ${trendColor}`}>
              {getTrendIcon(trend.direction)}
              {Math.abs(trend.change) > 0 && (
                <span className="text-xs">{Math.abs(trend.change).toFixed(1)}%</span>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              {formatMetricValue(value, metricKey)}
            </div>
            <p className="text-xs text-muted-foreground">
              {definition.description}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Requests</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalRequests.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-green-600">
              {getTrendIcon(summary.trends.usage)}
              <span className="text-xs">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Avg Quality</span>
            </div>
            <div className="text-2xl font-bold">{summary.avgQualityScore.toFixed(2)}/10</div>
            <div className="flex items-center space-x-1 text-green-600">
              {getTrendIcon(summary.trends.quality)}
              <span className="text-xs">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Avg Response Time</span>
            </div>
            <div className="text-2xl font-bold">{summary.avgResponseTime.toFixed(0)}ms</div>
            <div className="flex items-center space-x-1 text-green-600">
              {getTrendIcon(summary.trends.performance)}
              <span className="text-xs">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Cost</span>
            </div>
            <div className="text-2xl font-bold">${summary.totalCost.toFixed(2)}</div>
            <div className="flex items-center space-x-1 text-red-600">
              {getTrendIcon(summary.trends.cost)}
              <span className="text-xs">vs last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top performing prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span>Top Performing Prompts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.topPerformingPrompts.map((prompt, index) => (
              <div key={prompt.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-amber-600 text-white' : 'bg-gray-200'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{prompt.name}</p>
                    <p className="text-sm text-muted-foreground">Score: {prompt.score.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-green-600">
                    <ArrowUp className="h-3 w-3" />
                    <span className="text-sm">{prompt.improvement.toFixed(1)}%</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedPrompt(prompt.id)}>
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Success rate indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Success Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Overall Success Rate</span>
              <span className="font-bold">{(summary.successRate * 100).toFixed(1)}%</span>
            </div>
            <Progress value={summary.successRate * 100} className="h-3" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Successful: {(summary.successRate * summary.totalRequests).toFixed(0)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>Failed: {((1 - summary.successRate) * summary.totalRequests).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDetailedTab = () => (
    <div className="space-y-6">
      {/* Category selector */}
      <div className="flex space-x-2">
        {METRIC_CATEGORIES.map(category => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(category.id)}
            className="flex items-center space-x-2"
          >
            <category.icon className="h-4 w-4" />
            <span>{category.name}</span>
          </Button>
        ))}
      </div>

      {/* Detailed metrics for selected category */}
      {aggregatedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {METRIC_CATEGORIES.find(c => c.id === selectedCategory)?.metrics.map(metricKey => 
            aggregatedMetrics[metricKey] !== undefined ? 
              renderMetricCard(metricKey, aggregatedMetrics[metricKey], selectedCategory) : null
          )}
        </div>
      )}

      {/* Metrics over time chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics Over Time</CardTitle>
          <CardDescription>
            Trend analysis for {METRIC_CATEGORIES.find(c => c.id === selectedCategory)?.name.toLowerCase()} metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <LineChart className="h-12 w-12 mx-auto mb-4" />
            <p>Chart visualization would be implemented here</p>
            <p className="text-sm">Shows trends for selected metrics over time</p>
          </div>
        </CardContent>
      </Card>

      {/* Distribution chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Metric Distribution</CardTitle>
          <CardDescription>
            Distribution of {METRIC_CATEGORIES.find(c => c.id === selectedCategory)?.name.toLowerCase()} scores
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4" />
            <p>Distribution chart would be implemented here</p>
            <p className="text-sm">Shows score distribution across requests</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderComparisonTab = () => (
    <div className="space-y-6">
      {/* Prompt selector for comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparison Setup</CardTitle>
          <CardDescription>Select prompts to compare their performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Select Prompts to Compare</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {uniquePrompts.map(prompt => (
                  <div key={prompt.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={prompt.id}
                      checked={comparisonPrompts.includes(prompt.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setComparisonPrompts([...comparisonPrompts, prompt.id]);
                        } else {
                          setComparisonPrompts(comparisonPrompts.filter(id => id !== prompt.id));
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={prompt.id} className="text-sm">
                      {prompt.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison results */}
      {comparisonPrompts.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p>Comparison visualization would be implemented here</p>
              <p className="text-sm">Side-by-side metrics comparison for selected prompts</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Performance Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Monitor and analyze prompt performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-40">
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
          
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-40">
              <Brain className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {uniqueModels.map(model => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => onExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
          <SelectTrigger className="w-64">
            <FileText className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All prompts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prompts</SelectItem>
            {uniquePrompts.map(prompt => (
              <SelectItem key={prompt.id} value={prompt.id}>
                {prompt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main analytics content */}
      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {renderOverviewTab()}
        </TabsContent>
        
        <TabsContent value="detailed">
          {renderDetailedTab()}
        </TabsContent>
        
        <TabsContent value="comparison">
          {renderComparisonTab()}
        </TabsContent>
      </Tabs>

      {/* Data quality indicator */}
      {filteredMetrics.length < 10 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Limited data available ({filteredMetrics.length} samples). 
            Analytics become more accurate with more usage data.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}