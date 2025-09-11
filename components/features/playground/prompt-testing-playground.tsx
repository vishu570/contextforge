'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Square,
  RefreshCw,
  Save,
  Download,
  Upload,
  GitCompare,
  BarChart3,
  Clock,
  DollarSign,
  Gauge,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Eye,
  Code2,
  FileText,
  Share,
  Copy,
  Trash2,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Split,
  Filter,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Hash,
  Users,
  Globe,
  Brain
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getModelConfigs, ModelConfig } from '@/lib/models/config';
import { ModelSelector, ModelSelection } from '../llm/model-selector';
import dynamic from 'next/dynamic';

// Dynamically import Monaco Editor
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-muted rounded-md flex items-center justify-center">
      Loading editor...
    </div>
  ),
});

interface TestRun {
  id: string;
  prompt: string;
  models: ModelSelection[];
  timestamp: string;
  results: TestResult[];
  variables?: Record<string, any>;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  cost?: number;
}

interface TestResult {
  modelId: string;
  response: string;
  tokens: number;
  cost: number;
  duration: number;
  timestamp: string;
  metrics: {
    relevance: number;
    coherence: number;
    completeness: number;
    creativity: number;
  };
  error?: string;
}

interface ComparisonMetrics {
  avgTokens: number;
  avgCost: number;
  avgDuration: number;
  bestModel: string;
  costEfficient: string;
  fastest: string;
}

interface PromptTestingPlaygroundProps {
  initialPrompt?: string;
  onSave?: (testRun: TestRun) => void;
}

