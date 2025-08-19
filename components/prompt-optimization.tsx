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
  Lightbulb,
  Zap,
  Target,
  TrendingUp,
  Brain,
  Wand2,
  CheckCircle,
  XCircle,
  Eye,
  Copy,
  Download,
  RefreshCw,
  Filter,
  Search,
  Settings,
  Info,
  AlertTriangle,
  Star,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ThumbsUp,
  ThumbsDown,
  Clock,
  DollarSign,
  Cpu,
  Hash,
  FileText,
  MessageSquare,
  Layers,
  Split,
  Merge,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Play,
  Pause,
  BarChart3,
  PieChart,
  Activity,
  Gauge,
  Globe,
  Users,
  Shield,
  Sparkles,
  Rocket,
  Flame,
  Crosshair,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const optimizationConfigSchema = z.object({
  targetModel: z.string().min(1, 'Target model is required'),
  optimizationGoals: z.array(z.string()).min(1, 'At least one goal is required'),
  priorityLevel: z.enum(['low', 'medium', 'high', 'critical']),
  constraints: z.object({
    maxTokens: z.number().min(1).optional(),
    maxCost: z.number().min(0).optional(),
    minQuality: z.number().min(0).max(10).optional(),
    responseTime: z.number().min(0).optional(),
  }),
  context: z.object({
    useCase: z.string().optional(),
    audience: z.string().optional(),
    domain: z.string().optional(),
    language: z.string().optional(),
  }),
});

type OptimizationConfigData = z.infer<typeof optimizationConfigSchema>;

export interface OptimizationSuggestion {
  id: string;
  type: 'structure' | 'clarity' | 'efficiency' | 'safety' | 'performance' | 'cost' | 'quality';
  title: string;
  description: string;
  originalText?: string;
  suggestedText: string;
  impact: {
    quality: number;
    performance: number;
    cost: number;
    safety: number;
  };
  confidence: number;
  reasoning: string;
  examples?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTimeToImplement: number; // in minutes
  relatedSuggestions?: string[];
  metrics?: {
    tokenReduction?: number;
    qualityImprovement?: number;
    speedImprovement?: number;
    costSaving?: number;
  };
  status: 'pending' | 'applied' | 'rejected' | 'reviewing';
  appliedAt?: string;
}

export interface OptimizationSession {
  id: string;
  promptId: string;
  promptContent: string;
  config: OptimizationConfigData;
  suggestions: OptimizationSuggestion[];
  status: 'analyzing' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  metrics: {
    totalSuggestions: number;
    appliedSuggestions: number;
    estimatedImprovement: number;
    processingTime: number;
  };
  aiModel: string;
  version: number;
}

interface PromptOptimizationProps {
  promptContent: string;
  currentMetrics?: {
    quality: number;
    performance: number;
    cost: number;
    safety: number;
  };
  optimizationSessions: OptimizationSession[];
  onOptimizationStart: (config: OptimizationConfigData) => Promise<OptimizationSession>;
  onSuggestionApply: (sessionId: string, suggestionId: string) => void;
  onSuggestionReject: (sessionId: string, suggestionId: string) => void;
  onContentUpdate: (newContent: string) => void;
  readonly?: boolean;
}

const OPTIMIZATION_GOALS = [
  { value: 'quality', label: 'Quality', icon: Star, description: 'Improve response quality and accuracy' },
  { value: 'clarity', label: 'Clarity', icon: Eye, description: 'Make instructions clearer and more specific' },
  { value: 'efficiency', label: 'Efficiency', icon: Zap, description: 'Reduce token usage and processing time' },
  { value: 'safety', label: 'Safety', icon: Shield, description: 'Improve safety and reduce harmful outputs' },
  { value: 'consistency', label: 'Consistency', icon: Target, description: 'Ensure consistent responses' },
  { value: 'creativity', label: 'Creativity', icon: Sparkles, description: 'Enhance creative outputs' },
  { value: 'factuality', label: 'Factuality', icon: CheckCircle, description: 'Improve factual accuracy' },
  { value: 'structure', label: 'Structure', icon: Layers, description: 'Better organize prompt structure' },
];

