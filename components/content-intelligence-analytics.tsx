'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ScatterChart,
  Scatter,
  ReferenceLine
} from 'recharts';
import {
  Brain,
  Lightbulb,
  Target,
  TrendingUp,
  Zap,
  FileText,
  Search,
  Copy,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Globe,
  Layers,
  Hash,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Star,
  Award,
  Filter,
  Download,
  RefreshCw,
  Info,
  Settings
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

interface ContentIntelligenceData {
  qualityMetrics: {
    avgReadability: number;
    avgCoherence: number;
    avgRelevance: number;
    avgCompleteness: number;
    qualityTrend: number;
    qualityDistribution: Array<{
      range: string;
      count: number;
    }>;
  };
  optimizationImpact: {
    totalOptimizations: number;
    approvedOptimizations: number;
    avgImprovement: number;
    tokenSavings: number;
    costSavings: number;
    optimizationsByModel: Record<string, number>;
    optimizationTrends: Array<{
      date: string;
      optimizations: number;
      savings: number;
      quality: number;
    }>;
  };
  duplicateAnalysis: {
    totalItems: number;
    duplicatesDetected: number;
    duplicateRate: number;
    duplicatesByType: Record<string, number>;
    deduplicationSavings: number;
    duplicateClusters: Array<{
      id: string;
      size: number;
      similarity: number;
      examples: string[];
    }>;
  };
  semanticInsights: {
    totalClusters: number;
    avgClusterSize: number;
    clusteringQuality: number;
    contentCoverage: number;
    semanticGaps: Array<{
      topic: string;
      gap: number;
      suggestions: string[];
    }>;
    topicDistribution: Array<{
      topic: string;
      count: number;
      percentage: number;
    }>;
  };
  contentEvolution: {
    creationTrend: Array<{
      date: string;
      items: number;
      quality: number;
    }>;
    typeEvolution: Array<{
      date: string;
      prompts: number;
      agents: number;
      rules: number;
      templates: number;
    }>;
    qualityEvolution: Array<{
      date: string;
      readability: number;
      coherence: number;
      relevance: number;
    }>;
  };
  recommendations: Array<{
    id: string;
    type: 'optimization' | 'organization' | 'quality' | 'duplication';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    priority: number;
    actionItems: string[];
  }>;
}

interface ContentIntelligenceAnalyticsProps {
  userId: string;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  className?: string;
}

const QUALITY_COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  fair: '#f59e0b',
  poor: '#ef4444'
};

const CONTENT_TYPES = ['prompts', 'agents', 'rules', 'templates', 'snippets'];

