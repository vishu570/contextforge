export enum WebSocketEventType {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  AUTHENTICATE = 'authenticate',
  
  // Job events
  JOB_CREATED = 'job_created',
  JOB_STARTED = 'job_started',
  JOB_PROGRESS = 'job_progress',
  JOB_COMPLETED = 'job_completed',
  JOB_FAILED = 'job_failed',
  JOB_RETRY = 'job_retry',
  
  // System events
  SYSTEM_STATUS = 'system_status',
  HEALTH_CHECK = 'health_check',
  
  // Activity events
  ACTIVITY_FEED = 'activity_feed',
  USER_ACTIVITY = 'user_activity',
  
  // Real-time updates
  ITEM_UPDATED = 'item_updated',
  ITEM_CREATED = 'item_created',
  ITEM_DELETED = 'item_deleted',
  COLLECTION_UPDATED = 'collection_updated',
  
  // Notifications
  NOTIFICATION = 'notification',
  ALERT = 'alert',
}

export interface WebSocketMessage {
  type: WebSocketEventType;
  userId?: string;
  data: any;
  timestamp: Date;
  id?: string;
}

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAuthenticated?: boolean;
  lastActivity?: Date;
  subscriptions?: Set<string>;
}

export interface JobProgressData {
  jobId: string;
  jobType: string;
  percentage: number;
  message: string;
  data?: any;
}

export interface JobStatusData {
  jobId: string;
  jobType: string;
  status: string;
  result?: any;
  error?: string;
}

export interface ActivityFeedItem {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  timestamp: Date;
}

export interface SystemStatusData {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  activeConnections: number;
  queueStatus: Record<string, any>;
  memoryUsage: any;
  lastUpdate: Date;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  userId: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}