const SUGGESTION_TYPES = [
  { value: 'structure', label: 'Structure', icon: Layers, color: 'bg-blue-100 text-blue-800' },
  { value: 'clarity', label: 'Clarity', icon: Eye, color: 'bg-green-100 text-green-800' },
  { value: 'efficiency', label: 'Efficiency', icon: Zap, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'safety', label: 'Safety', icon: Shield, color: 'bg-red-100 text-red-800' },
  { value: 'performance', label: 'Performance', icon: Rocket, color: 'bg-purple-100 text-purple-800' },
  { value: 'cost', label: 'Cost', icon: DollarSign, color: 'bg-green-100 text-green-800' },
  { value: 'quality', label: 'Quality', icon: Star, color: 'bg-orange-100 text-orange-800' },
];

const AI_MODELS = [
  { value: 'gpt-5-2025-08-07', label: 'GPT-5', provider: 'OpenAI' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude 4 Sonnet', provider: 'Anthropic' },
  { value: 'claude-haiku-4-20250514', label: 'Claude 4 Haiku', provider: 'Anthropic' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'Google' },
];

export function PromptOptimization({
  promptContent,
  currentMetrics,
  optimizationSessions,
  onOptimizationStart,
  onSuggestionApply,
  onSuggestionReject,
  onContentUpdate,
  readonly = false,
}: PromptOptimizationProps) {
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [suggestionFilter, setSuggestionFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [showDiff, setShowDiff] = useState<string | null>(null);
  const [autoApplySettings, setAutoApplySettings] = useState({
    enabled: false,
    minConfidence: 0.8,
    maxImpact: 'medium',
  });

  const form = useForm<OptimizationConfigData>({
    resolver: zodResolver(optimizationConfigSchema),
    defaultValues: {
      targetModel: 'gpt-5-2025-08-07',
      optimizationGoals: ['quality'],
      priorityLevel: 'medium',
      constraints: {
        maxTokens: 4000,
        maxCost: 0.10,
        minQuality: 7.0,
        responseTime: 5000,
      },
      context: {
        useCase: '',
        audience: '',
        domain: '',
        language: 'english',
      },
    },
  });

  const latestSession = optimizationSessions.length > 0 ? 
    optimizationSessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0] : 
    null;

  const currentSession = selectedSession ? 
    optimizationSessions.find(s => s.id === selectedSession) : 
    latestSession;

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    if (!currentSession) return [];
    
    return currentSession.suggestions.filter(suggestion => {
      const typeMatch = suggestionFilter === 'all' || suggestion.type === suggestionFilter;
      const difficultyMatch = difficultyFilter === 'all' || suggestion.difficulty === difficultyFilter;
      return typeMatch && difficultyMatch;
    });
  }, [currentSession, suggestionFilter, difficultyFilter]);

  // Group suggestions by type
  const suggestionsByType = useMemo(() => {
    const groups: Record<string, OptimizationSuggestion[]> = {};
    filteredSuggestions.forEach(suggestion => {
      if (!groups[suggestion.type]) {
        groups[suggestion.type] = [];
      }
      groups[suggestion.type].push(suggestion);
    });
    return groups;
  }, [filteredSuggestions]);

  const startOptimization = async (config: OptimizationConfigData) => {
    try {
      const session = await onOptimizationStart(config);
      setSelectedSession(session.id);
      setShowConfigDialog(false);
      
      toast({
        title: 'Optimization started',
        description: 'AI is analyzing your prompt for improvement opportunities.',
      });
    } catch (error) {
      toast({
        title: 'Optimization failed',
        description: 'Failed to start prompt optimization. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const applySuggestion = (suggestion: OptimizationSuggestion) => {
    if (!currentSession) return;
    
    onSuggestionApply(currentSession.id, suggestion.id);
    
    // Update prompt content with suggestion
    let newContent = promptContent;
    if (suggestion.originalText && suggestion.suggestedText) {
      newContent = newContent.replace(suggestion.originalText, suggestion.suggestedText);
    } else {
      // For structural suggestions, append or modify accordingly
      newContent = suggestion.suggestedText;
    }
    
    onContentUpdate(newContent);
    
    toast({
      title: 'Suggestion applied',
      description: `Applied "${suggestion.title}" to your prompt.`,
    });
  };

  const rejectSuggestion = (suggestion: OptimizationSuggestion) => {
    if (!currentSession) return;
    
    onSuggestionReject(currentSession.id, suggestion.id);
    
    toast({
      title: 'Suggestion rejected',
      description: `Rejected "${suggestion.title}".`,
    });
  };

  const applyAllHighConfidence = () => {
    if (!currentSession) return;
    
    const highConfidenceSuggestions = currentSession.suggestions.filter(
      s => s.confidence >= autoApplySettings.minConfidence && s.status === 'pending'
    );
    
    highConfidenceSuggestions.forEach(suggestion => {
      applySuggestion(suggestion);
    });
    
    toast({
      title: 'Bulk application completed',
      description: `Applied ${highConfidenceSuggestions.length} high-confidence suggestions.`,
    });
  };

  const getSuggestionTypeInfo = (type: string) => {
    return SUGGESTION_TYPES.find(t => t.value === type) || SUGGESTION_TYPES[0];
  };

  const formatImpactScore = (score: number) => {
    if (score >= 0.8) return { text: 'High', color: 'text-green-600' };
    if (score >= 0.6) return { text: 'Medium', color: 'text-yellow-600' };
    if (score >= 0.4) return { text: 'Low', color: 'text-orange-600' };
    return { text: 'Minimal', color: 'text-gray-600' };
  };

  const renderOptimizationMetrics = () => {
    if (!currentMetrics) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Quality</span>
            </div>
            <div className="text-2xl font-bold">{currentMetrics.quality.toFixed(1)}/10</div>
            <Progress value={currentMetrics.quality * 10} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Performance</span>
            </div>
            <div className="text-2xl font-bold">{currentMetrics.performance.toFixed(1)}/10</div>
            <Progress value={currentMetrics.performance * 10} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Cost Efficiency</span>
            </div>
            <div className="text-2xl font-bold">{currentMetrics.cost.toFixed(1)}/10</div>
            <Progress value={currentMetrics.cost * 10} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Safety</span>
            </div>
            <div className="text-2xl font-bold">{currentMetrics.safety.toFixed(1)}/10</div>
            <Progress value={currentMetrics.safety * 10} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSuggestionCard = (suggestion: OptimizationSuggestion) => {
    const typeInfo = getSuggestionTypeInfo(suggestion.type);
    const isApplied = suggestion.status === 'applied';
    const isRejected = suggestion.status === 'rejected';
    
    return (
      <Card key={suggestion.id} className={`${isApplied ? 'bg-green-50 border-green-200' : ''} ${isRejected ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <typeInfo.icon className="h-4 w-4" />
                <CardTitle className="text-base">{suggestion.title}</CardTitle>
                <Badge className={typeInfo.color}>
                  {typeInfo.label}
                </Badge>
                <Badge variant="outline" className={`${
                  suggestion.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                  suggestion.difficulty === 'medium' ? 'border-yellow-500 text-yellow-700' :
                  'border-red-500 text-red-700'
                }`}>
                  {suggestion.difficulty}
                </Badge>
              </div>
              
              <CardDescription>{suggestion.description}</CardDescription>
            </div>
            
            <div className="flex items-center space-x-1">
              <Badge variant="secondary">
                {(suggestion.confidence * 100).toFixed(0)}% confidence
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiff(showDiff === suggestion.id ? null : suggestion.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Impact metrics */}
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="text-center">
              <div className={`font-semibold ${formatImpactScore(suggestion.impact.quality).color}`}>
                {formatImpactScore(suggestion.impact.quality).text}
              </div>
              <div className="text-xs text-muted-foreground">Quality</div>
            </div>
            <div className="text-center">
              <div className={`font-semibold ${formatImpactScore(suggestion.impact.performance).color}`}>
                {formatImpactScore(suggestion.impact.performance).text}
              </div>
              <div className="text-xs text-muted-foreground">Performance</div>
            </div>
            <div className="text-center">
              <div className={`font-semibold ${formatImpactScore(suggestion.impact.cost).color}`}>
                {formatImpactScore(suggestion.impact.cost).text}
              </div>
              <div className="text-xs text-muted-foreground">Cost</div>
            </div>
            <div className="text-center">
              <div className={`font-semibold ${formatImpactScore(suggestion.impact.safety).color}`}>
                {formatImpactScore(suggestion.impact.safety).text}
              </div>
              <div className="text-xs text-muted-foreground">Safety</div>
            </div>
          </div>
          
          {/* Reasoning */}
          <div className="bg-muted p-3 rounded-lg">
            <Label className="text-sm font-medium">AI Reasoning</Label>
            <p className="text-sm mt-1">{suggestion.reasoning}</p>
          </div>
          
          {/* Estimated metrics improvement */}
          {suggestion.metrics && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {suggestion.metrics.tokenReduction && (
                <div className="flex items-center space-x-2">
                  <Hash className="h-3 w-3" />
                  <span>-{suggestion.metrics.tokenReduction} tokens</span>
                </div>
              )}
              {suggestion.metrics.qualityImprovement && (
                <div className="flex items-center space-x-2">
                  <ArrowUp className="h-3 w-3 text-green-600" />
                  <span>+{(suggestion.metrics.qualityImprovement * 100).toFixed(1)}% quality</span>
                </div>
              )}
              {suggestion.metrics.speedImprovement && (
                <div className="flex items-center space-x-2">
                  <Zap className="h-3 w-3 text-blue-600" />
                  <span>-{suggestion.metrics.speedImprovement}ms response time</span>
                </div>
              )}
              {suggestion.metrics.costSaving && (
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span>-${suggestion.metrics.costSaving.toFixed(4)} cost</span>
                </div>
              )}
            </div>
          )}
          
          {/* Diff view */}
          {showDiff === suggestion.id && suggestion.originalText && (
            <div className="border rounded-lg p-3 bg-background">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-red-600">- Original</Label>
                  <div className="bg-red-50 p-2 rounded text-sm font-mono border border-red-200">
                    {suggestion.originalText}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-green-600">+ Suggested</Label>
                  <div className="bg-green-50 p-2 rounded text-sm font-mono border border-green-200">
                    {suggestion.suggestedText}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Examples */}
          {suggestion.examples && suggestion.examples.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Examples</Label>
              <div className="mt-1 space-y-1">
                {suggestion.examples.map((example, index) => (
                  <div key={index} className="text-sm bg-muted p-2 rounded">
                    {example}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          {!readonly && suggestion.status === 'pending' && (
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Button
                onClick={() => applySuggestion(suggestion)}
                size="sm"
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Apply
              </Button>
              <Button
                variant="outline"
                onClick={() => rejectSuggestion(suggestion)}
                size="sm"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                variant="ghost"
                size="sm"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {isApplied && (
            <div className="flex items-center space-x-2 pt-2 border-t text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Applied</span>
              {suggestion.appliedAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(suggestion.appliedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
          
          {isRejected && (
            <div className="flex items-center space-x-2 pt-2 border-t text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Rejected</span>
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
          <h3 className="text-lg font-semibold">AI Optimization</h3>
          <p className="text-sm text-muted-foreground">
            Get AI-powered suggestions to improve your prompt
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {currentSession && currentSession.status === 'analyzing' && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Cpu className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analyzing...</span>
            </div>
          )}
          
          {!readonly && (
            <Button onClick={() => setShowConfigDialog(true)}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Optimize Prompt
            </Button>
          )}
        </div>
      </div>

      {/* Current metrics */}
      {renderOptimizationMetrics()}

      {/* Session summary */}
      {currentSession && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Optimization Session</span>
                <Badge className={
                  currentSession.status === 'completed' ? 'bg-green-100 text-green-800' :
                  currentSession.status === 'analyzing' ? 'bg-blue-100 text-blue-800' :
                  currentSession.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {currentSession.status}
                </Badge>
              </CardTitle>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {currentSession.aiModel}
                </span>
                {currentSession.status === 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyAllHighConfidence}
                    disabled={readonly}
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    Apply High Confidence
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Label>Total Suggestions</Label>
                <div className="text-2xl font-bold">{currentSession.metrics.totalSuggestions}</div>
              </div>
              <div>
                <Label>Applied</Label>
                <div className="text-2xl font-bold text-green-600">{currentSession.metrics.appliedSuggestions}</div>
              </div>
              <div>
                <Label>Est. Improvement</Label>
                <div className="text-2xl font-bold text-blue-600">
                  {(currentSession.metrics.estimatedImprovement * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <Label>Processing Time</Label>
                <div className="text-2xl font-bold">{currentSession.metrics.processingTime.toFixed(1)}s</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {currentSession && currentSession.suggestions.length > 0 && (
        <div className="flex items-center space-x-4">
          <Select value={suggestionFilter} onValueChange={setSuggestionFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {SUGGESTION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center space-x-2">
                    <type.icon className="h-4 w-4" />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All difficulties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="text-sm text-muted-foreground">
            {filteredSuggestions.length} of {currentSession.suggestions.length} suggestions
          </div>
        </div>
      )}

      {/* Suggestions */}
      {currentSession && currentSession.status === 'completed' && (
        <Tabs defaultValue="grouped" className="w-full">
          <TabsList>
            <TabsTrigger value="grouped">Grouped by Type</TabsTrigger>
            <TabsTrigger value="priority">By Priority</TabsTrigger>
            <TabsTrigger value="impact">By Impact</TabsTrigger>
          </TabsList>
          
          <TabsContent value="grouped" className="space-y-6">
            {Object.entries(suggestionsByType).map(([type, suggestions]) => {
              const typeInfo = getSuggestionTypeInfo(type);
              
              return (
                <div key={type}>
                  <div className="flex items-center space-x-2 mb-4">
                    <typeInfo.icon className="h-5 w-5" />
                    <h4 className="text-lg font-semibold">{typeInfo.label}</h4>
                    <Badge variant="outline">{suggestions.length}</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    {suggestions.map(renderSuggestionCard)}
                  </div>
                </div>
              );
            })}
          </TabsContent>
          
          <TabsContent value="priority" className="space-y-4">
            {filteredSuggestions
              .sort((a, b) => b.confidence - a.confidence)
              .map(renderSuggestionCard)}
          </TabsContent>
          
          <TabsContent value="impact" className="space-y-4">
            {filteredSuggestions
              .sort((a, b) => {
                const aImpact = (a.impact.quality + a.impact.performance + a.impact.cost + a.impact.safety) / 4;
                const bImpact = (b.impact.quality + b.impact.performance + b.impact.cost + b.impact.safety) / 4;
                return bImpact - aImpact;
              })
              .map(renderSuggestionCard)}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {!currentSession && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Lightbulb className="mx-auto h-12 w-12 mb-4" />
              <p>No optimization sessions yet</p>
              <p className="text-sm">Start an optimization to get AI-powered suggestions for improving your prompt</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Optimization</DialogTitle>
            <DialogDescription>
              Set your optimization goals and constraints to get tailored suggestions
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(startOptimization)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetModel">Target Model</Label>
                <Select
                  value={form.watch('targetModel')}
                  onValueChange={(value) => form.setValue('targetModel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        <div>
                          <p className="font-medium">{model.label}</p>
                          <p className="text-xs text-muted-foreground">{model.provider}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priorityLevel">Priority Level</Label>
                <Select
                  value={form.watch('priorityLevel')}
                  onValueChange={(value: any) => form.setValue('priorityLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Basic improvements</SelectItem>
                    <SelectItem value="medium">Medium - Balanced optimization</SelectItem>
                    <SelectItem value="high">High - Aggressive optimization</SelectItem>
                    <SelectItem value="critical">Critical - Maximum optimization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Optimization Goals</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {OPTIMIZATION_GOALS.map(goal => (
                  <div key={goal.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={goal.value}
                      checked={form.watch('optimizationGoals').includes(goal.value)}
                      onChange={(e) => {
                        const current = form.watch('optimizationGoals');
                        if (e.target.checked) {
                          form.setValue('optimizationGoals', [...current, goal.value]);
                        } else {
                          form.setValue('optimizationGoals', current.filter(g => g !== goal.value));
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={goal.value} className="text-sm">
                      <div className="flex items-center space-x-2">
                        <goal.icon className="h-4 w-4" />
                        <span>{goal.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{goal.description}</p>
                    </Label>
                  </div>
                ))}
              </div>
              {form.formState.errors.optimizationGoals && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.optimizationGoals.message}
                </p>
              )}
            </div>
            
            <div>
              <Label>Constraints</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    {...form.register('constraints.maxTokens', { valueAsNumber: true })}
                    placeholder="4000"
                  />
                </div>
                <div>
                  <Label htmlFor="maxCost">Max Cost ($)</Label>
                  <Input
                    id="maxCost"
                    type="number"
                    step="0.01"
                    {...form.register('constraints.maxCost', { valueAsNumber: true })}
                    placeholder="0.10"
                  />
                </div>
                <div>
                  <Label htmlFor="minQuality">Min Quality (1-10)</Label>
                  <Input
                    id="minQuality"
                    type="number"
                    min="1"
                    max="10"
                    {...form.register('constraints.minQuality', { valueAsNumber: true })}
                    placeholder="7.0"
                  />
                </div>
                <div>
                  <Label htmlFor="responseTime">Max Response Time (ms)</Label>
                  <Input
                    id="responseTime"
                    type="number"
                    {...form.register('constraints.responseTime', { valueAsNumber: true })}
                    placeholder="5000"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfigDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Brain className="h-4 w-4 mr-2" />
                Start Optimization
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}