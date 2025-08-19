'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDefaultModel, getModelConfigs } from '@/lib/models/config';
import {
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  Target,
  Layers,
  MoreHorizontal,
  RefreshCw,
  Settings,
  FileText,
  Bot,
  FileCode,
  Webhook,
  Edit,
  ExternalLink
} from 'lucide-react';

interface ContextItem {
  id: string;
  name: string;
  type: 'prompt' | 'agent' | 'rule' | 'template';
  status: 'active' | 'idle' | 'processing' | 'optimizing';
  health: 'excellent' | 'good' | 'warning' | 'critical';
  lastUsed: string;
  usageCount: number;
  tokenCount?: number;
  efficiency?: number;
  content: string;
  updatedAt: Date;
}

interface ActiveContext {
  id: string;
  name: string;
  items: ContextItem[];
  model: string;
  totalTokens: number;
  estimatedCost: number;
  lastActivity: string;
}

interface SmartContextBoardProps {
  userId?: string;
}

export function SmartContextBoard({ userId }: SmartContextBoardProps) {
  const router = useRouter();
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [activeContexts, setActiveContexts] = useState<ActiveContext[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultModel = getDefaultModel();

  useEffect(() => {
    fetchContextData();
  }, [userId]);

  const handleItemClick = (item: ContextItem) => {
    // Navigate to the item's edit page using the dynamic route structure
    router.push(`/dashboard/${item.type}s/${item.id}/edit`);
  };

  const fetchContextData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real items from database
      const response = await fetch('/api/items');
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      
      const data = await response.json();
      const items = data.items || [];
      
      // Group items by type to create "contexts"
      const groupedContexts = createContextsFromItems(items);
      setActiveContexts(groupedContexts);
      
      // Generate recommendations based on real data
      const generatedRecommendations = generateRecommendations(items);
      setRecommendations(generatedRecommendations);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load context data');
      console.error('Error fetching context data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createContextsFromItems = (items: any[]): ActiveContext[] => {
    if (!items?.length) return [];

    // Group by type
    const groupedByType = items.reduce((acc, item) => {
      const type = item.type || 'prompt';
      if (!acc[type]) acc[type] = [];
      acc[type].push({
        id: item.id,
        name: item.name,
        type: item.type,
        status: getItemStatus(item),
        health: getItemHealth(item),
        lastUsed: formatRelativeTime(item.updatedAt),
        usageCount: 0, // TODO: Implement real usage tracking from database
        tokenCount: estimateTokenCount(item.content),
        efficiency: calculateEfficiency(item),
        content: item.content,
        updatedAt: new Date(item.updatedAt)
      });
      return acc;
    }, {} as Record<string, ContextItem[]>);

    // Create contexts from groups
    return Object.entries(groupedByType).map(([type, typeItems]) => {
      const totalTokens = typeItems.reduce((sum, item) => sum + (item.tokenCount || 0), 0);
      const estimatedCost = (totalTokens * defaultModel.cost) / 1000;
      
      return {
        id: type,
        name: getContextName(type),
        items: typeItems.slice(0, 5), // Show top 5 items
        model: defaultModel.name,
        totalTokens,
        estimatedCost,
        lastActivity: getMostRecentActivity(typeItems)
      };
    });
  };

  const getItemStatus = (item: any): 'active' | 'idle' | 'processing' | 'optimizing' => {
    const hoursSinceUpdate = (Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 1) return 'active';
    if (hoursSinceUpdate < 24) return 'idle';
    return 'idle';
  };

  const getItemHealth = (item: any): 'excellent' | 'good' | 'warning' | 'critical' => {
    const contentLength = item.content?.length || 0;
    if (contentLength > 2000) return 'excellent';
    if (contentLength > 500) return 'good';
    if (contentLength > 100) return 'warning';
    return 'critical';
  };

  const estimateTokenCount = (content: string): number => {
    // Rough estimation: ~4 characters per token
    return Math.ceil((content?.length || 0) / 4);
  };

  const calculateEfficiency = (item: any): number => {
    const contentLength = item.content?.length || 0;
    const hasDescription = !!item.description;
    const hasTags = item.tags?.length > 0;
    
    let score = 70; // Base score
    if (contentLength > 500) score += 10;
    if (contentLength > 1000) score += 10;
    if (hasDescription) score += 5;
    if (hasTags) score += 5;
    
    return Math.min(100, score);
  };

  const getContextName = (type: string): string => {
    const names = {
      prompt: 'Prompt Collection',
      agent: 'AI Agents',
      rule: 'Rule Sets',
      template: 'Templates'
    };
    return names[type as keyof typeof names] || `${type} Context`;
  };

  const getMostRecentActivity = (items: ContextItem[]): string => {
    const mostRecent = items.reduce((latest, item) => {
      return item.updatedAt > latest.updatedAt ? item : latest;
    }, items[0]);
    
    return formatRelativeTime(mostRecent.updatedAt);
  };

  const formatRelativeTime = (date: Date | string): string => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  const generateRecommendations = (items: any[]) => {
    const recommendations = [];
    
    // Check for items with low content
    const lowContentItems = items.filter(item => (item.content?.length || 0) < 100);
    if (lowContentItems.length > 0) {
      recommendations.push({
        id: 'low-content',
        type: 'optimization',
        title: 'Enhance Content',
        description: `${lowContentItems.length} items have minimal content`,
        impact: 'medium',
        action: 'Add more detailed descriptions'
      });
    }

    // Check for duplicate names
    const nameGroups = items.reduce((acc, item) => {
      const name = item.name.toLowerCase();
      if (!acc[name]) acc[name] = [];
      acc[name].push(item);
      return acc;
    }, {});
    
    const duplicates = Object.values(nameGroups).filter((group: any) => group.length > 1);
    if (duplicates.length > 0) {
      recommendations.push({
        id: 'duplicates',
        type: 'duplicate',
        title: 'Duplicate Items Detected',
        description: `${duplicates.length} groups of similar items found`,
        impact: 'low',
        action: 'Review and merge duplicates'
      });
    }

    // Suggest model upgrades
    recommendations.push({
      id: 'model-upgrade',
      type: 'upgrade',
      title: 'Model Updates Available',
      description: 'Using latest AI models for better performance',
      impact: 'high',
      action: `Currently using ${defaultModel.name}`
    });

    return recommendations;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prompt': return <FileText className="h-4 w-4" />;
      case 'agent': return <Bot className="h-4 w-4" />;
      case 'rule': return <FileCode className="h-4 w-4" />;
      case 'template': return <Webhook className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'optimizing': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading context data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Error loading context data: {error}</span>
          </div>
          <Button onClick={fetchContextData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center space-x-2">
            <Brain className="h-6 w-6" />
            <span>Smart Context Board</span>
          </h2>
          <p className="text-muted-foreground">Monitor active AI contexts and optimize your workflow</p>
        </div>
        <Button variant="outline" onClick={fetchContextData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="contexts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contexts">Active Contexts</TabsTrigger>
          <TabsTrigger value="health">Health Monitor</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="contexts" className="space-y-4">
          {activeContexts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Contexts</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating some prompts, agents, rules, or templates to see your contexts here.
                </p>
                <Button onClick={() => router.push('/dashboard/import')}>
                  <Layers className="h-4 w-4 mr-2" />
                  Import Items
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeContexts.map((context) => (
                <Card key={context.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{context.name}</CardTitle>
                      <Badge variant="outline">{context.model}</Badge>
                    </div>
                    <CardDescription>
                      {context.items.length} items • {context.totalTokens.toLocaleString()} tokens • ${context.estimatedCost.toFixed(4)}
                    </CardDescription>
                    <div className="text-sm text-muted-foreground">
                      Last activity: {context.lastActivity}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {context.items.slice(0, 3).map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => handleItemClick(item)}
                          className="group flex items-center justify-between p-2 bg-accent/50 rounded cursor-pointer hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                            {getTypeIcon(item.type)}
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">{item.efficiency}%</span>
                            {getHealthIcon(item.health)}
                            <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                      {context.items.length > 3 && (
                        <button 
                          onClick={() => router.push(`/dashboard/${context.id}`)}
                          className="text-xs text-muted-foreground text-center w-full hover:text-primary transition-colors"
                        >
                          +{context.items.length - 3} more items (click to view all)
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Overall health of your AI context system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Context Efficiency</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={85} className="w-24" />
                    <span className="text-sm font-medium">85%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Contexts</span>
                  <span className="text-sm font-medium">{activeContexts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Items</span>
                  <span className="text-sm font-medium">
                    {activeContexts.reduce((sum, ctx) => sum + ctx.items.length, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-4">
            {recommendations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Good!</h3>
                  <p className="text-muted-foreground">No recommendations at this time.</p>
                </CardContent>
              </Card>
            ) : (
              recommendations.map((rec) => (
                <Card key={rec.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{rec.title}</CardTitle>
                      <Badge variant={rec.impact === 'high' ? 'destructive' : rec.impact === 'medium' ? 'default' : 'secondary'}>
                        {rec.impact} impact
                      </Badge>
                    </div>
                    <CardDescription>{rec.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{rec.action}</span>
                      <Button size="sm">Apply</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}