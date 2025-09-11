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
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  Clock,
  Users,
  Zap,
  Award,
  BarChart3,
  Calculator,
  PieChart as PieChartIcon,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  Download,
  RefreshCw,
  Info,
  AlertTriangle,
  CheckCircle
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

interface BusinessInsightsData {
  productivity: {
    itemsCreated: number;
    optimizationsApplied: number;
    classificationsRun: number;
    searchesPerformed: number;
    timeToValue: number;
    productivityScore: number;
  };
  roi: {
    tokenSavings: number;
    costSavings: number;
    optimizationsApproved: number;
    avgSavingsPerOptimization: number;
    roiPercentage: number;
    paybackPeriod: number;
  };
  efficiency: {
    automationRate: number;
    errorReduction: number;
    processingTimeImprovement: number;
    qualityImprovement: number;
    userSatisfaction: number;
  };
  trends: {
    productivityTrend: number;
    costTrend: number;
    qualityTrend: number;
    usageTrend: number;
  };
  projections: {
    monthlySavings: number;
    annualSavings: number;
    efficiencyGains: number;
    scalabilityIndex: number;
  };
  benchmarks: {
    industryAvgROI: number;
    industryAvgProductivity: number;
    industryAvgQuality: number;
    performanceRanking: number;
  };
}

interface BusinessInsightsProps {
  userId: string;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  className?: string;
}

const TREND_COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280'
};

