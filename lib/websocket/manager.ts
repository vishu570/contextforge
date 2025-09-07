import { IncomingMessage } from "http"
import jwt from "jsonwebtoken"
import WebSocket from "ws"
import { prisma } from "../db"
import { redis } from "../redis"
import {
  ActivityFeedItem,
  AuthenticatedWebSocket,
  NotificationData,
  SystemStatusData,
  WebSocketEventType,
  WebSocketMessage,
} from "./types"

export class WebSocketManager {
  private static instance: WebSocketManager
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map()
  private server?: WebSocket.Server
  private heartbeatInterval?: NodeJS.Timeout
  private metricsInterval?: NodeJS.Timeout

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  /**
   * Initialize WebSocket server
   */
  public initialize(server?: any): void {
    this.server = new WebSocket.Server({
      port: process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8080,
      verifyClient: this.verifyClient.bind(this),
    })

    this.server.on("connection", this.handleConnection.bind(this))
    this.startHeartbeat()
    this.startMetricsCollection()

    console.log(
      `WebSocket server initialized on port ${process.env.WS_PORT || 8080}`
    )
  }

  /**
   * Verify client connection
   */
  private verifyClient(info: {
    origin: string
    secure: boolean
    req: IncomingMessage
  }): boolean {
    // Basic verification - you might want to add more security checks
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ]
    return (
      allowedOrigins.includes(info.origin) ||
      process.env.NODE_ENV === "development"
    )
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(
    ws: AuthenticatedWebSocket,
    request: IncomingMessage
  ): void {
    console.log("New WebSocket connection")

    // Set up message handler
    ws.on("message", (data: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(data)
        this.handleMessage(ws, message)
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error)
        this.sendError(ws, "Invalid message format")
      }
    })

    // Handle disconnection
    ws.on("close", () => {
      this.handleDisconnection(ws)
    })

    // Handle errors
    ws.on("error", (error) => {
      console.error("WebSocket error:", error)
      this.handleDisconnection(ws)
    })

    // Send welcome message
    this.sendMessage(ws, {
      type: WebSocketEventType.CONNECT,
      data: { message: "Connected to ContextForge WebSocket server" },
      timestamp: new Date(),
    })
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(
    ws: AuthenticatedWebSocket,
    message: WebSocketMessage
  ): Promise<void> {
    switch (message.type) {
      case WebSocketEventType.AUTHENTICATE:
        await this.handleAuthentication(ws, message.data)
        break

      case WebSocketEventType.HEALTH_CHECK:
        this.sendMessage(ws, {
          type: WebSocketEventType.HEALTH_CHECK,
          data: { status: "ok", timestamp: new Date() },
          timestamp: new Date(),
        })
        break

      default:
        if (!ws.isAuthenticated) {
          this.sendError(ws, "Authentication required")
          return
        }

        // Update last activity
        ws.lastActivity = new Date()

        // Handle authenticated messages
        await this.handleAuthenticatedMessage(ws, message)
        break
    }
  }

  /**
   * Handle authentication
   */
  private async handleAuthentication(
    ws: AuthenticatedWebSocket,
    data: any
  ): Promise<void> {
    try {
      if (!data.token) {
        this.sendError(ws, "Authentication token required")
        return
      }

      // Verify JWT token
      const decoded = jwt.verify(
        data.token,
        process.env.JWT_SECRET ||
          process.env.NEXTAUTH_SECRET ||
          "fallback-secret"
      ) as any
      const userId = decoded.userId

      if (!userId) {
        this.sendError(ws, "Invalid token")
        return
      }

      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        this.sendError(ws, "User not found")
        return
      }

      // Set authentication state
      ws.userId = userId
      ws.isAuthenticated = true
      ws.lastActivity = new Date()

      // Add to clients map
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set())
      }
      this.clients.get(userId)!.add(ws)

      // Send authentication success
      this.sendMessage(ws, {
        type: WebSocketEventType.AUTHENTICATE,
        data: { success: true, userId },
        timestamp: new Date(),
      })

      // Send initial system status
      await this.sendSystemStatus(ws)

      console.log(`User ${userId} authenticated via WebSocket`)
    } catch (error) {
      console.error("Authentication error:", error)
      this.sendError(ws, "Authentication failed")
    }
  }

  /**
   * Handle authenticated messages
   */
  private async handleAuthenticatedMessage(
    ws: AuthenticatedWebSocket,
    message: WebSocketMessage
  ): Promise<void> {
    switch (message.type) {
      case WebSocketEventType.SYSTEM_STATUS:
        await this.sendSystemStatus(ws)
        break

      case WebSocketEventType.ACTIVITY_FEED:
        await this.sendActivityFeed(ws, message.data)
        break

      case "subscribe":
        await this.handleSubscription(ws, message.data)
        break

      case "unsubscribe":
        await this.handleUnsubscription(ws, message.data)
        break

      case "analytics_ping":
        await this.handleAnalyticsPing(ws, message.data)
        break

      default:
        console.warn("Unknown message type:", message.type)
        break
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    if (ws.userId && this.clients.has(ws.userId)) {
      const userConnections = this.clients.get(ws.userId)!
      userConnections.delete(ws)

      if (userConnections.size === 0) {
        this.clients.delete(ws.userId)
      }
    }

    console.log(
      `WebSocket disconnected for user: ${ws.userId || "unauthenticated"}`
    )
  }

  /**
   * Send message to specific WebSocket
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: WebSocketEventType.ALERT,
      data: { type: "error", message: error },
      timestamp: new Date(),
    })
  }

  /**
   * Broadcast message to user's connections
   */
  public broadcastToUser(userId: string, message: WebSocketMessage): void {
    const userConnections = this.clients.get(userId)
    if (userConnections) {
      userConnections.forEach((ws) => {
        this.sendMessage(ws, message)
      })
    }
  }

  /**
   * Broadcast message to all authenticated connections
   */
  public broadcastToAll(message: WebSocketMessage): void {
    this.clients.forEach((userConnections) => {
      userConnections.forEach((ws) => {
        this.sendMessage(ws, message)
      })
    })
  }

  /**
   * Job event notifications
   */
  public notifyJobCreated(
    jobId: string,
    jobType: string,
    userId: string
  ): void {
    this.broadcastToUser(userId, {
      type: WebSocketEventType.JOB_CREATED,
      userId,
      data: { jobId, jobType },
      timestamp: new Date(),
    })
  }

  public notifyJobStarted(jobId: string, jobType: string, data: any): void {
    if (data.userId) {
      this.broadcastToUser(data.userId, {
        type: WebSocketEventType.JOB_STARTED,
        userId: data.userId,
        data: { jobId, jobType },
        timestamp: new Date(),
      })
    }
  }

  public notifyJobProgress(jobId: string, progress: any): void {
    // Store progress in Redis for retrieval
    redis.setex(
      `job_progress:${jobId}`,
      300,
      JSON.stringify({
        ...progress,
        timestamp: new Date(),
      })
    )

    // Note: We'd need userId from job data to send targeted updates
    // For now, we could broadcast to all or implement job subscriptions
  }

  public notifyJobCompleted(jobId: string, result: any): void {
    // Similar to progress, we'd need user context
    console.log(`Job ${jobId} completed:`, result)
  }

  public notifyJobFailed(jobId: string, error: string): void {
    console.log(`Job ${jobId} failed:`, error)
  }

  public notifyJobRetry(
    jobId: string,
    error: string,
    retryCount: number
  ): void {
    console.log(`Job ${jobId} retrying (attempt ${retryCount}):`, error)
  }

  /**
   * Send system status
   */
  private async sendSystemStatus(ws: AuthenticatedWebSocket): Promise<void> {
    try {
      const status: SystemStatusData = {
        status: "healthy",
        uptime: process.uptime(),
        activeConnections: this.getConnectionCount(),
        queueStatus: {}, // Will be populated by queue stats
        memoryUsage: process.memoryUsage(),
        lastUpdate: new Date(),
      }

      this.sendMessage(ws, {
        type: WebSocketEventType.SYSTEM_STATUS,
        data: status,
        timestamp: new Date(),
      })
    } catch (error) {
      console.error("Failed to send system status:", error)
    }
  }

  /**
   * Send activity feed
   */
  private async sendActivityFeed(
    ws: AuthenticatedWebSocket,
    params: any
  ): Promise<void> {
    try {
      const limit = params.limit || 50
      const offset = params.offset || 0

      const activities = await prisma.auditLog.findMany({
        where: { userId: ws.userId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      })

      const activityFeed: ActivityFeedItem[] = activities.map((log) => ({
        id: log.id,
        userId: log.userId || "",
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId || "",
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
        timestamp: log.createdAt,
      }))

      this.sendMessage(ws, {
        type: WebSocketEventType.ACTIVITY_FEED,
        data: {
          activities: activityFeed,
          hasMore: activities.length === limit,
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error("Failed to send activity feed:", error)
      this.sendError(ws, "Failed to load activity feed")
    }
  }

  /**
   * Send notification to user
   */
  public sendNotification(
    userId: string,
    notification: Omit<NotificationData, "id" | "createdAt">
  ): void {
    const fullNotification: NotificationData = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    }

    this.broadcastToUser(userId, {
      type: WebSocketEventType.NOTIFICATION,
      userId,
      data: fullNotification,
      timestamp: new Date(),
    })
  }

  /**
   * Start heartbeat to detect stale connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((userConnections, userId) => {
        userConnections.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            // Check for stale connections (no activity for 5 minutes)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
            if (ws.lastActivity && ws.lastActivity < fiveMinutesAgo) {
              ws.ping()
            }
          } else {
            // Remove dead connections
            userConnections.delete(ws)
          }
        })

        // Clean up empty user connection sets
        if (userConnections.size === 0) {
          this.clients.delete(userId)
        }
      })
    }, 60000) // Check every minute
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      const metrics = {
        activeConnections: this.getConnectionCount(),
        connectedUsers: this.clients.size,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date(),
      }

      // Store metrics in Redis
      await redis.setex("websocket_metrics", 300, JSON.stringify(metrics))
    }, 30000) // Collect every 30 seconds
  }

  /**
   * Get total connection count
   */
  public getConnectionCount(): number {
    let count = 0
    this.clients.forEach((userConnections) => {
      count += userConnections.size
    })
    return count
  }

  /**
   * Get connected user IDs
   */
  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys())
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    return this.clients.has(userId) && this.clients.get(userId)!.size > 0
  }

  /**
   * Handle subscription to analytics channels
   */
  private async handleSubscription(
    ws: AuthenticatedWebSocket,
    data: any
  ): Promise<void> {
    const { channel, userId } = data

    if (!ws.subscriptions) {
      ws.subscriptions = new Set()
    }

    ws.subscriptions.add(channel)

    // Send confirmation
    this.sendMessage(ws, {
      type: "subscription_confirmed",
      data: { channel, status: "subscribed" },
      timestamp: new Date(),
    })

    // Send initial data for analytics channel
    if (channel === "analytics") {
      await this.sendAnalyticsUpdate(ws)
    }
  }

  /**
   * Handle unsubscription from analytics channels
   */
  private async handleUnsubscription(
    ws: AuthenticatedWebSocket,
    data: any
  ): Promise<void> {
    const { channel } = data

    if (ws.subscriptions) {
      ws.subscriptions.delete(channel)
    }

    // Send confirmation
    this.sendMessage(ws, {
      type: "subscription_cancelled",
      data: { channel, status: "unsubscribed" },
      timestamp: new Date(),
    })
  }

  /**
   * Handle analytics ping for real-time updates
   */
  private async handleAnalyticsPing(
    ws: AuthenticatedWebSocket,
    data: any
  ): Promise<void> {
    // Record user activity for analytics
    await this.recordUserActivity(ws.userId!, data.activity || "ping")

    // Send pong response
    this.sendMessage(ws, {
      type: "analytics_pong",
      data: { timestamp: new Date() },
      timestamp: new Date(),
    })
  }

  /**
   * Send analytics update to subscribed clients
   */
  private async sendAnalyticsUpdate(ws: AuthenticatedWebSocket): Promise<void> {
    if (!ws.subscriptions?.has("analytics")) return

    try {
      // Get real-time metrics for the user
      const metrics = await this.getUserRealtimeMetrics(ws.userId!)

      this.sendMessage(ws, {
        type: "analytics_update",
        data: metrics,
        timestamp: new Date(),
      })
    } catch (error) {
      console.error("Failed to send analytics update:", error)
    }
  }

  /**
   * Get user real-time metrics
   */
  private async getUserRealtimeMetrics(userId: string): Promise<any> {
    try {
      const [userMetrics, recentActivity] = await Promise.all([
        redis.hgetall(`user:${userId}:realtime_metrics`),
        redis.lrange(`user:${userId}:recent_activity`, 0, 4),
      ])

      return {
        activeRequests: parseInt(userMetrics.active_requests || "0"),
        requestsPerMinute: parseFloat(userMetrics.requests_per_minute || "0"),
        avgResponseTime: parseFloat(userMetrics.avg_response_time || "0"),
        errorCount: parseInt(userMetrics.error_count || "0"),
        lastActivity: userMetrics.last_activity || null,
        recentActivity: recentActivity
          .map((activity) => {
            try {
              return JSON.parse(activity)
            } catch {
              return null
            }
          })
          .filter(Boolean),
      }
    } catch (error) {
      console.error("Failed to get user real-time metrics:", error)
      return {}
    }
  }

  /**
   * Record user activity for analytics
   */
  private async recordUserActivity(
    userId: string,
    activityType: string
  ): Promise<void> {
    try {
      const activity = {
        type: activityType,
        timestamp: new Date().toISOString(),
        userId,
      }

      // Store in recent activity
      await redis.lpush(
        `user:${userId}:recent_activity`,
        JSON.stringify(activity)
      )
      await redis.ltrim(`user:${userId}:recent_activity`, 0, 19)
      await redis.expire(`user:${userId}:recent_activity`, 86400)

      // Update user metrics
      await redis.hset(
        `user:${userId}:realtime_metrics`,
        "last_activity",
        activity.timestamp
      )
    } catch (error) {
      console.error("Failed to record user activity:", error)
    }
  }

  /**
   * Broadcast analytics event to subscribed users
   */
  public broadcastAnalyticsEvent(
    userId: string,
    eventType: string,
    data: any
  ): void {
    const userConnections = this.clients.get(userId)
    if (!userConnections) return

    userConnections.forEach((ws) => {
      if (ws.subscriptions?.has("analytics")) {
        this.sendMessage(ws, {
          type: "analytics_event",
          data: {
            eventType,
            data,
            timestamp: new Date(),
          },
          timestamp: new Date(),
        })
      }
    })
  }

  /**
   * Send system alert to all analytics subscribers
   */
  public broadcastSystemAlert(alert: any): void {
    this.clients.forEach((userConnections) => {
      userConnections.forEach((ws) => {
        if (ws.subscriptions?.has("analytics")) {
          this.sendMessage(ws, {
            type: "system_alert",
            data: alert,
            timestamp: new Date(),
          })
        }
      })
    })
  }

  /**
   * Shutdown WebSocket server
   */
  public async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }

    if (this.server) {
      this.server.close()
    }

    console.log("WebSocket manager shut down")
  }
}
