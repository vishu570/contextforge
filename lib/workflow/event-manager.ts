/**
 * Workflow Event Manager
 * Handles creation, tracking, and broadcasting of workflow events
 */

import { redis } from '@/lib/redis';
import { prisma } from '@/lib/db';
import { WebSocketManager } from '@/lib/websocket/manager';
import { WebSocketEventType } from '@/lib/websocket/types';

export interface WorkflowEvent {
  id: string;
  type: 'processing' | 'optimization' | 'suggestion' | 'completion' | 'error' | 'user_action';
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  timestamp: string;
  duration?: string;
  actor: 'user' | 'ai' | 'system';
  userId: string;
  itemId?: string;
  itemName?: string;
  metadata?: Record<string, any>;
}

export class WorkflowEventManager {
  private static instance: WorkflowEventManager;

  private constructor() {}

  public static getInstance(): WorkflowEventManager {
    if (!WorkflowEventManager.instance) {
      WorkflowEventManager.instance = new WorkflowEventManager();
    }
    return WorkflowEventManager.instance;
  }

  /**
   * Create a new workflow event
   */
  async createEvent(eventData: Omit<WorkflowEvent, 'id' | 'timestamp'>): Promise<WorkflowEvent> {
    const event: WorkflowEvent = {
      ...eventData,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    // Store in Redis for fast access
    const cacheKey = `workflow_events:${event.userId}`;
    try {
      await redis.lpush(cacheKey, JSON.stringify(event));
      await redis.ltrim(cacheKey, 0, 199); // Keep last 200 events
      await redis.expire(cacheKey, 3600); // 1 hour TTL
    } catch (error) {
      console.warn('Failed to cache workflow event:', error);
    }

    // Store in database for persistence
    try {
      await prisma.auditLog.create({
        data: {
          userId: event.userId,
          action: `workflow_${event.type}`,
          entityType: 'workflow_event',
          entityId: event.id,
          itemId: event.itemId,
          metadata: JSON.stringify(event),
        },
      });
    } catch (error) {
      console.warn('Failed to persist workflow event:', error);
    }

    // Broadcast to WebSocket clients
    this.broadcastEvent(event);

    return event;
  }

  /**
   * Update an existing workflow event (e.g., progress updates)
   */
  async updateEvent(eventId: string, updates: Partial<WorkflowEvent>): Promise<WorkflowEvent | null> {
    try {
      // Get current event from cache
      const userId = updates.userId;
      if (!userId) return null;

      const cacheKey = `workflow_events:${userId}`;
      const cachedEvents = await redis.lrange(cacheKey, 0, -1);
      
      let updatedEvent: WorkflowEvent | null = null;
      const updatedEvents: string[] = [];

      for (const eventStr of cachedEvents) {
        try {
          const event = JSON.parse(eventStr);
          if (event.id === eventId) {
            updatedEvent = { ...event, ...updates, timestamp: new Date().toISOString() };
            updatedEvents.push(JSON.stringify(updatedEvent));
          } else {
            updatedEvents.push(eventStr);
          }
        } catch (parseError) {
          console.warn('Failed to parse cached event:', parseError);
          updatedEvents.push(eventStr);
        }
      }

      if (updatedEvent) {
        // Update cache
        await redis.del(cacheKey);
        if (updatedEvents.length > 0) {
          await redis.lpush(cacheKey, ...updatedEvents);
          await redis.expire(cacheKey, 3600);
        }

        // Broadcast update
        this.broadcastEvent(updatedEvent);
      }

      return updatedEvent;
    } catch (error) {
      console.error('Failed to update workflow event:', error);
      return null;
    }
  }

  /**
   * Get workflow events for a user
   */
  async getEvents(userId: string, options: {
    limit?: number;
    offset?: number;
    type?: string;
    since?: Date;
  } = {}): Promise<WorkflowEvent[]> {
    const { limit = 50, offset = 0, type, since } = options;
    const cacheKey = `workflow_events:${userId}`;

    try {
      const cachedEvents = await redis.lrange(cacheKey, 0, -1);
      return cachedEvents
        .map(eventStr => {
          try {
            return JSON.parse(eventStr) as WorkflowEvent;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .filter(event => !since || new Date(event.timestamp) > since)
        .filter(event => !type || type === 'all' || event.type === type)
        .slice(offset, offset + limit);
    } catch (error) {
      console.warn('Failed to get cached events, generating from activity:', error);
      return this.generateEventsFromActivity(userId, limit, offset, since);
    }
  }

  /**
   * Broadcast event to WebSocket clients
   */
  private broadcastEvent(event: WorkflowEvent): void {
    try {
      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToUser(event.userId, {
        type: WebSocketEventType.WORKFLOW_EVENT,
        userId: event.userId,
        data: event,
        timestamp: new Date(),
      });
    } catch (error) {
      console.warn('Failed to broadcast workflow event:', error);
    }
  }

  /**
   * Create progress event for long-running operations
   */
  async trackProgress(
    userId: string,
    operationId: string,
    title: string,
    progress: number,
    description?: string
  ): Promise<WorkflowEvent> {
    return this.createEvent({
      type: 'processing',
      title,
      description: description || `${title} - ${Math.round(progress)}% complete`,
      status: progress >= 100 ? 'completed' : 'running',
      progress,
      actor: 'system',
      userId,
      metadata: { operationId },
    });
  }

  /**
   * Create optimization event
   */
  async trackOptimization(
    userId: string,
    itemId: string,
    itemName: string,
    optimizationType: string,
    result?: any
  ): Promise<WorkflowEvent> {
    return this.createEvent({
      type: 'optimization',
      title: 'AI Optimization',
      description: `Applied ${optimizationType} optimization to ${itemName}`,
      status: 'completed',
      actor: 'ai',
      userId,
      itemId,
      itemName,
      metadata: { optimizationType, result },
    });
  }

  /**
   * Create suggestion event
   */
  async trackSuggestion(
    userId: string,
    itemId: string,
    itemName: string,
    suggestionType: string,
    suggestions: any[]
  ): Promise<WorkflowEvent> {
    return this.createEvent({
      type: 'suggestion',
      title: 'AI Suggestions',
      description: `Generated ${suggestions.length} ${suggestionType} suggestions for ${itemName}`,
      status: 'pending',
      actor: 'ai',
      userId,
      itemId,
      itemName,
      metadata: { suggestionType, suggestions },
    });
  }

  /**
   * Create error event
   */
  async trackError(
    userId: string,
    operation: string,
    error: string,
    itemId?: string,
    itemName?: string
  ): Promise<WorkflowEvent> {
    return this.createEvent({
      type: 'error',
      title: 'Operation Failed',
      description: `${operation} failed: ${error}`,
      status: 'failed',
      actor: 'system',
      userId,
      itemId,
      itemName,
      metadata: { operation, error },
    });
  }

  /**
   * Create user action event
   */
  async trackUserAction(
    userId: string,
    action: string,
    description: string,
    itemId?: string,
    itemName?: string
  ): Promise<WorkflowEvent> {
    return this.createEvent({
      type: 'user_action',
      title: action,
      description,
      status: 'completed',
      actor: 'user',
      userId,
      itemId,
      itemName,
    });
  }

  /**
   * Generate events from existing activity when cache is empty
   */
  private async generateEventsFromActivity(
    userId: string,
    limit: number,
    offset: number,
    since: Date | null
  ): Promise<WorkflowEvent[]> {
    try {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId,
          ...(since && { createdAt: { gte: since } }),
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: { id: true, name: true, type: true }
          }
        }
      });

      return auditLogs.map(log => ({
        id: `log_${log.id}`,
        type: this.mapActionToEventType(log.action),
        title: this.getEventTitle(log.action),
        description: `${log.action} on ${log.entityType}: ${log.item?.name || log.entityId}`,
        status: 'completed' as const,
        timestamp: log.createdAt.toISOString(),
        actor: log.action.includes('optimization') || log.action.includes('classification') ? 'ai' as const : 'user' as const,
        userId,
        itemId: log.itemId || undefined,
        itemName: log.item?.name,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
      }));
    } catch (error) {
      console.error('Failed to generate events from activity:', error);
      return [];
    }
  }

