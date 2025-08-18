'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  RefreshCw,
  User,
  Bot,
  Sparkles,
  Eye,
  Play,
  Pause,
  Settings,
  Filter
} from 'lucide-react';

interface WorkflowEvent {
  id: string;
  type: 'processing' | 'optimization' | 'suggestion' | 'completion' | 'error' | 'user_action';
  title: string;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'pending' | 'paused';
  progress?: number;
  timestamp: string;
  duration?: string;
  actor: 'ai' | 'user' | 'system';
  itemId?: string;
  itemName?: string;
  metadata?: Record<string, any>;
}

interface WorkflowStreamProps {
  events?: WorkflowEvent[];
  isRealTime?: boolean;
  onEventClick?: (event: WorkflowEvent) => void;
}

export function WorkflowStream({ 
  events = [], 
  isRealTime = true,
  onEventClick 
}: WorkflowStreamProps) {
  const [isPlaying, setIsPlaying] = useState(isRealTime);
  const [filter, setFilter] = useState<string>('all');
  const [streamEvents, setStreamEvents] = useState<WorkflowEvent[]>([]);

  // Mock real-time events for demonstration
  const mockEvents: WorkflowEvent[] = events.length > 0 ? events : [
    {
      id: '1',
      type: 'processing',
      title: 'Analyzing React Component Prompt',
      description: 'AI is analyzing prompt structure and extracting patterns',
      status: 'running',
      progress: 65,
      timestamp: '2 minutes ago',
      actor: 'ai',
      itemId: '1',
      itemName: 'React Component Prompt',
      metadata: { model: 'Claude-3.5-Sonnet', tokens: 340 }
    },
    {
      id: '2',
      type: 'completion',
      title: 'Code Review Agent Updated',
      description: 'Successfully optimized agent prompt for better performance',
      status: 'completed',
      timestamp: '5 minutes ago',
      duration: '2.3s',
      actor: 'ai',
      itemId: '2',
      itemName: 'Code Review Agent',
      metadata: { improvement: '+12% efficiency', tokensSaved: 120 }
    },
    {
      id: '3',
      type: 'suggestion',
      title: 'Duplicate Prompts Detected',
      description: 'Found 3 similar React component prompts that could be merged',
      status: 'pending',
      timestamp: '8 minutes ago',
      actor: 'ai',
      metadata: { duplicates: 3, potentialSavings: '30% tokens' }
    },
    {
      id: '4',
      type: 'user_action',
      title: 'New Template Created',
      description: 'User created "API Documentation Template"',
      status: 'completed',
      timestamp: '12 minutes ago',
      actor: 'user',
      itemId: '5',
      itemName: 'API Documentation Template'
    },
    {
      id: '5',
      type: 'optimization',
      title: 'TypeScript Rules Optimization',
      description: 'Analyzing rule patterns and removing redundancies',
      status: 'running',
      progress: 45,
      timestamp: '15 minutes ago',
      actor: 'ai',
      itemId: '3',
      itemName: 'TypeScript Rules',
      metadata: { rulesAnalyzed: 15, redundanciesFound: 4 }
    },
    {
      id: '6',
      type: 'error',
      title: 'Import Failed',
      description: 'Failed to import GitHub repository due to authentication error',
      status: 'failed',
      timestamp: '20 minutes ago',
      actor: 'system',
      metadata: { error: 'GITHUB_AUTH_FAILED', repository: 'user/repo' }
    }
  ];

  useEffect(() => {
    setStreamEvents(mockEvents);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Simulate new events or progress updates
      setStreamEvents(prev => 
        prev.map(event => {
          if (event.status === 'running' && event.progress !== undefined) {
            const newProgress = Math.min(100, event.progress + Math.random() * 5);
            return {
              ...event,
              progress: newProgress,
              status: newProgress >= 100 ? 'completed' : 'running'
            };
          }
          return event;
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const getEventIcon = (event: WorkflowEvent) => {
    switch (event.type) {
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'optimization':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'suggestion':
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case 'completion':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'user_action':
        return <User className="h-4 w-4 text-blue-600" />;
      default:
        return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'ai':
        return <Bot className="h-3 w-3 text-purple-500" />;
      case 'user':
        return <User className="h-3 w-3 text-blue-500" />;
      case 'system':
        return <Settings className="h-3 w-3 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'paused': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const filteredEvents = streamEvents.filter(event => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>Workflow Stream</span>
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            </CardTitle>
            <CardDescription>
              Real-time feed of AI processing and optimization activities
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-6 pb-4">
          <div className="flex space-x-2">
            {['all', 'processing', 'optimization', 'suggestion', 'completion'].map((filterType) => (
              <Button
                key={filterType}
                variant={filter === filterType ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterType)}
                className="text-xs"
              >
                {filterType === 'all' ? 'All' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        
        <ScrollArea className="h-96 px-6">
          <div className="space-y-4 pb-4">
            {filteredEvents.map((event, index) => (
              <div
                key={event.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => onEventClick?.(event)}
              >
                <div className="flex flex-col items-center">
                  {getEventIcon(event)}
                  {index !== filteredEvents.length - 1 && (
                    <div className="w-px h-8 bg-border mt-2" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">{event.title}</p>
                      {getActorIcon(event.actor)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(event.status)}`} />
                      <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                  
                  {event.progress !== undefined && event.status === 'running' && (
                    <div className="mt-2">
                      <Progress value={event.progress} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">{event.progress}% complete</p>
                    </div>
                  )}
                  
                  {event.itemName && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {event.itemName}
                      </Badge>
                    </div>
                  )}
                  
                  {event.metadata && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <span key={key} className="text-xs text-muted-foreground bg-accent px-2 py-1 rounded">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {event.status === 'completed' && event.duration && (
                    <p className="text-xs text-green-600 mt-1">
                      Completed in {event.duration}
                    </p>
                  )}
                  
                  {event.status === 'failed' && (
                    <div className="mt-2">
                      <Badge variant="destructive" className="text-xs">
                        Failed
                      </Badge>
                      <Button variant="ghost" size="sm" className="ml-2 h-6 text-xs">
                        Retry
                      </Button>
                    </div>
                  )}
                  
                  {event.status === 'pending' && event.type === 'suggestion' && (
                    <div className="mt-2 space-x-2">
                      <Button size="sm" className="h-6 text-xs">
                        Review
                      </Button>
                      <Button variant="outline" size="sm" className="h-6 text-xs">
                        <Eye className="mr-1 h-3 w-3" />
                        Preview
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}