export function BusinessInsights({
  userId,
  timeRange,
  onTimeRangeChange,
  className
}: BusinessInsightsProps) {
  const [data, setData] = useState<BusinessInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'roi' | 'productivity' | 'efficiency'>('roi');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/business-insights?range=${timeRange}&userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch business insights data');
      }

      const insightsData = await response.json();
      setData(insightsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, userId]);

  // Generate chart data
  const chartData = useMemo(() => {
    if (!data) return {};

    // Use actual ROI progression data from API if available
    const roiProgression = (data as any).roiProgression || [];

    // Efficiency metrics comparison
    const efficiencyComparison = [
      { metric: 'Automation Rate', current: data.efficiency.automationRate, target: 85, industry: 70 },
      { metric: 'Error Reduction', current: data.efficiency.errorReduction, target: 90, industry: 75 },
      { metric: 'Processing Time', current: data.efficiency.processingTimeImprovement, target: 80, industry: 60 },
      { metric: 'Quality Score', current: data.efficiency.qualityImprovement, target: 95, industry: 80 },
      { metric: 'User Satisfaction', current: data.efficiency.userSatisfaction, target: 90, industry: 75 }
    ];

    // Cost breakdown
    const costBreakdown = [
      { category: 'AI Model Costs', value: data.roi.costSavings * 0.6, color: '#3b82f6' },
      { category: 'Processing Time', value: data.roi.costSavings * 0.25, color: '#10b981' },
      { category: 'Error Prevention', value: data.roi.costSavings * 0.15, color: '#f59e0b' }
    ];

    return {
      roiProgression,
      efficiencyComparison,
      costBreakdown
    };
  }, [data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 5) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (value < -5) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 5) return 'text-green-600';
    if (value < -5) return 'text-red-600';
    return 'text-gray-600';
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
            No business insights data available
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
          <h3 className="text-2xl font-bold">Business Insights & ROI</h3>
          <p className="text-muted-foreground">
            Track productivity gains, cost savings, and business value from AI optimization
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(data.roi.roiPercentage)}
            </div>
            <div className={cn("flex items-center text-xs", getTrendColor(data.trends.costTrend))}>
              {getTrendIcon(data.trends.costTrend)}
              <span className="ml-1">{Math.abs(data.trends.costTrend).toFixed(1)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.roi.costSavings)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(data.projections.monthlySavings)}/month projected
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.productivity.productivityScore.toFixed(1)}/10
            </div>
            <div className={cn("flex items-center text-xs", getTrendColor(data.trends.productivityTrend))}>
              {getTrendIcon(data.trends.productivityTrend)}
              <span className="ml-1">{Math.abs(data.trends.productivityTrend).toFixed(1)}% improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency Gains</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(data.efficiency.automationRate)}
            </div>
            <div className="text-xs text-muted-foreground">
              Automation rate achieved
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance vs Industry Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Performance vs Industry Benchmarks
          </CardTitle>
          <CardDescription>
            How your metrics compare to industry standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>ROI Performance</span>
                <Badge variant={data.roi.roiPercentage > data.benchmarks.industryAvgROI ? "default" : "secondary"}>
                  {data.roi.roiPercentage > data.benchmarks.industryAvgROI ? "Above Average" : "Below Average"}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Your ROI: {formatPercentage(data.roi.roiPercentage)}</span>
                  <span>Industry Avg: {formatPercentage(data.benchmarks.industryAvgROI)}</span>
                </div>
                <Progress value={(data.roi.roiPercentage / data.benchmarks.industryAvgROI) * 50} className="h-2" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Productivity Ranking</span>
                <Badge variant={data.benchmarks.performanceRanking <= 25 ? "default" : "secondary"}>
                  Top {data.benchmarks.performanceRanking}%
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Your Score: {data.productivity.productivityScore.toFixed(1)}</span>
                  <span>Industry Avg: {data.benchmarks.industryAvgProductivity.toFixed(1)}</span>
                </div>
                <Progress value={(data.productivity.productivityScore / 10) * 100} className="h-2" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Quality Score</span>
                <Badge variant={data.efficiency.qualityImprovement > data.benchmarks.industryAvgQuality ? "default" : "secondary"}>
                  {data.efficiency.qualityImprovement > data.benchmarks.industryAvgQuality ? "Excellent" : "Good"}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Your Score: {formatPercentage(data.efficiency.qualityImprovement)}</span>
                  <span>Industry Avg: {formatPercentage(data.benchmarks.industryAvgQuality)}</span>
                </div>
                <Progress value={data.efficiency.qualityImprovement} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <Tabs defaultValue="roi" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="roi" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* ROI Progression */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  ROI Progression
                </CardTitle>
                <CardDescription>
                  Return on investment over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.roiProgression}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'ROI']} />
                    <Line 
                      type="monotone" 
                      dataKey="roi" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                    <ReferenceLine y={data.benchmarks.industryAvgROI} stroke="#ef4444" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost Savings Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Cost Savings Breakdown
                </CardTitle>
                <CardDescription>
                  Sources of cost reduction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.costBreakdown || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percent }) => `${category} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(chartData.costBreakdown || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [formatCurrency(value), 'Savings']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ROI Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                ROI Metrics Detail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Total Savings</div>
                  <div className="text-2xl font-bold">{formatCurrency(data.roi.costSavings)}</div>
                  <div className="text-xs text-muted-foreground">
                    From {data.roi.optimizationsApproved} optimizations
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Avg per Optimization</div>
                  <div className="text-2xl font-bold">{formatCurrency(data.roi.avgSavingsPerOptimization)}</div>
                  <div className="text-xs text-muted-foreground">
                    {data.roi.tokenSavings.toLocaleString()} tokens saved
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Payback Period</div>
                  <div className="text-2xl font-bold">{data.roi.paybackPeriod.toFixed(1)} mo</div>
                  <div className="text-xs text-muted-foreground">
                    Time to recover investment
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">ROI Percentage</div>
                  <div className="text-2xl font-bold">{formatPercentage(data.roi.roiPercentage)}</div>
                  <div className="text-xs text-muted-foreground">
                    Return on AI investment
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Productivity Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Productivity Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Items Created</span>
                    <span className="font-bold">{data.productivity.itemsCreated.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Optimizations Applied</span>
                    <span className="font-bold">{data.productivity.optimizationsApplied.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Classifications Run</span>
                    <span className="font-bold">{data.productivity.classificationsRun.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Searches Performed</span>
                    <span className="font-bold">{data.productivity.searchesPerformed.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Productivity Score</span>
                    <span className="text-lg font-bold">{data.productivity.productivityScore.toFixed(1)}/10</span>
                  </div>
                  <Progress value={data.productivity.productivityScore * 10} className="h-3" />
                </div>
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
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {(data.productivity.timeToValue / (1000 * 60 * 60)).toFixed(1)}h
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Average time to first optimization
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Target: 4h</span>
                      <span>Industry: 8h</span>
                    </div>
                    <Progress 
                      value={Math.min(100, (4 / (data.productivity.timeToValue / (1000 * 60 * 60))) * 100)} 
                      className="h-2"
                    />
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {data.productivity.timeToValue < 4 * 60 * 60 * 1000 
                        ? "Excellent! You're achieving value faster than industry standards."
                        : "Consider enabling auto-optimization to reduce time to value."
                      }
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          {/* Efficiency Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Efficiency Metrics Comparison
              </CardTitle>
              <CardDescription>
                Current performance vs targets and industry benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData.efficiencyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, '']} />
                  <Legend />
                  <Bar dataKey="current" fill="#3b82f6" name="Current" />
                  <Bar dataKey="target" fill="#10b981" name="Target" />
                  <Bar dataKey="industry" fill="#6b7280" name="Industry Avg" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Efficiency Details */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Automation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{formatPercentage(data.efficiency.automationRate)}</div>
                  <Progress value={data.efficiency.automationRate} className="h-3" />
                  <div className="text-sm text-muted-foreground">
                    {data.efficiency.automationRate > 80 ? "Excellent automation" : "Room for improvement"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Error Reduction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{formatPercentage(data.efficiency.errorReduction)}</div>
                  <Progress value={data.efficiency.errorReduction} className="h-3" />
                  <div className="text-sm text-muted-foreground">
                    Errors prevented by AI
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quality Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{formatPercentage(data.efficiency.qualityImprovement)}</div>
                  <Progress value={data.efficiency.qualityImprovement} className="h-3" />
                  <div className="text-sm text-muted-foreground">
                    Content quality enhanced
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projections" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Financial Projections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Financial Projections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="text-sm text-green-700">Monthly Savings</div>
                      <div className="text-xl font-bold text-green-900">
                        {formatCurrency(data.projections.monthlySavings)}
                      </div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>

                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-sm text-blue-700">Annual Savings</div>
                      <div className="text-xl font-bold text-blue-900">
                        {formatCurrency(data.projections.annualSavings)}
                      </div>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>

                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <div className="text-sm text-purple-700">Efficiency Gains</div>
                      <div className="text-xl font-bold text-purple-900">
                        {formatPercentage(data.projections.efficiencyGains)}
                      </div>
                    </div>
                    <Zap className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scalability Index */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Scalability Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">
                      {data.projections.scalabilityIndex.toFixed(1)}/10
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Scalability Index
                    </div>
                  </div>

                  <Progress value={data.projections.scalabilityIndex * 10} className="h-4" />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Current Usage</span>
                      <span className="font-medium">Moderate</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth Potential</span>
                      <span className="font-medium">High</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Optimization Rate</span>
                      <span className="font-medium">Excellent</span>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {data.projections.scalabilityIndex > 7.5 
                        ? "Your system is highly scalable and ready for increased usage."
                        : "Consider optimizing bottlenecks before scaling up usage."
                      }
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Actions</CardTitle>
              <CardDescription>
                Steps to maximize ROI and efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Expand Automation Coverage</h4>
                    <p className="text-sm text-blue-700">
                      Implement automated optimization for remaining manual processes to achieve 95% automation rate.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <Target className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Optimize Model Selection</h4>
                    <p className="text-sm text-green-700">
                      Switch 30% of simple tasks to more cost-effective models to increase savings by 25%.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-900">Scale Team Usage</h4>
                    <p className="text-sm text-purple-700">
                      Onboard 3 additional team members to maximize ROI through increased utilization.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}