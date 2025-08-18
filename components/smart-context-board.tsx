'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Settings
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
  activeContexts?: ActiveContext[];
  recommendations?: Array<{
    id: string;
    type: 'optimization' | 'duplicate' | 'missing' | 'upgrade';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    action: string;
  }>;
}

export function SmartContextBoard({ 
  activeContexts = [], 
  recommendations = [] 
}: SmartContextBoardProps) {
  const [selectedContext, setSelectedContext] = useState<string | null>(null);

  // Mock data for demonstration
  const mockActiveContexts: ActiveContext[] = activeContexts.length > 0 ? activeContexts : [
    {
      id: '1',
      name: 'Web Development Context',
      model: 'Claude-3.5-Sonnet',
      totalTokens: 15420,
      estimatedCost: 0.23,
      lastActivity: '2 minutes ago',
      items: [
        {
          id: '1',
          name: 'React Component Prompt',
          type: 'prompt',
          status: 'active',
          health: 'excellent',
          lastUsed: '2 minutes ago',
          usageCount: 24,
          tokenCount: 340,
          efficiency: 92
        },
        {
          id: '2',
          name: 'Code Review Agent',
          type: 'agent',
          status: 'processing',
          health: 'good',
          lastUsed: '5 minutes ago',
          usageCount: 12,
          tokenCount: 1200,
          efficiency: 88
        },
        {
          id: '3',
          name: 'TypeScript Rules',
          type: 'rule',
          status: 'idle',
          health: 'warning',
          lastUsed: '1 hour ago',
          usageCount: 8,
          tokenCount: 680,
          efficiency: 76
        }
      ]
    },
    {
      id: '2',
      name: 'Data Analysis Pipeline',
      model: 'GPT-4-Turbo',
      totalTokens: 8900,
      estimatedCost: 0.18,
      lastActivity: '15 minutes ago',
      items: [
        {
          id: '4',
          name: 'Python Data Analysis',
          type: 'template',
          status: 'active',
          health: 'excellent',
          lastUsed: '15 minutes ago',
          usageCount: 31,
          tokenCount: 890,
          efficiency: 95
        }
      ]
    }
  ];

  const mockRecommendations = recommendations.length > 0 ? recommendations : [
    {
      id: '1',
      type: 'optimization',
      title: 'Optimize TypeScript Rules',
      description: 'Remove redundant rules and merge similar patterns',
      impact: 'medium',
      action: 'Reduce token count by ~30%'
    },
    {
      id: '2',
      type: 'duplicate',
      title: 'Duplicate prompts detected',
      description: '3 similar React component prompts found',
      impact: 'low',
      action: 'Merge into single template'
    },
    {
      id: '3',
      type: 'upgrade',
      title: 'Model compatibility',
      description: 'Some prompts can benefit from newer model features',
      impact: 'high',
      action: 'Upgrade to Claude-3.5'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-4 w-4 text-green-500" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'optimizing': return <Zap className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'duplicate': return <Layers className="h-4 w-4 text-yellow-500" />;
      case 'missing': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'upgrade': return <Target className="h-4 w-4 text-purple-500" />;
      default: return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Smart Context Board</h2>
          <p className="text-muted-foreground">
            Monitor active AI contexts and optimize your workflow
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Configure
        </Button>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Contexts</TabsTrigger>
          <TabsTrigger value="health">Health Monitor</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {mockActiveContexts.map((context) => (
              <Card 
                key={context.id} 
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                  selectedContext === context.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedContext(context.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{context.name}</CardTitle>
                    <Badge variant="outline">{context.model}</Badge>
                  </div>
                  <CardDescription className="flex items-center space-x-2">
                    <span>{context.items.length} items</span>
                    <span>•</span>
                    <span>{context.totalTokens.toLocaleString()} tokens</span>
                    <span>•</span>
                    <span>${context.estimatedCost}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last activity</span>
                    <span>{context.lastActivity}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {context.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-accent/30">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(item.status)}
                          <span className="text-sm font-medium">{item.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs ${getHealthColor(item.health)}`}>
                            {item.efficiency}%
                          </span>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {context.items.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{context.items.length - 3} more items
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">98%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All systems operational
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Token Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">87%</span>
                </div>
                <Progress value={87} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Above average performance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">2</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Require attention
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Context Health Details</CardTitle>
              <CardDescription>
                Detailed health metrics for your active contexts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActiveContexts.map((context) => (
                  <div key={context.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{context.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {context.items.length} items • {context.totalTokens} tokens
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">Efficiency</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(context.items.reduce((sum, item) => sum + (item.efficiency || 0), 0) / context.items.length)}%
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-4">
            {mockRecommendations.map((rec) => (
              <Card key={rec.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getRecommendationIcon(rec.type)}
                      <div className="space-y-1">
                        <p className="font-medium">{rec.title}</p>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={rec.impact === 'high' ? 'destructive' : rec.impact === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {rec.impact} impact
                          </Badge>
                          <span className="text-xs text-muted-foreground">{rec.action}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Dismiss
                      </Button>
                      <Button size="sm">
                        Apply
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}