export function PromptTestingPlayground({
  initialPrompt,
  onSave
}: PromptTestingPlaygroundProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [selectedModels, setSelectedModels] = useState<ModelSelection[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [currentRun, setCurrentRun] = useState<TestRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [showVariables, setShowVariables] = useState(false);
  const [splitView, setSplitView] = useState(true);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedRunsForComparison, setSelectedRunsForComparison] = useState<string[]>([]);
  const [autoAnalysis, setAutoAnalysis] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Load saved test runs
    const savedRuns = localStorage.getItem('contextforge-test-runs');
    if (savedRuns) {
      setTestRuns(JSON.parse(savedRuns));
    }

    // Set default models
    const defaultModels = getModelConfigs().slice(0, 2).map(model => ({
      modelId: model.id,
      temperature: 0.7,
      maxTokens: 1000
    }));
    setSelectedModels(defaultModels);
  }, []);

  const saveTestRuns = (runs: TestRun[]) => {
    localStorage.setItem('contextforge-test-runs', JSON.stringify(runs));
    setTestRuns(runs);
  };

  const extractVariables = (promptText: string): string[] => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(promptText)) !== null) {
      variables.push(match[1].trim());
    }
    
    return [...new Set(variables)];
  };

  const interpolatePrompt = (promptText: string, vars: Record<string, any>): string => {
    let interpolated = promptText;
    
    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      interpolated = interpolated.replace(regex, String(value));
    });
    
    return interpolated;
  };

  const calculateTokens = (text: string): number => {
    // Simplified token calculation (4 chars ≈ 1 token)
    return Math.ceil(text.length / 4);
  };

  const calculateCost = (tokens: number, modelId: string): number => {
    const models = getModelConfigs();
    const model = models.find(m => m.id === modelId);
    if (!model) return 0;
    
    return (tokens / 1000) * model.cost;
  };

  const simulateModelResponse = async (
    prompt: string, 
    modelSelection: ModelSelection,
    abortSignal: AbortSignal
  ): Promise<TestResult> => {
    const startTime = Date.now();
    const models = getModelConfigs();
    const model = models.find(m => m.id === modelSelection.modelId);
    
    if (!model) {
      throw new Error(`Model ${modelSelection.modelId} not found`);
    }

    // Simulate API delay
    const delay = Math.random() * 3000 + 1000; // 1-4 seconds
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, delay);
      abortSignal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Request aborted'));
      });
    });

    if (abortSignal.aborted) {
      throw new Error('Request aborted');
    }

    // Generate mock response
    const responses = [
      "Based on your prompt, I would suggest implementing a comprehensive approach that considers multiple factors and stakeholder perspectives.",
      "The solution requires careful analysis of the requirements and a step-by-step implementation strategy.",
      "Here's my detailed response addressing the key points in your prompt with practical recommendations.",
      "After analyzing your request, I recommend the following approach with specific action items and considerations.",
      "The prompt raises important questions that deserve a thorough and nuanced response with multiple perspectives."
    ];

    const mockResponse = responses[Math.floor(Math.random() * responses.length)] + 
      ` This response was generated by ${model.name} with temperature ${modelSelection.temperature}.`;

    const tokens = calculateTokens(mockResponse);
    const cost = calculateCost(tokens, modelSelection.modelId);
    const duration = Date.now() - startTime;

    // Generate mock metrics
    const metrics = {
      relevance: Math.random() * 0.3 + 0.7, // 0.7-1.0
      coherence: Math.random() * 0.2 + 0.8, // 0.8-1.0
      completeness: Math.random() * 0.4 + 0.6, // 0.6-1.0
      creativity: modelSelection.temperature || 0.7 > 0.8 ? Math.random() * 0.2 + 0.8 : Math.random() * 0.6 + 0.4
    };

    return {
      modelId: modelSelection.modelId,
      response: mockResponse,
      tokens,
      cost,
      duration,
      timestamp: new Date().toISOString(),
      metrics
    };
  };

  const runTest = async () => {
    if (!prompt.trim() || selectedModels.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt and select at least one model',
        variant: 'destructive'
      });
      return;
    }

    setIsRunning(true);
    abortControllerRef.current = new AbortController();
    
    const interpolatedPrompt = interpolatePrompt(prompt, variables);
    const testRun: TestRun = {
      id: `test-${Date.now()}`,
      prompt: interpolatedPrompt,
      models: selectedModels,
      timestamp: new Date().toISOString(),
      results: [],
      variables: { ...variables },
      status: 'running'
    };

    setCurrentRun(testRun);

    try {
      const results = await Promise.all(
        selectedModels.map(modelSelection => 
          simulateModelResponse(interpolatedPrompt, modelSelection, abortControllerRef.current!.signal)
        )
      );

      const completedRun = {
        ...testRun,
        results,
        status: 'completed' as const,
        duration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
        cost: results.reduce((sum, r) => sum + r.cost, 0)
      };

      setCurrentRun(completedRun);
      const updatedRuns = [completedRun, ...testRuns];
      saveTestRuns(updatedRuns);

      if (onSave) {
        onSave(completedRun);
      }

      toast({
        title: 'Test Completed',
        description: `Generated responses from ${selectedModels.length} model(s)`
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Request aborted') {
        toast({
          title: 'Test Cancelled',
          description: 'Test execution was cancelled'
        });
      } else {
        const failedRun = {
          ...testRun,
          status: 'failed' as const
        };
        setCurrentRun(failedRun);
        
        toast({
          title: 'Test Failed',
          description: 'An error occurred during test execution',
          variant: 'destructive'
        });
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const stopTest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const addModel = () => {
    const availableModels = getModelConfigs();
    const usedModelIds = selectedModels.map(m => m.modelId);
    const availableModel = availableModels.find(m => !usedModelIds.includes(m.id));
    
    if (availableModel) {
      setSelectedModels([...selectedModels, {
        modelId: availableModel.id,
        temperature: 0.7,
        maxTokens: 1000
      }]);
    }
  };

  const removeModel = (index: number) => {
    setSelectedModels(selectedModels.filter((_, i) => i !== index));
  };

  const updateModel = (index: number, updates: Partial<ModelSelection>) => {
    const updated = selectedModels.map((model, i) => 
      i === index ? { ...model, ...updates } : model
    );
    setSelectedModels(updated);
  };

  const calculateComparisonMetrics = (results: TestResult[]): ComparisonMetrics => {
    if (results.length === 0) {
      return {
        avgTokens: 0,
        avgCost: 0,
        avgDuration: 0,
        bestModel: '',
        costEfficient: '',
        fastest: ''
      };
    }

    const avgTokens = results.reduce((sum, r) => sum + r.tokens, 0) / results.length;
    const avgCost = results.reduce((sum, r) => sum + r.cost, 0) / results.length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    // Find best performing models
    const bestModel = results.reduce((best, current) => {
      const bestScore = (best.metrics.relevance + best.metrics.coherence + best.metrics.completeness) / 3;
      const currentScore = (current.metrics.relevance + current.metrics.coherence + current.metrics.completeness) / 3;
      return currentScore > bestScore ? current : best;
    }).modelId;

    const costEfficient = results.reduce((best, current) => 
      current.cost < best.cost ? current : best
    ).modelId;

    const fastest = results.reduce((best, current) => 
      current.duration < best.duration ? current : best
    ).modelId;

    return {
      avgTokens,
      avgCost,
      avgDuration,
      bestModel,
      costEfficient,
      fastest
    };
  };

  const exportResults = () => {
    if (!currentRun) return;
    
    const exportData = {
      prompt: currentRun.prompt,
      timestamp: currentRun.timestamp,
      results: currentRun.results,
      variables: currentRun.variables,
      metrics: calculateComparisonMetrics(currentRun.results)
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt-test-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getModelBadgeColor = (modelId: string) => {
    const model = getModelConfigs().find(m => m.id === modelId);
    if (!model) return 'bg-gray-100 text-gray-800';
    
    switch (model.provider) {
      case 'anthropic': return 'bg-purple-100 text-purple-800';
      case 'openai': return 'bg-green-100 text-green-800';
      case 'google': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Extract variables from prompt
  const promptVariables = extractVariables(prompt);
  const hasVariables = promptVariables.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prompt Testing Playground</h2>
          <p className="text-muted-foreground">
            Test your prompts across multiple AI models and compare results
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSplitView(!splitView)}
          >
            <Split className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportResults}
            disabled={!currentRun}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setComparisonMode(!comparisonMode)}
          >
            <GitCompare className="h-4 w-4 mr-1" />
            Compare
          </Button>
        </div>
      </div>

      <div className={splitView ? "grid grid-cols-2 gap-6" : "space-y-6"}>
        {/* Left Panel: Configuration */}
        <div className="space-y-6">
          {/* Prompt Input */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Prompt</CardTitle>
                {hasVariables && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVariables(!showVariables)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Variables ({promptVariables.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <MonacoEditor
                height="300px"
                language="markdown"
                value={prompt}
                onChange={(value) => setPrompt(value || '')}
                options={{
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  folding: true,
                  fontSize: 14,
                  theme: 'vs-dark'
                }}
              />
              
              {hasVariables && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Found variables: {promptVariables.map(v => `{{${v}}}`).join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Variables */}
          {hasVariables && showVariables && (
            <Card>
              <CardHeader>
                <CardTitle>Variables</CardTitle>
                <CardDescription>Set values for prompt variables</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {promptVariables.map(variable => (
                  <div key={variable}>
                    <Label>{variable}</Label>
                    <Input
                      value={variables[variable] || ''}
                      onChange={(e) => setVariables(prev => ({
                        ...prev,
                        [variable]: e.target.value
                      }))}
                      placeholder={`Enter value for ${variable}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Model Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Models</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addModel}
                  disabled={selectedModels.length >= getModelConfigs().length}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Model
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedModels.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No models selected. Add a model to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedModels.map((modelSelection, index) => {
                    const model = getModelConfigs().find(m => m.id === modelSelection.modelId);
                    return (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Badge className={getModelBadgeColor(modelSelection.modelId)}>
                              {model?.name || modelSelection.modelId}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ${model?.cost || 0}/1K tokens
                            </span>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeModel(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Temperature</Label>
                            <Slider
                              value={[modelSelection.temperature || 0.7]}
                              onValueChange={(value) => updateModel(index, { temperature: value[0] })}
                              min={0}
                              max={2}
                              step={0.1}
                              className="mt-2"
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                              {modelSelection.temperature || 0.7}
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Max Tokens</Label>
                            <Input
                              type="number"
                              value={modelSelection.maxTokens || 1000}
                              onChange={(e) => updateModel(index, { 
                                maxTokens: parseInt(e.target.value) || 1000 
                              })}
                              className="mt-2 h-8"
                              min={1}
                              max={model?.maxTokens || 8192}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Test Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button
                  onClick={runTest}
                  disabled={isRunning || !prompt.trim() || selectedModels.length === 0}
                  className="flex-1"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Test
                    </>
                  )}
                </Button>
                
                {isRunning && (
                  <Button variant="destructive" onClick={stopTest}>
                    <Square className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={autoAnalysis}
                    onCheckedChange={(checked) => setAutoAnalysis(checked === true)}
                  />
                  <Label className="text-sm">Auto-analysis</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={realTimeUpdates}
                    onCheckedChange={(checked) => setRealTimeUpdates(checked === true)}
                  />
                  <Label className="text-sm">Real-time updates</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Results */}
        <div className="space-y-6">
          {/* Current Test Status */}
          {currentRun && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Test Results</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={currentRun.status === 'completed' ? 'default' : 
                                  currentRun.status === 'failed' ? 'destructive' : 'secondary'}>
                      {currentRun.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(currentRun.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isRunning && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Testing {selectedModels.length} model(s)...</span>
                      <span>{Math.round((currentRun.results.length / selectedModels.length) * 100)}%</span>
                    </div>
                    <Progress value={(currentRun.results.length / selectedModels.length) * 100} />
                  </div>
                )}
                
                {currentRun.status === 'completed' && (
                  <div className="space-y-6">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {currentRun.results.reduce((sum, r) => sum + r.tokens, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Tokens</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          ${currentRun.cost?.toFixed(4) || '0.0000'}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Cost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(currentRun.duration || 0)}ms
                        </div>
                        <div className="text-xs text-muted-foreground">Avg Duration</div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Individual Results */}
                    <div className="space-y-4">
                      {currentRun.results.map((result, index) => {
                        const model = getModelConfigs().find(m => m.id === result.modelId);
                        return (
                          <Card key={index}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <Badge className={getModelBadgeColor(result.modelId)}>
                                  {model?.name || result.modelId}
                                </Badge>
                                
                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                  <div className="flex items-center space-x-1">
                                    <Hash className="h-3 w-3" />
                                    <span>{result.tokens}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>${result.cost.toFixed(4)}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{result.duration}ms</span>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="bg-muted p-3 rounded-lg">
                                  <ScrollArea className="max-h-32">
                                    <p className="text-sm whitespace-pre-wrap">
                                      {result.response}
                                    </p>
                                  </ScrollArea>
                                </div>
                                
                                {/* Metrics */}
                                <div className="grid grid-cols-4 gap-2">
                                  {Object.entries(result.metrics).map(([metric, value]) => (
                                    <div key={metric} className="text-center">
                                      <div className="text-sm font-medium">
                                        {Math.round(value * 100)}%
                                      </div>
                                      <div className="text-xs text-muted-foreground capitalize">
                                        {metric}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Test History */}
          {testRuns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test History</CardTitle>
                <CardDescription>Previous test runs and results</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {testRuns.slice(0, 10).map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => setCurrentRun(run)}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium truncate">
                            {run.prompt.substring(0, 50)}...
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(run.timestamp).toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {run.results.length} models
                          </Badge>
                          <Badge
                            variant={run.status === 'completed' ? 'default' : 
                                   run.status === 'failed' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {run.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}