  private mapActionToEventType(action: string): WorkflowEvent['type'] {
    if (action.includes('optimization')) return 'optimization';
    if (action.includes('suggestion')) return 'suggestion';
    if (action.includes('classification') || action.includes('process')) return 'processing';
    if (action.includes('complete')) return 'completion';
    if (action.includes('error') || action.includes('fail')) return 'error';
    return 'user_action';
  }

  private getEventTitle(action: string): string {
    return action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' ');
  }

  /**
   * Clean up old events (called by cron job)
   */
  async cleanupOldEvents(maxAgeHours: number = 24): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    try {
      // Clean up Redis caches
      const pattern = 'workflow_events:*';
      const keys = await redis.keys(pattern);
      
      for (const key of keys) {
        const events = await redis.lrange(key, 0, -1);
        const validEvents = events.filter(eventStr => {
          try {
            const event = JSON.parse(eventStr);
            return new Date(event.timestamp) > cutoffTime;
          } catch {
            return false;
          }
        });
        
        if (validEvents.length !== events.length) {
          await redis.del(key);
          if (validEvents.length > 0) {
            await redis.lpush(key, ...validEvents);
            await redis.expire(key, 3600);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old workflow events:', error);
    }
  }
}

// Export singleton instance
export const workflowEventManager = WorkflowEventManager.getInstance();