export function ContentIntelligenceAnalytics({
  userId,
  timeRange,
  onTimeRangeChange,
  className
}: ContentIntelligenceAnalyticsProps) {
  const [data, setData] = useState<ContentIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<string>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/content-intelligence?range=${timeRange}&userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch content intelligence data');
      }

      const intelligenceData = await response.json();
      setData(intelligenceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, userId]);

  // Process chart data
  const chartData = useMemo(() => {
    if (!data) return {};

    // Quality distribution for pie chart
    const qualityDistribution = [
      { name: 'Excellent (8-10)', value: data.qualityMetrics.qualityDistribution.find(d => d.range === '8-10')?.count || 0, color: QUALITY_COLORS.excellent },
      { name: 'Good (6-8)', value: data.qualityMetrics.qualityDistribution.find(d => d.range === '6-8')?.count || 0, color: QUALITY_COLORS.good },
      { name: 'Fair (4-6)', value: data.qualityMetrics.qualityDistribution.find(d => d.range === '4-6')?.count || 0, color: QUALITY_COLORS.fair },
      { name: 'Poor (0-4)', value: data.qualityMetrics.qualityDistribution.find(d => d.range === '0-4')?.count || 0, color: QUALITY_COLORS.poor }
    ];

    // Topic distribution for visualization
    const topicData = data.semanticInsights.topicDistribution.map(topic => ({
      topic: topic.topic,
      count: topic.count,
      percentage: topic.percentage
    }));

    // Optimization impact over time
    const optimizationTrends = data.optimizationImpact.optimizationTrends.map(trend => ({
      ...trend,
      date: new Date(trend.date).toLocaleDateString()
    }));

    return {
      qualityDistribution,
      topicData,
      optimizationTrends
    };
  }, [data]);

  const getQualityBadge = (score: number) => {
    if (score >= 8) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 6) return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
    if (score >= 4) return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>;
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getEffortIcon = (effort: string) => {
    switch (effort) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'high': return <Target className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
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
            No content intelligence data available
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
          <h3 className="text-2xl font-bold">Content Intelligence & Optimization</h3>
          <p className="text-muted-foreground">
            AI-powered insights into content quality, optimization opportunities, and semantic organization
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={selectedContentType} onValueChange={setSelectedContentType}>
            <SelectTrigger className="w-40">
              <FileText className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Content</SelectItem>
              {CONTENT_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
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
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((data.qualityMetrics.avgReadability + data.qualityMetrics.avgCoherence + 
                 data.qualityMetrics.avgRelevance + data.qualityMetrics.avgCompleteness) / 4).toFixed(1)}/10
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{data.qualityMetrics.qualityTrend.toFixed(1)}% improvement
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Optimizations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.optimizationImpact.approvedOptimizations}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.optimizationImpact.avgImprovement.toFixed(1)}% avg improvement
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicates Found</CardTitle>
            <Copy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.duplicateAnalysis.duplicatesDetected}
            </div>
            <div className="text-xs text-muted-foreground">
              {(data.duplicateAnalysis.duplicateRate * 100).toFixed(1)}% duplicate rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Semantic Clusters</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.semanticInsights.totalClusters}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.semanticInsights.avgClusterSize.toFixed(1)} avg items per cluster
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="quality" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="quality">Quality Analysis</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
          <TabsTrigger value="semantic">Semantic</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quality Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Quality Distribution
                </CardTitle>
                <CardDescription>
                  Distribution of content quality scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.qualityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.qualityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quality Metrics Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Quality Metrics
                </CardTitle>
                <CardDescription>
                  Detailed quality dimensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Readability</span>
                      <span>{data.qualityMetrics.avgReadability.toFixed(1)}/10</span>
                    </div>
                    <Progress value={data.qualityMetrics.avgReadability * 10} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Coherence</span>
                      <span>{data.qualityMetrics.avgCoherence.toFixed(1)}/10</span>
                    </div>
                    <Progress value={data.qualityMetrics.avgCoherence * 10} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Relevance</span>
                      <span>{data.qualityMetrics.avgRelevance.toFixed(1)}/10</span>
                    </div>
                    <Progress value={data.qualityMetrics.avgRelevance * 10} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completeness</span>
                      <span>{data.qualityMetrics.avgCompleteness.toFixed(1)}/10</span>
                    </div>
                    <Progress value={data.qualityMetrics.avgCompleteness * 10} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quality Evolution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Quality Evolution
              </CardTitle>
              <CardDescription>
                Quality metrics trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.contentEvolution.qualityEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="readability" stroke="#3b82f6" strokeWidth={2} name="Readability" />
                  <Line type="monotone" dataKey="coherence" stroke="#10b981" strokeWidth={2} name="Coherence" />
                  <Line type="monotone" dataKey="relevance" stroke="#f59e0b" strokeWidth={2} name="Relevance" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Optimization Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Optimization Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Optimizations</span>
                    <span className="font-bold">{data.optimizationImpact.totalOptimizations}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Approved</span>
                    <span className="font-bold text-green-600">{data.optimizationImpact.approvedOptimizations}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Token Savings</span>
                    <span className="font-bold">{data.optimizationImpact.tokenSavings.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cost Savings</span>
                    <span className="font-bold">${data.optimizationImpact.costSavings.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Approval Rate</span>
                      <span>{((data.optimizationImpact.approvedOptimizations / data.optimizationImpact.totalOptimizations) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={(data.optimizationImpact.approvedOptimizations / data.optimizationImpact.totalOptimizations) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Optimization by Model */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  Optimizations by Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.optimizationImpact.optimizationsByModel).map(([model, count]) => (
                    <div key={model} className="flex items-center justify-between">
                      <span className="text-sm">{model}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(count / Math.max(...Object.values(data.optimizationImpact.optimizationsByModel))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Optimization Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Optimization Trends
              </CardTitle>
              <CardDescription>
                Optimization activity and impact over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData.optimizationTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="optimizations"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    name="Optimizations"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="savings"
                    stackId="2"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                    name="Savings ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Duplicate Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Copy className="h-5 w-5 mr-2" />
                  Duplicate Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {data.duplicateAnalysis.duplicatesDetected}
                    </div>
                    <div className="text-sm text-muted-foreground">duplicates found</div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Duplicate Rate</span>
                      <span>{(data.duplicateAnalysis.duplicateRate * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={data.duplicateAnalysis.duplicateRate * 100} className="h-2" />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Duplicates by Type</h4>
                    {Object.entries(data.duplicateAnalysis.duplicatesByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="capitalize">{type}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-700">
                      Deduplication could save <span className="font-bold">${data.duplicateAnalysis.deduplicationSavings.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Duplicate Clusters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="h-5 w-5 mr-2" />
                  Duplicate Clusters
                </CardTitle>
                <CardDescription>
                  Groups of similar content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.duplicateAnalysis.duplicateClusters.slice(0, 5).map((cluster, index) => (
                    <div key={cluster.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Cluster {index + 1}</span>
                        <Badge variant="secondary">{cluster.size} items</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {(cluster.similarity * 100).toFixed(1)}% similarity
                      </div>
                      <div className="space-y-1">
                        {cluster.examples.slice(0, 2).map((example, idx) => (
                          <div key={idx} className="text-xs p-1 bg-gray-50 rounded truncate">
                            {example}
                          </div>
                        ))}
                        {cluster.examples.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{cluster.examples.length - 2} more...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="semantic" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Semantic Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Semantic Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{data.semanticInsights.totalClusters}</div>
                      <div className="text-sm text-muted-foreground">Clusters</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{data.semanticInsights.avgClusterSize.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Avg Size</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Clustering Quality</span>
                      <span>{(data.semanticInsights.clusteringQuality * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={data.semanticInsights.clusteringQuality * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Content Coverage</span>
                      <span>{(data.semanticInsights.contentCoverage * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={data.semanticInsights.contentCoverage * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Topic Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Hash className="h-5 w-5 mr-2" />
                  Topic Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {chartData.topicData.slice(0, 8).map((topic, index) => (
                    <div key={topic.topic} className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1">{topic.topic}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${topic.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs w-8">{topic.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Semantic Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Content Gaps & Opportunities
              </CardTitle>
              <CardDescription>
                Areas where content could be expanded or improved
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.semanticInsights.semanticGaps.map((gap, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{gap.topic}</h4>
                      <Badge variant={gap.gap > 0.7 ? 'destructive' : gap.gap > 0.4 ? 'secondary' : 'default'}>
                        {(gap.gap * 100).toFixed(0)}% gap
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Suggestions for improvement:
                    </div>
                    <ul className="text-sm space-y-1">
                      {gap.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                AI Recommendations
              </CardTitle>
              <CardDescription>
                Actionable insights to improve your content strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recommendations
                  .sort((a, b) => b.priority - a.priority)
                  .map((recommendation) => (
                    <div key={recommendation.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3">
                          {getEffortIcon(recommendation.effort)}
                          <div>
                            <h4 className="font-medium">{recommendation.title}</h4>
                            <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={getImpactColor(recommendation.impact)}>
                            {recommendation.impact} impact
                          </Badge>
                          <Badge variant="secondary">
                            {recommendation.effort} effort
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Action Items:</h5>
                        <ul className="text-sm space-y-1">
                          {recommendation.actionItems.map((item, idx) => (
                            <li key={idx} className="flex items-start">
                              <CheckCircle className="h-3 w-3 mr-2 mt-0.5 text-green-500" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}