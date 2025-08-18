'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
// Removed drag-and-drop dependency for simplicity
import {
  FileText,
  Bot,
  FileCode,
  Webhook,
  Plus,
  Trash2,
  Eye,
  Zap,
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Copy,
  Save,
  Play,
  BarChart3
} from 'lucide-react';

interface ContextItem {
  id: string;
  name: string;
  type: 'prompt' | 'agent' | 'rule' | 'template';
  content: string;
  tokenCount: number;
  efficiency: number;
  lastUsed: string;
  tags: string[];
  isOptimized?: boolean;
}

interface ModelPreview {
  id: string;
  name: string;
  maxTokens: number;
  costPer1k: number;
  strengths: string[];
  recommendations: string[];
}

interface VisualContextBuilderProps {
  availableItems?: ContextItem[];
  onContextSave?: (context: ContextItem[], metadata: any) => void;
}

export function VisualContextBuilder({ 
  availableItems = [],
  onContextSave 
}: VisualContextBuilderProps) {
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('claude-3.5-sonnet');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Mock data for demonstration
  const mockAvailableItems: ContextItem[] = availableItems.length > 0 ? availableItems : [
    {
      id: '1',
      name: 'React Component Prompt',
      type: 'prompt',
      content: 'Create React functional components with TypeScript...',
      tokenCount: 340,
      efficiency: 92,
      lastUsed: '2 hours ago',
      tags: ['React', 'TypeScript', 'Components'],
      isOptimized: true
    },
    {
      id: '2',
      name: 'Code Review Agent',
      type: 'agent',
      content: 'You are a senior software engineer reviewing code...',
      tokenCount: 1200,
      efficiency: 88,
      lastUsed: '1 day ago',
      tags: ['Code Review', 'Quality', 'Security']
    },
    {
      id: '3',
      name: 'TypeScript Best Practices',
      type: 'rule',
      content: 'Follow these TypeScript coding standards...',
      tokenCount: 680,
      efficiency: 76,
      lastUsed: '3 days ago',
      tags: ['TypeScript', 'Standards', 'Best Practices']
    },
    {
      id: '4',
      name: 'API Documentation Template',
      type: 'template',
      content: 'Template for generating API documentation...',
      tokenCount: 520,
      efficiency: 85,
      lastUsed: '1 week ago',
      tags: ['API', 'Documentation', 'Template']
    },
    {
      id: '5',
      name: 'Error Handling Patterns',
      type: 'rule',
      content: 'Consistent error handling strategies...',
      tokenCount: 450,
      efficiency: 82,
      lastUsed: '2 days ago',
      tags: ['Error Handling', 'Patterns', 'Reliability']
    },
    {
      id: '6',
      name: 'Testing Strategy Agent',
      type: 'agent',
      content: 'You are a QA expert designing test strategies...',
      tokenCount: 950,
      efficiency: 90,
      lastUsed: '5 hours ago',
      tags: ['Testing', 'QA', 'Strategy']
    }
  ];

  const models: ModelPreview[] = [
    {
      id: 'claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      maxTokens: 200000,
      costPer1k: 0.003,
      strengths: ['Code analysis', 'Complex reasoning', 'Long context'],
      recommendations: ['Add code examples', 'Include architectural context']
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      maxTokens: 128000,
      costPer1k: 0.01,
      strengths: ['Creative writing', 'Problem solving', 'Math'],
      recommendations: ['Optimize for token efficiency', 'Use structured prompts']
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      maxTokens: 128000,
      costPer1k: 0.005,
      strengths: ['Multimodal', 'Fast responses', 'General purpose'],
      recommendations: ['Include visual context', 'Structured outputs']
    }
  ];

  const selectedModelData = models.find(m => m.id === selectedModel);
  const totalTokens = contextItems.reduce((sum, item) => sum + item.tokenCount, 0);
  const estimatedCost = (totalTokens * (selectedModelData?.costPer1k || 0)) / 1000;
  const averageEfficiency = contextItems.length > 0 
    ? contextItems.reduce((sum, item) => sum + item.efficiency, 0) / contextItems.length 
    : 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prompt': return <FileText className="h-4 w-4" />;
      case 'agent': return <Bot className="h-4 w-4" />;
      case 'rule': return <FileCode className="h-4 w-4" />;
      case 'template': return <Webhook className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'prompt': return 'bg-blue-500';
      case 'agent': return 'bg-purple-500';
      case 'rule': return 'bg-green-500';
      case 'template': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 80) return 'text-blue-600';
    if (efficiency >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const addToContext = useCallback((item: ContextItem) => {
    if (!contextItems.find(contextItem => contextItem.id === item.id)) {
      setContextItems(prev => [...prev, item]);
    }
  }, [contextItems]);

  const moveItemUp = (index: number) => {
    if (index > 0) {
      const items = [...contextItems];
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
      setContextItems(items);
    }
  };

  const moveItemDown = (index: number) => {
    if (index < contextItems.length - 1) {
      const items = [...contextItems];
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
      setContextItems(items);
    }
  };

  const removeFromContext = (itemId: string) => {
    setContextItems(prev => prev.filter(item => item.id !== itemId));
  };

  const duplicateItem = (itemId: string) => {
    const item = contextItems.find(i => i.id === itemId);
    if (item) {
      const duplicated = {
        ...item,
        id: `${item.id}-copy`,
        name: `${item.name} (Copy)`
      };
      setContextItems(prev => [...prev, duplicated]);
    }
  };

  const getQualityScore = () => {
    if (contextItems.length === 0) return 0;
    
    let score = averageEfficiency;
    
    // Bonus for variety
    const types = new Set(contextItems.map(item => item.type));
    if (types.size > 1) score += 5;
    if (types.size > 2) score += 5;
    
    // Penalty for too many items
    if (contextItems.length > 8) score -= 10;
    
    // Bonus for optimized items
    const optimizedCount = contextItems.filter(item => item.isOptimized).length;
    score += (optimizedCount / contextItems.length) * 10;
    
    return Math.min(100, Math.max(0, score));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Visual Context Builder</h2>
          <p className="text-muted-foreground">
            Click items to add them to your AI context and build visually
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={isPreviewMode ? 'default' : 'outline'}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {isPreviewMode ? 'Edit Mode' : 'Preview'}
          </Button>
          <Button onClick={() => onContextSave?.(contextItems, { model: selectedModel })}>
            <Save className="mr-2 h-4 w-4" />
            Save Context
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Available Items */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Available Items</span>
            </CardTitle>
            <CardDescription>
              Click items to add them to your context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2 p-2">
                {mockAvailableItems
                  .filter(item => !contextItems.find(contextItem => contextItem.id === item.id))
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => addToContext(item)}
                      className="p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:bg-accent/50"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${getTypeColor(item.type)}`} />
                        {getTypeIcon(item.type)}
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.tokenCount} tokens</span>
                        <span className={getEfficiencyColor(item.efficiency)}>
                          {item.efficiency}%
                        </span>
                      </div>
                      {item.isOptimized && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Optimized
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Context Builder */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Context Assembly</span>
            </CardTitle>
            <CardDescription>
              {contextItems.length} items • {totalTokens.toLocaleString()} tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-96 p-4 border-2 border-dashed rounded-lg border-muted-foreground/25">
              {contextItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Click items from the left to build your context</p>
                </div>
              ) : (
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {contextItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-3 bg-card border rounded-lg hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              #{index + 1}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${getTypeColor(item.type)}`} />
                            {getTypeIcon(item.type)}
                            <span className="font-medium text-sm">{item.name}</span>
                          </div>
                          <div className="flex space-x-1">
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveItemUp(index)}
                                title="Move up"
                              >
                                ↑
                              </Button>
                            )}
                            {index < contextItems.length - 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveItemDown(index)}
                                title="Move down"
                              >
                                ↓
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateItem(item.id)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromContext(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {item.tokenCount} tokens
                          </span>
                          <span className={getEfficiencyColor(item.efficiency)}>
                            {item.efficiency}% efficient
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>

          {/* Model Preview & Analytics */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Model Preview</span>
              </CardTitle>
              <CardDescription>
                {selectedModelData?.name} optimization insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Model</label>
                <div className="grid gap-2">
                  {models.map((model) => (
                    <Button
                      key={model.id}
                      variant={selectedModel === model.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedModel(model.id)}
                      className="justify-start h-auto p-3"
                    >
                      <div className="text-left">
                        <p className="font-medium">{model.name}</p>
                        <p className="text-xs opacity-70">
                          {model.maxTokens.toLocaleString()} max tokens
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Metrics */}
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Token Usage</span>
                    </span>
                    <span className="text-sm font-medium">
                      {totalTokens.toLocaleString()}/{selectedModelData?.maxTokens.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(totalTokens / (selectedModelData?.maxTokens || 1)) * 100} 
                    className="h-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Est. Cost</span>
                  </span>
                  <span className="text-sm font-medium">${estimatedCost.toFixed(4)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Quality Score</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{getQualityScore().toFixed(0)}%</span>
                    {getQualityScore() >= 80 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Recommendations */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Recommendations</label>
                <div className="space-y-2">
                  {selectedModelData?.recommendations.map((rec, index) => (
                    <div key={index} className="text-xs p-2 bg-accent rounded text-muted-foreground">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button className="w-full" disabled={contextItems.length === 0}>
                  <Play className="mr-2 h-4 w-4" />
                  Test Context
                </Button>
                <Button variant="outline" className="w-full" disabled={contextItems.length === 0}>
                  <Zap className="mr-2 h-4 w-4" />
                  Optimize
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}