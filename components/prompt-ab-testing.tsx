'use client';

import React, { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TestTube,
  Play,
  Pause,
  Stop,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Zap,
  Trophy,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Edit,
  Trash2,
  Copy,
  Download,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  Settings,
  Eye,
  Share,
  Flag,
  Layers,
  Split,
  Merge,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const abTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  description: z.string().optional(),
  hypothesis: z.string().min(1, 'Hypothesis is required'),
  primaryMetric: z.string().min(1, 'Primary metric is required'),
  secondaryMetrics: z.array(z.string()),
  trafficSplit: z.number().min(1).max(99),
  duration: z.number().min(1),
  targetSampleSize: z.number().min(10),
  significanceLevel: z.number().min(0.01).max(0.1),
  variants: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    content: z.string().min(1),
    weight: z.number().min(1).max(100),
  })).min(2),
});

type ABTestFormData = z.infer<typeof abTestSchema>;

export interface ABTestVariant {
  id: string;
  name: string;
  description?: string;
  content: string;
  weight: number;
  metrics: {
    impressions: number;
    conversions: number;
    conversionRate: number;
    avgResponseTime: number;
    qualityScore: number;
    tokenUsage: number;
    cost: number;
  };
  isControl: boolean;
}

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  hypothesis: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'stopped';
  primaryMetric: string;
  secondaryMetrics: string[];
  trafficSplit: number;
  duration: number; // in days
  targetSampleSize: number;
  significanceLevel: number;
  startDate?: string;
  endDate?: string;
  variants: ABTestVariant[];
  results?: {
    winner?: string;
    confidence: number;
    significance: boolean;
    improvement: number;
    statisticalPower: number;
  };
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

interface PromptABTestingProps {
  tests: ABTest[];
  onTestsChange: (tests: ABTest[]) => void;
  currentPromptContent: string;
  currentUserId: string;
  currentUserName: string;
  readonly?: boolean;
}

const METRICS = [
  { value: 'conversion_rate', label: 'Conversion Rate', description: 'Percentage of successful outcomes' },
  { value: 'response_quality', label: 'Response Quality', description: 'Quality score based on evaluation criteria' },
  { value: 'response_time', label: 'Response Time', description: 'Average time to generate response' },
  { value: 'token_efficiency', label: 'Token Efficiency', description: 'Quality per token used' },
  { value: 'user_satisfaction', label: 'User Satisfaction', description: 'User rating or feedback score' },
  { value: 'task_completion', label: 'Task Completion', description: 'Successfully completed tasks' },
  { value: 'error_rate', label: 'Error Rate', description: 'Percentage of errors or failures' },
  { value: 'cost_efficiency', label: 'Cost Efficiency', description: 'Results per dollar spent' },
];

const TEST_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'running', label: 'Running', color: 'bg-blue-100 text-blue-800' },
  { value: 'paused', label: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'stopped', label: 'Stopped', color: 'bg-red-100 text-red-800' },
];

