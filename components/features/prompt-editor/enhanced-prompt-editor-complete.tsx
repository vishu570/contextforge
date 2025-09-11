'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  X, 
  Eye, 
  Clock, 
  AlertTriangle, 
  History, 
  GitBranch,
  Settings,
  FileText,
  Play,
  Copy,
  Download,
  Upload,
  Code2,
  Zap,
  BarChart3,
  Users,
  MessageSquare,
  Calculator,
  TestTube,
  Target,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Split,
  RefreshCw,
  Compare,
  TrendingUp,
  TrendingDown,
  Hash,
  DollarSign,
  Brain,
  Sparkles,
  CheckCircle,
  Share,
  Star,
  ThumbsUp,
  ThumbsDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Search,
  Calendar,
  User,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ModelSelector, ModelSelection } from '../llm/model-selector';
import { FunctionAttachmentSystem, FunctionDefinition } from '../functions/function-attachment-system';

// Dynamically import Monaco Editor
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-muted rounded-md flex items-center justify-center">
      Loading advanced editor...
    </div>
  ),
});

// Enhanced schema with all features
const enhancedPromptSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    defaultValue: z.any().optional(),
    required: z.boolean(),
    description: z.string().optional(),
  })),
  modelConfigs: z.array(z.object({
    modelId: z.string(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    systemPrompt: z.string().optional(),
  })),
  attachedFunctions: z.array(z.string()),
  metadata: z.object({
    version: z.string(),
    isPublic: z.boolean(),
    collaborators: z.array(z.string()),
    performance: z.object({
      avgTokens: z.number(),
      avgCost: z.number(),
      avgScore: z.number(),
    }).optional(),
  }),
});

type EnhancedPromptFormData = z.infer<typeof enhancedPromptSchema>;

interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue?: any;
  required: boolean;
  description?: string;
}

interface Version {
  id: string;
  versionNumber: string;
  content: string;
  changes: string;
  createdAt: string;
  createdBy: string;
  approved: boolean;
  performance?: {
    avgTokens: number;
    avgCost: number;
    avgScore: number;
  };
  abTests?: ABTest[];
}

interface ABTest {
  id: string;
  name: string;
  variantA: string;
  variantB: string;
  trafficSplit: number;
  metrics: {
    variantA: { impressions: number; conversions: number; score: number };
    variantB: { impressions: number; conversions: number; score: number };
  };
  status: 'draft' | 'running' | 'completed';
  winner?: 'A' | 'B';
}

interface CollaboratorComment {
  id: string;
  user: string;
  content: string;
  position?: { line: number; column: number };
  resolved: boolean;
  createdAt: string;
  replies: Array<{
    id: string;
    user: string;
    content: string;
    createdAt: string;
  }>;
}

interface OptimizationSuggestion {
  id: string;
  type: 'performance' | 'cost' | 'clarity' | 'structure';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedChange: string;
  estimatedImpact: {
    costReduction?: number;
    performanceImprovement?: number;
    clarityScore?: number;
  };
  applied: boolean;
}

interface AnalyticsData {
  usage: {
    totalTests: number;
    avgTokensPerTest: number;
    avgCostPerTest: number;
    successRate: number;
  };
  performance: {
    avgResponseTime: number;
    avgQualityScore: number;
    topModels: Array<{ modelId: string; score: number }>;
  };
  trends: {
    daily: Array<{ date: string; tests: number; cost: number }>;
    popular: Array<{ tag: string; count: number }>;
  };
}

interface EnhancedPromptEditorProps {
  initialData?: Partial<EnhancedPromptFormData>;
  onSave?: (data: EnhancedPromptFormData) => Promise<void>;
  onCancel?: () => void;
  readonly?: boolean;
  collaborative?: boolean;
  showTesting?: boolean;
  showAnalytics?: boolean;
  promptId?: string;
}

