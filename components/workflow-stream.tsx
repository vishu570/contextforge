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
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  timestamp: string;
  duration?: string;
  actor: 'user' | 'ai' | 'system';
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
  isRealTime = false,
  onEventClick 
}: WorkflowStreamProps) {
  const [isPlaying, setIsPlaying] = useState(isRealTime);
  const [filter, setFilter] = useState<string>('all');
  const [streamEvents, setStreamEvents] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real workflow events from the API
  useEffect(() => {
    fetchWorkflowEvents();
  }, []);

  const fetchWorkflowEvents = async () => {
    try {
      setLoading(true);
      // Try to fetch real events from the API
      const response = await fetch('/api/workflow/events');
      
      if (response.ok) {
        const data = await response.json();
        setStreamEvents(data.events || []);
      } else {
        // If no real events, show empty state
        setStreamEvents([]);
      }
    } catch (error) {
      console.error('Error fetching workflow events:', error);
      setStreamEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Use provided events if available, otherwise use fetched events
  useEffect(() => {
    if (events.length > 0) {
      setStreamEvents(events);
    }
  }, [events]);

  // Poll for updates if real-time mode is enabled
  useEffect(() => {
    if (!isPlaying || !isRealTime) return;

    const interval = setInterval(() => {
      fetchWorkflowEvents();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [isPlaying, isRealTime]);

  const getEventIcon = (event: WorkflowEvent) => {
    const iconClass = "h-5 w-5";
    switch (event.type) {
      case 'processing':
        return <RefreshCw className={`${iconClass} text-blue-500 ${event.status === 'running' ? 'animate-spin' : ''}`} />;
      case 'optimization':
        return <Zap className={`${iconClass} text-yellow-500`} />;
      case 'suggestion':
        return <Sparkles className={`${iconClass} text-purple-500`} />;
      case 'completion':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-500`} />;
      case 'user_action':
        return <User className={`${iconClass} text-gray-500`} />;
      default:
        return <Clock className={`${iconClass} text-gray-400`} />;
    }
  };

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'ai':
        return <Bot className="h-3 w-3 text-blue-500" />;
      case 'user':
        return <User className="h-3 w-3 text-gray-500" />;
      case 'system':
        return <Settings className="h-3 w-3 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500 animate-pulse';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredEvents = filter === 'all' 
    ? streamEvents 
    : streamEvents.filter(event => event.type === filter);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading workflow events...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Live Stream</span>
              {isPlaying && (
                <Badge variant="outline" className="animate-pulse">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 inline-block" />
                  Live
                </Badge>
              )}
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
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWorkflowEvents}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex space-x-2 mt-4">
          {['all', 'processing', 'optimization', 'suggestion', 'completion'].map((type) => (
            <Badge
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="px-0">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 px-6">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Workflow Events</h3>
            <p className="text-muted-foreground mb-4">
              Workflow events will appear here when you start processing items, optimizing prompts, or performing other AI operations.
            </p>
            <Button variant="outline" onClick={fetchWorkflowEvents}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check for Events
            </Button>
          </div>
        ) : (
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
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(event.progress)}% complete
                        </p>
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
        )}
      </CardContent>
    </Card>
  );
}