export function PromptABTesting({
  tests,
  onTestsChange,
  currentPromptContent,
  currentUserId,
  currentUserName,
  readonly = false,
}: PromptABTestingProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTest, setEditingTest] = useState<ABTest | null>(null);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [variants, setVariants] = useState<Omit<ABTestVariant, 'id' | 'metrics' | 'isControl'>[]>([
    { name: 'Control', content: currentPromptContent, weight: 50 },
    { name: 'Variant A', content: '', weight: 50 },
  ]);

  const form = useForm<ABTestFormData>({
    resolver: zodResolver(abTestSchema),
    defaultValues: {
      name: '',
      description: '',
      hypothesis: '',
      primaryMetric: 'conversion_rate',
      secondaryMetrics: [],
      trafficSplit: 50,
      duration: 7,
      targetSampleSize: 1000,
      significanceLevel: 0.05,
      variants: variants.map(v => ({ ...v, description: '' })),
    },
  });

  // Filter tests
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const matchesSearch = !searchTerm || 
        test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.hypothesis.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || test.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [tests, searchTerm, statusFilter]);

  const createTest = (data: ABTestFormData) => {
    const newTest: ABTest = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      description: data.description,
      hypothesis: data.hypothesis,
      status: 'draft',
      primaryMetric: data.primaryMetric,
      secondaryMetrics: data.secondaryMetrics,
      trafficSplit: data.trafficSplit,
      duration: data.duration,
      targetSampleSize: data.targetSampleSize,
      significanceLevel: data.significanceLevel,
      variants: data.variants.map((variant, index) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: variant.name,
        description: variant.description,
        content: variant.content,
        weight: variant.weight,
        isControl: index === 0,
        metrics: {
          impressions: 0,
          conversions: 0,
          conversionRate: 0,
          avgResponseTime: 0,
          qualityScore: 0,
          tokenUsage: 0,
          cost: 0,
        },
      })),
      authorId: currentUserId,
      authorName: currentUserName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingTest) {
      const updatedTests = tests.map(t => t.id === editingTest.id ? { ...newTest, id: editingTest.id } : t);
      onTestsChange(updatedTests);
      toast({
        title: 'Test updated',
        description: `A/B test "${data.name}" has been updated.`,
      });
    } else {
      onTestsChange([...tests, newTest]);
      toast({
        title: 'Test created',
        description: `A/B test "${data.name}" has been created.`,
      });
    }

    form.reset();
    setEditingTest(null);
    setShowCreateDialog(false);
  };

  const startTest = (testId: string) => {
    const updatedTests = tests.map(test =>
      test.id === testId
        ? {
            ...test,
            status: 'running' as const,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + test.duration * 24 * 60 * 60 * 1000).toISOString(),
          }
        : test
    );

    onTestsChange(updatedTests);
    toast({
      title: 'Test started',
      description: 'A/B test is now running and collecting data.',
    });
  };

  const pauseTest = (testId: string) => {
    const updatedTests = tests.map(test =>
      test.id === testId ? { ...test, status: 'paused' as const } : test
    );

    onTestsChange(updatedTests);
    toast({
      title: 'Test paused',
      description: 'A/B test has been paused.',
    });
  };

  const stopTest = (testId: string) => {
    const updatedTests = tests.map(test =>
      test.id === testId ? { ...test, status: 'stopped' as const } : test
    );

    onTestsChange(updatedTests);
    toast({
      title: 'Test stopped',
      description: 'A/B test has been stopped.',
    });
  };

  const completeTest = (testId: string) => {
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    // Simulate statistical analysis
    const control = test.variants.find(v => v.isControl);
    const variant = test.variants.find(v => !v.isControl);
    
    if (!control || !variant) return;

    const controlRate = control.metrics.conversionRate;
    const variantRate = variant.metrics.conversionRate;
    const improvement = ((variantRate - controlRate) / controlRate) * 100;
    const confidence = Math.random() * 40 + 60; // 60-100%
    const significance = confidence > 95;
    const winner = variantRate > controlRate ? variant.id : control.id;

    const updatedTests = tests.map(test =>
      test.id === testId
        ? {
            ...test,
            status: 'completed' as const,
            results: {
              winner,
              confidence,
              significance,
              improvement,
              statisticalPower: Math.random() * 20 + 80,
            },
          }
        : test
    );

    onTestsChange(updatedTests);
    toast({
      title: 'Test completed',
      description: `A/B test completed with ${confidence.toFixed(1)}% confidence.`,
    });
  };

  const cloneTest = (testId: string) => {
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    const clonedTest: ABTest = {
      ...test,
      id: Math.random().toString(36).substr(2, 9),
      name: `${test.name} (Copy)`,
      status: 'draft',
      startDate: undefined,
      endDate: undefined,
      results: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variants: test.variants.map(variant => ({
        ...variant,
        id: Math.random().toString(36).substr(2, 9),
        metrics: {
          impressions: 0,
          conversions: 0,
          conversionRate: 0,
          avgResponseTime: 0,
          qualityScore: 0,
          tokenUsage: 0,
          cost: 0,
        },
      })),
    };

    onTestsChange([...tests, clonedTest]);
    toast({
      title: 'Test cloned',
      description: 'A/B test has been cloned successfully.',
    });
  };

  const deleteTest = (testId: string) => {
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    if (test.status === 'running') {
      toast({
        title: 'Cannot delete',
        description: 'Cannot delete a running test. Please stop it first.',
        variant: 'destructive',
      });
      return;
    }

    const updatedTests = tests.filter(t => t.id !== testId);
    onTestsChange(updatedTests);
    toast({
      title: 'Test deleted',
      description: 'A/B test has been deleted.',
    });
  };

  const addVariant = () => {
    const newVariant = {
      name: `Variant ${String.fromCharCode(65 + variants.length - 1)}`,
      content: '',
      weight: Math.floor(100 / (variants.length + 1)),
    };
    
    const adjustedVariants = variants.map(v => ({
      ...v,
      weight: Math.floor(100 / (variants.length + 1)),
    }));
    
    setVariants([...adjustedVariants, newVariant]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 2) return; // Minimum 2 variants
    
    const newVariants = variants.filter((_, i) => i !== index);
    const adjustedVariants = newVariants.map(v => ({
      ...v,
      weight: Math.floor(100 / newVariants.length),
    }));
    
    setVariants(adjustedVariants);
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...variants];
    (newVariants[index] as any)[field] = value;
    setVariants(newVariants);
  };

  const getStatusInfo = (status: string) => {
    return TEST_STATUSES.find(s => s.value === status) || TEST_STATUSES[0];
  };

  const getMetricInfo = (metric: string) => {
    return METRICS.find(m => m.value === metric) || METRICS[0];
  };

  const formatMetricValue = (metric: string, value: number) => {
    switch (metric) {
      case 'conversion_rate':
      case 'error_rate':
        return `${(value * 100).toFixed(2)}%`;
      case 'response_time':
        return `${value.toFixed(0)}ms`;
      case 'cost_efficiency':
        return `$${value.toFixed(4)}`;
      case 'token_efficiency':
        return value.toFixed(2);
      default:
        return value.toFixed(2);
    }
  };

  const calculateProgress = (test: ABTest) => {
    if (test.status !== 'running') return 0;
    
    const totalImpressions = test.variants.reduce((sum, v) => sum + v.metrics.impressions, 0);
    return Math.min((totalImpressions / test.targetSampleSize) * 100, 100);
  };

  const renderTestCard = (test: ABTest) => {
    const statusInfo = getStatusInfo(test.status);
    const progress = calculateProgress(test);
    const isRunning = test.status === 'running';
    const isCompleted = test.status === 'completed';
    
    return (
      <Card key={test.id} className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <CardTitle className="text-lg">{test.name}</CardTitle>
                <Badge className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
                {isCompleted && test.results?.significance && (
                  <Badge className="bg-green-100 text-green-800">
                    <Trophy className="h-3 w-3 mr-1" />
                    Significant
                  </Badge>
                )}
              </div>
              
              {test.description && (
                <CardDescription className="mb-2">
                  {test.description}
                </CardDescription>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Target className="h-4 w-4" />
                  <span>{getMetricInfo(test.primaryMetric).label}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{test.variants.length} variants</span>
                </div>
                {isRunning && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{test.duration} days</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTest(selectedTest === test.id ? null : test.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              {!readonly && (
                <>
                  {test.status === 'draft' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startTest(test.id)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {test.status === 'running' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => pauseTest(test.id)}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => completeTest(test.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  {test.status === 'paused' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startTest(test.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => stopTest(test.id)}
                      >
                        <Stop className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cloneTest(test.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  {test.status !== 'running' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTest(test.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress bar for running tests */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {test.variants.reduce((sum, v) => sum + v.metrics.impressions, 0).toLocaleString()} 
                {' / '}
                {test.targetSampleSize.toLocaleString()} samples
              </div>
            </div>
          )}
          
          {/* Hypothesis */}
          <div>
            <Label className="text-sm font-medium">Hypothesis</Label>
            <p className="text-sm text-muted-foreground mt-1">{test.hypothesis}</p>
          </div>
          
          {/* Results summary for completed tests */}
          {isCompleted && test.results && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Results</span>
                <Badge className={test.results.significance ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {test.results.confidence.toFixed(1)}% confidence
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label>Winner</Label>
                  <p className="font-medium">
                    {test.variants.find(v => v.id === test.results?.winner)?.name || 'No winner'}
                  </p>
                </div>
                <div>
                  <Label>Improvement</Label>
                  <p className={`font-medium flex items-center ${
                    test.results.improvement > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {test.results.improvement > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                    {Math.abs(test.results.improvement).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <Label>Significance</Label>
                  <p className="font-medium">
                    {test.results.significance ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Expanded view */}
          {selectedTest === test.id && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {test.variants.map((variant) => (
                  <Card key={variant.id} className={variant.isControl ? 'ring-2 ring-blue-500' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{variant.name}</CardTitle>
                        {variant.isControl && (
                          <Badge variant="outline">Control</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Impressions:</span>
                          <span className="font-medium">{variant.metrics.impressions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Conversions:</span>
                          <span className="font-medium">{variant.metrics.conversions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rate:</span>
                          <span className="font-medium">
                            {formatMetricValue(test.primaryMetric, variant.metrics.conversionRate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Time:</span>
                          <span className="font-medium">{variant.metrics.avgResponseTime.toFixed(0)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quality:</span>
                          <span className="font-medium">{variant.metrics.qualityScore.toFixed(1)}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost:</span>
                          <span className="font-medium">${variant.metrics.cost.toFixed(4)}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <Label className="text-xs">Content Preview</Label>
                        <div className="bg-muted p-2 rounded text-xs font-mono">
                          <pre className="whitespace-pre-wrap line-clamp-3">
                            {variant.content.substring(0, 100)}
                            {variant.content.length > 100 ? '...' : ''}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">A/B Testing</h3>
          <p className="text-sm text-muted-foreground">
            Test different prompt variations to optimize performance
          </p>
        </div>
        
        {!readonly && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Test
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {TEST_STATUSES.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tests list */}
      <div className="space-y-4">
        {filteredTests.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <TestTube className="mx-auto h-12 w-12 mb-4" />
                <p>No A/B tests found</p>
                <p className="text-sm">Create your first test to compare prompt variations</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTests.map(renderTestCard)
        )}
      </div>

      {/* Create/Edit Test Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? 'Edit A/B Test' : 'Create A/B Test'}
            </DialogTitle>
            <DialogDescription>
              Set up an experiment to test different prompt variations
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(createTest)} className="space-y-6">
            <Tabs defaultValue="setup" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="variants">Variants</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="setup" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Test Name</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="Descriptive test name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration (days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      {...form.register('duration', { valueAsNumber: true })}
                      min="1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="What are you testing and why?"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="hypothesis">Hypothesis</Label>
                  <Textarea
                    id="hypothesis"
                    {...form.register('hypothesis')}
                    placeholder="I believe that [change] will [result] because [reason]"
                    rows={3}
                  />
                  {form.formState.errors.hypothesis && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.hypothesis.message}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="trafficSplit">Traffic Split (%)</Label>
                    <Input
                      id="trafficSplit"
                      type="number"
                      {...form.register('trafficSplit', { valueAsNumber: true })}
                      min="1"
                      max="99"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="targetSampleSize">Target Sample Size</Label>
                    <Input
                      id="targetSampleSize"
                      type="number"
                      {...form.register('targetSampleSize', { valueAsNumber: true })}
                      min="10"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="significanceLevel">Significance Level</Label>
                    <Select
                      value={form.watch('significanceLevel').toString()}
                      onValueChange={(value) => form.setValue('significanceLevel', parseFloat(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.01">99% (α = 0.01)</SelectItem>
                        <SelectItem value="0.05">95% (α = 0.05)</SelectItem>
                        <SelectItem value="0.1">90% (α = 0.1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="variants" className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Test Variants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVariant}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Variant
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Input
                              value={variant.name}
                              onChange={(e) => updateVariant(index, 'name', e.target.value)}
                              className="w-40"
                              placeholder="Variant name"
                            />
                            {index === 0 && (
                              <Badge variant="outline">Control</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              <Label className="text-sm">Weight:</Label>
                              <Input
                                type="number"
                                value={variant.weight}
                                onChange={(e) => updateVariant(index, 'weight', parseInt(e.target.value))}
                                className="w-16"
                                min="1"
                                max="100"
                              />
                              <span className="text-sm">%</span>
                            </div>
                            
                            {variants.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVariant(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-2">
                          <Label>Content</Label>
                          <Textarea
                            value={variant.content}
                            onChange={(e) => updateVariant(index, 'content', e.target.value)}
                            placeholder="Prompt content for this variant"
                            rows={6}
                            className="font-mono"
                          />
                          
                          <div>
                            <Label>Description (Optional)</Label>
                            <Input
                              value={variant.description || ''}
                              onChange={(e) => updateVariant(index, 'description', e.target.value)}
                              placeholder="What makes this variant different?"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="metrics" className="space-y-4">
                <div>
                  <Label htmlFor="primaryMetric">Primary Metric</Label>
                  <Select
                    value={form.watch('primaryMetric')}
                    onValueChange={(value) => form.setValue('primaryMetric', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRICS.map(metric => (
                        <SelectItem key={metric.value} value={metric.value}>
                          <div>
                            <p className="font-medium">{metric.label}</p>
                            <p className="text-xs text-muted-foreground">{metric.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.primaryMetric && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.primaryMetric.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label>Secondary Metrics (Optional)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {METRICS.filter(m => m.value !== form.watch('primaryMetric')).map(metric => (
                      <div key={metric.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={metric.value}
                          checked={form.watch('secondaryMetrics').includes(metric.value)}
                          onChange={(e) => {
                            const current = form.watch('secondaryMetrics');
                            if (e.target.checked) {
                              form.setValue('secondaryMetrics', [...current, metric.value]);
                            } else {
                              form.setValue('secondaryMetrics', current.filter(m => m !== metric.value));
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={metric.value} className="text-sm">
                          {metric.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <TestTube className="h-4 w-4 mr-2" />
                {editingTest ? 'Update' : 'Create'} Test
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}