export function EnhancedPromptEditorComplete({
  initialData,
  onSave,
  onCancel,
  readonly = false,
  collaborative = true,
  showTesting = true,
  showAnalytics = true,
  promptId
}: EnhancedPromptEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [splitView, setSplitView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Variables and functions
  const [variables, setVariables] = useState<PromptVariable[]>(initialData?.variables || []);
  const [attachedFunctions, setAttachedFunctions] = useState<string[]>(initialData?.attachedFunctions || []);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [editingVariable, setEditingVariable] = useState<PromptVariable | null>(null);
  
  // Versioning
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionChanges, setVersionChanges] = useState('');
  
  // A/B Testing
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [showAbTestDialog, setShowAbTestDialog] = useState(false);
  const [newAbTest, setNewAbTest] = useState<Partial<ABTest>>({});
  
  // Collaboration
  const [comments, setComments] = useState<CollaboratorComment[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>(['user@example.com']);
  const [newComment, setNewComment] = useState('');
  const [showCollaboration, setShowCollaboration] = useState(false);
  
  // Analytics
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([]);
  
  // Model configurations
  const [modelConfigs, setModelConfigs] = useState<ModelSelection[]>([
    { modelId: 'gpt-5-2025-08-07', temperature: 0.7, maxTokens: 1000 }
  ]);
  
  // Performance metrics
  const [tokenCount, setTokenCount] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  
  const editorRef = useRef<any>(null);
  
  const form = useForm<EnhancedPromptFormData>({
    resolver: zodResolver(enhancedPromptSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      description: initialData?.description || '',
      category: initialData?.category || '',
      tags: initialData?.tags || [],
      variables: variables,
      modelConfigs: modelConfigs,
      attachedFunctions: attachedFunctions,
      metadata: {
        version: currentVersion,
        isPublic: false,
        collaborators: collaborators,
        performance: {
          avgTokens: 0,
          avgCost: 0,
          avgScore: 0,
        },
        ...initialData?.metadata,
      },
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedContent = watch('content');

  // Load data on mount
  useEffect(() => {
    loadVersionHistory();
    loadAnalyticsData();
    loadOptimizationSuggestions();
    loadComments();
    loadAbTests();
  }, [promptId]);

  // Token counting and cost estimation
  const calculateMetrics = useCallback((text: string) => {
    const tokens = Math.ceil(text.length / 4);
    setTokenCount(tokens);
    
    // Calculate cost across all configured models
    const totalCost = modelConfigs.reduce((sum, config) => {
      return sum + ((tokens / 1000) * 0.003); // Simplified cost calculation
    }, 0);
    setEstimatedCost(totalCost);
    
    // Calculate quality score based on content length, structure, etc.
    const score = Math.min(100, (text.length / 10) + (text.split('\n').length * 2));
    setQualityScore(score);
  }, [modelConfigs]);

  useEffect(() => {
    calculateMetrics(watchedContent);
  }, [watchedContent, calculateMetrics]);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!watchedContent || readonly) return;
    
    try {
      setAutoSaveStatus('saving');
      await new Promise(resolve => setTimeout(resolve, 500));
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (error) {
      setAutoSaveStatus('error');
    }
  }, [watchedContent, readonly]);

  useEffect(() => {
    const timer = setTimeout(autoSave, 2000);
    return () => clearTimeout(timer);
  }, [autoSave]);

  // Load functions
  const loadVersionHistory = async () => {
    // Mock data - in real implementation, fetch from API
    const mockVersions: Version[] = [
      {
        id: 'v1',
        versionNumber: '1.0.0',
        content: 'Initial version',
        changes: 'Created prompt',
        createdAt: new Date().toISOString(),
        createdBy: 'user@example.com',
        approved: true,
        performance: { avgTokens: 150, avgCost: 0.0045, avgScore: 85 }
      }
    ];
    setVersions(mockVersions);
  };

  const loadAnalyticsData = async () => {
    // Mock analytics data
    const mockAnalytics: AnalyticsData = {
      usage: {
        totalTests: 47,
        avgTokensPerTest: 245,
        avgCostPerTest: 0.0073,
        successRate: 94.5
      },
      performance: {
        avgResponseTime: 2340,
        avgQualityScore: 87.3,
        topModels: [
          { modelId: 'gpt-5-2025-08-07', score: 91.2 },
          { modelId: 'claude-sonnet-4-20250514', score: 88.7 }
        ]
      },
      trends: {
        daily: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          tests: Math.floor(Math.random() * 20) + 5,
          cost: Math.random() * 0.5
        })),
        popular: [
          { tag: 'ai-analysis', count: 23 },
          { tag: 'creative-writing', count: 18 },
          { tag: 'code-review', count: 15 }
        ]
      }
    };
    setAnalyticsData(mockAnalytics);
  };

  const loadOptimizationSuggestions = async () => {
    const mockSuggestions: OptimizationSuggestion[] = [
      {
        id: 'opt1',
        type: 'cost',
        priority: 'high',
        title: 'Reduce token usage',
        description: 'Your prompt could be more concise while maintaining effectiveness',
        suggestedChange: 'Remove redundant instructions and combine similar sections',
        estimatedImpact: { costReduction: 15 },
        applied: false
      },
      {
        id: 'opt2',
        type: 'performance',
        priority: 'medium',
        title: 'Improve structure',
        description: 'Better organization could improve model understanding',
        suggestedChange: 'Use numbered lists and clear section headers',
        estimatedImpact: { performanceImprovement: 12 },
        applied: false
      }
    ];
    setOptimizationSuggestions(mockSuggestions);
  };

  const loadComments = async () => {
    const mockComments: CollaboratorComment[] = [
      {
        id: 'c1',
        user: 'reviewer@example.com',
        content: 'Consider adding more specific examples here',
        position: { line: 5, column: 10 },
        resolved: false,
        createdAt: new Date().toISOString(),
        replies: []
      }
    ];
    setComments(mockComments);
  };

  const loadAbTests = async () => {
    const mockAbTests: ABTest[] = [
      {
        id: 'ab1',
        name: 'Instruction Clarity Test',
        variantA: 'Original version with detailed instructions',
        variantB: 'Simplified version with bullet points',
        trafficSplit: 50,
        metrics: {
          variantA: { impressions: 120, conversions: 89, score: 74.2 },
          variantB: { impressions: 118, conversions: 95, score: 80.5 }
        },
        status: 'running',
        winner: 'B'
      }
    ];
    setAbTests(mockAbTests);
  };

  // Event handlers
  const onSubmit = async (data: EnhancedPromptFormData) => {
    setIsLoading(true);
    try {
      if (onSave) {
        await onSave({
          ...data,
          variables,
          attachedFunctions,
          modelConfigs,
          metadata: {
            ...data.metadata,
            version: currentVersion,
            collaborators,
            performance: {
              avgTokens: tokenCount,
              avgCost: estimatedCost,
              avgScore: qualityScore,
            }
          }
        });
        toast({
          title: 'Success',
          description: 'Prompt saved successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save prompt',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    const newVersion: Version = {
      id: `v${Date.now()}`,
      versionNumber: currentVersion,
      content: watchedContent,
      changes: versionChanges,
      createdAt: new Date().toISOString(),
      createdBy: 'current-user@example.com',
      approved: false
    };
    
    setVersions([newVersion, ...versions]);
    setShowVersionDialog(false);
    setVersionChanges('');
    
    toast({
      title: 'Version Created',
      description: `Version ${currentVersion} has been created`
    });
  };

  const handleCreateAbTest = () => {
    if (!newAbTest.name || !newAbTest.variantA || !newAbTest.variantB) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    const abTest: ABTest = {
      id: `ab${Date.now()}`,
      name: newAbTest.name!,
      variantA: newAbTest.variantA!,
      variantB: newAbTest.variantB!,
      trafficSplit: newAbTest.trafficSplit || 50,
      metrics: {
        variantA: { impressions: 0, conversions: 0, score: 0 },
        variantB: { impressions: 0, conversions: 0, score: 0 }
      },
      status: 'draft'
    };

    setAbTests([...abTests, abTest]);
    setShowAbTestDialog(false);
    setNewAbTest({});

    toast({
      title: 'A/B Test Created',
      description: 'Your A/B test has been created successfully'
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: CollaboratorComment = {
      id: `c${Date.now()}`,
      user: 'current-user@example.com',
      content: newComment,
      resolved: false,
      createdAt: new Date().toISOString(),
      replies: []
    };

    setComments([...comments, comment]);
    setNewComment('');
    
    toast({
      title: 'Comment Added',
      description: 'Your comment has been added'
    });
  };

  const applyOptimizationSuggestion = (suggestionId: string) => {
    const suggestion = optimizationSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    // Apply the suggested change to the content
    // In a real implementation, this would intelligently modify the content
    setValue('content', watchedContent + '\n\n[Applied optimization: ' + suggestion.title + ']');
    
    // Mark as applied
    setOptimizationSuggestions(prev => 
      prev.map(s => s.id === suggestionId ? { ...s, applied: true } : s)
    );

    toast({
      title: 'Optimization Applied',
      description: suggestion.title
    });
  };

  const exportPrompt = (format: 'json' | 'yaml' | 'markdown') => {
    const data = getValues();
    let content = '';

    switch (format) {
      case 'json':
        content = JSON.stringify({
          ...data,
          variables,
          attachedFunctions,
          modelConfigs,
          versions,
          abTests: abTests.filter(test => test.status === 'completed'),
          analytics: analyticsData
        }, null, 2);
        break;
      case 'yaml':
        // Simplified YAML export
        content = `title: ${data.title}\ncontent: |\n  ${data.content.split('\n').map(line => '  ' + line).join('\n')}`;
        break;
      case 'markdown':
        content = `# ${data.title}\n\n${data.description}\n\n## Content\n\n${data.content}`;
        break;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title.replace(/\s+/g, '-').toLowerCase()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : ''}`}>
      {/* Auto-save status */}
      {autoSaveStatus && (
        <Alert className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {autoSaveStatus === 'saving' && 'Auto-saving...'}
            {autoSaveStatus === 'saved' && 'Auto-saved successfully'}
            {autoSaveStatus === 'error' && 'Auto-save failed'}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              {...form.register('title')}
              placeholder="Prompt title..."
              className="text-lg font-semibold border-none p-0 shadow-none focus:ring-0"
              disabled={readonly}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Metrics */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Hash className="h-4 w-4" />
                <span>{tokenCount}</span>
              </div>
              <div className="flex items-center space-x-1">
                <DollarSign className="h-4 w-4" />
                <span>${estimatedCost.toFixed(4)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Target className="h-4 w-4" />
                <span>{qualityScore.toFixed(1)}</span>
              </div>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Controls */}
            <Button
              type="button"
              variant={splitView ? "default" : "outline"}
              size="sm"
              onClick={() => setSplitView(!splitView)}
            >
              <Split className="h-4 w-4" />
            </Button>
            
            <Button
              type="button"
              variant={isFullscreen ? "default" : "outline"}
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            <Select onValueChange={(value) => exportPrompt(value as any)}>
              <SelectTrigger className="w-32">
                <Download className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="yaml">YAML</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="functions">Functions</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="collaborate">Collaborate</TabsTrigger>
          </TabsList>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-6">
            <div className={splitView ? "grid grid-cols-2 gap-6" : ""}>
              <Card>
                <CardHeader>
                  <CardTitle>Prompt Editor</CardTitle>
                  <CardDescription>Write and edit your prompt content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      {...form.register('description')}
                      placeholder="Brief description of this prompt..."
                      rows={2}
                      disabled={readonly}
                    />
                  </div>
                  
                  <div>
                    <Label>Content</Label>
                    <div className="mt-2 border rounded-md overflow-hidden">
                      <MonacoEditor
                        height="500px"
                        language="markdown"
                        value={watch('content')}
                        onChange={(value) => setValue('content', value || '')}
                        options={{
                          minimap: { enabled: false },
                          wordWrap: 'on',
                          lineNumbers: 'on',
                          theme: 'vs-dark',
                          readOnly: readonly,
                          fontSize: 14,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Input
                        {...form.register('category')}
                        placeholder="e.g., Analysis, Creative, Code Review"
                        disabled={readonly}
                      />
                    </div>
                    
                    <div>
                      <Label>Tags</Label>
                      <Input
                        value={watch('tags')?.join(', ') || ''}
                        onChange={(e) => setValue('tags', 
                          e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                        )}
                        placeholder="ai, analysis, productivity"
                        disabled={readonly}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {splitView && (
                <Card>
                  <CardHeader>
                    <CardTitle>Live Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-lg min-h-[500px]">
                      <h3 className="text-lg font-semibold mb-4">
                        {watch('title') || 'Untitled Prompt'}
                      </h3>
                      <pre className="whitespace-pre-wrap text-sm">
                        {watch('content')}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Variables Tab */}
          <TabsContent value="variables">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Variables</CardTitle>
                    <CardDescription>Define template variables for your prompt</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingVariable(null);
                      setShowVariableDialog(true);
                    }}
                    disabled={readonly}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Variable
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {variables.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No variables defined. Variables allow you to create reusable prompts.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variables.map((variable, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline">{variable.name}</Badge>
                              <Badge variant="secondary">{variable.type}</Badge>
                              {variable.required && (
                                <Badge variant="destructive">Required</Badge>
                              )}
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingVariable(variable);
                                  setShowVariableDialog(true);
                                }}
                                disabled={readonly}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setVariables(variables.filter((_, i) => i !== index));
                                }}
                                disabled={readonly}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {variable.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {variable.description}
                            </p>
                          )}
                          
                          {variable.defaultValue && (
                            <div className="text-xs mt-2">
                              <span className="font-medium">Default: </span>
                              <code className="bg-muted px-1 rounded">
                                {JSON.stringify(variable.defaultValue)}
                              </code>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Functions Tab */}
          <TabsContent value="functions">
            <FunctionAttachmentSystem
              promptId={promptId}
              attachedFunctions={attachedFunctions}
              onFunctionsChange={setAttachedFunctions}
              allowCustomFunctions={!readonly}
              showTesting={showTesting}
            />
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models">
            <div className="space-y-6">
              {modelConfigs.map((config, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Model Configuration {index + 1}</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setModelConfigs(modelConfigs.filter((_, i) => i !== index));
                        }}
                        disabled={readonly}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ModelSelector
                      selectedModel={config}
                      onModelSelect={(selection) => {
                        const updated = [...modelConfigs];
                        updated[index] = selection;
                        setModelConfigs(updated);
                      }}
                      showAdvancedOptions={true}
                      showCostEstimation={true}
                      estimatedTokens={tokenCount}
                    />
                  </CardContent>
                </Card>
              ))}
              
              <Button
                variant="outline"
                onClick={() => {
                  setModelConfigs([...modelConfigs, {
                    modelId: 'gpt-5-2025-08-07',
                    temperature: 0.7,
                    maxTokens: 1000
                  }]);
                }}
                disabled={readonly}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Model Configuration
              </Button>
            </div>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing">
            <Card>
              <CardHeader>
                <CardTitle>Prompt Testing</CardTitle>
                <CardDescription>
                  Test your prompt with different models and configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TestTube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Testing functionality is integrated with the main testing playground
                  </p>
                  <Button variant="outline">
                    Open Testing Playground
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Version History</CardTitle>
                    <CardDescription>Track changes and manage versions</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowVersionDialog(true)}
                    disabled={readonly}
                  >
                    <GitBranch className="h-4 w-4 mr-1" />
                    Create Version
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {versions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No versions created yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {versions.map((version) => (
                      <Card key={version.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{version.versionNumber}</Badge>
                                <span className="text-sm font-medium">
                                  {version.changes}
                                </span>
                                {version.approved && (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                By {version.createdBy} • {new Date(version.createdAt).toLocaleString()}
                              </div>
                            </div>
                            
                            {version.performance && (
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <div>{version.performance.avgTokens} tokens</div>
                                <div>${version.performance.avgCost.toFixed(4)}</div>
                                <div>{version.performance.avgScore.toFixed(1)} score</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {analyticsData && (
                <>
                  {/* Usage Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Usage Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {analyticsData.usage.totalTests}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Tests</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {analyticsData.usage.avgTokensPerTest}
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Tokens</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            ${analyticsData.usage.avgCostPerTest.toFixed(4)}
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Cost</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {analyticsData.usage.successRate}%
                          </div>
                          <div className="text-xs text-muted-foreground">Success Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Optimization Suggestions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Optimization Suggestions</CardTitle>
                      <CardDescription>AI-powered suggestions to improve your prompt</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {optimizationSuggestions.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No optimization suggestions at this time
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {optimizationSuggestions.map((suggestion) => (
                            <Card key={suggestion.id} className={suggestion.applied ? 'opacity-60' : ''}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Badge variant={
                                        suggestion.priority === 'high' ? 'destructive' :
                                        suggestion.priority === 'medium' ? 'default' : 'secondary'
                                      }>
                                        {suggestion.priority}
                                      </Badge>
                                      <Badge variant="outline">{suggestion.type}</Badge>
                                    </div>
                                    <h4 className="font-medium mb-1">{suggestion.title}</h4>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {suggestion.description}
                                    </p>
                                    <p className="text-sm bg-muted p-2 rounded">
                                      {suggestion.suggestedChange}
                                    </p>
                                    
                                    {suggestion.estimatedImpact && (
                                      <div className="flex items-center space-x-4 mt-2 text-xs">
                                        {suggestion.estimatedImpact.costReduction && (
                                          <div className="flex items-center space-x-1 text-green-600">
                                            <TrendingDown className="h-3 w-3" />
                                            <span>{suggestion.estimatedImpact.costReduction}% cost</span>
                                          </div>
                                        )}
                                        {suggestion.estimatedImpact.performanceImprovement && (
                                          <div className="flex items-center space-x-1 text-blue-600">
                                            <TrendingUp className="h-3 w-3" />
                                            <span>{suggestion.estimatedImpact.performanceImprovement}% performance</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyOptimizationSuggestion(suggestion.id)}
                                    disabled={suggestion.applied || readonly}
                                  >
                                    {suggestion.applied ? 'Applied' : 'Apply'}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* Collaboration Tab */}
          <TabsContent value="collaborate">
            <div className="space-y-6">
              {/* Comments */}
              <Card>
                <CardHeader>
                  <CardTitle>Comments</CardTitle>
                  <CardDescription>Collaborate with your team</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Add Comment */}
                    <div className="flex space-x-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={2}
                        disabled={readonly}
                      />
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || readonly}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    {/* Comments List */}
                    {comments.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No comments yet
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="bg-muted p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{comment.user}</Badge>
                                {comment.position && (
                                  <Badge variant="secondary" className="text-xs">
                                    Line {comment.position.line}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                            
                            {!comment.resolved && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  setComments(comments.map(c => 
                                    c.id === comment.id ? { ...c, resolved: true } : c
                                  ));
                                }}
                                disabled={readonly}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolve
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Collaborators */}
              <Card>
                <CardHeader>
                  <CardTitle>Collaborators</CardTitle>
                  <CardDescription>Manage team access</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {collaborators.map((collaborator, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span className="text-sm">{collaborator}</span>
                        </div>
                        <Badge variant="outline">Editor</Badge>
                      </div>
                    ))}
                    
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add collaborator email..."
                        className="flex-1"
                        disabled={readonly}
                      />
                      <Button variant="outline" disabled={readonly}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        {!readonly && (
          <div className="flex items-center justify-between border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
              >
                <Share className="mr-2 h-4 w-4" />
                Share
              </Button>

              <Button
                type="submit"
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save Prompt'}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Dialogs */}
      
      {/* Variable Dialog */}
      <Dialog open={showVariableDialog} onOpenChange={setShowVariableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariable ? 'Edit Variable' : 'Add Variable'}
            </DialogTitle>
            <DialogDescription>
              Define a template variable for your prompt
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Variable Name</Label>
              <Input placeholder="variable_name" />
            </div>
            
            <div>
              <Label>Type</Label>
              <Select defaultValue="string">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                  <SelectItem value="object">Object</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea placeholder="What this variable represents..." rows={2} />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch />
              <Label>Required</Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowVariableDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowVariableDialog(false)}>
                {editingVariable ? 'Update' : 'Add'} Variable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Create a new version of your prompt
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Version Number</Label>
              <Input
                value={currentVersion}
                onChange={(e) => setCurrentVersion(e.target.value)}
                placeholder="1.1.0"
              />
            </div>
            
            <div>
              <Label>Changes</Label>
              <Textarea
                value={versionChanges}
                onChange={(e) => setVersionChanges(e.target.value)}
                placeholder="Describe what changed in this version..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowVersionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateVersion}>
                Create Version
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}