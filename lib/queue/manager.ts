import { EventEmitter } from "events"
import { prisma } from "../db"
import { redis } from "../redis"
import {
  Job,
  JobData,
  JobPriority,
  jobQueue,
  JobStatus,
  JobType,
} from "./index"
import { WebSocketMessage, WebSocketMessageType } from "./types"

/**
 * Enhanced Queue Manager
 * Extends existing queue system with advanced management capabilities
 */
export class QueueManager extends EventEmitter {
  private static instance: QueueManager
  private isShuttingDown: boolean = false
  private healthCheckInterval?: NodeJS.Timeout
  private progressTrackingInterval?: NodeJS.Timeout

  private constructor() {
    super()
    this.initializeHealthChecks()
    this.initializeProgressTracking()
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager()
    }
    return QueueManager.instance
  }

  /**
   * Initialize health checks for queue monitoring
   */
  private initializeHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (this.isShuttingDown) return

      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error("Queue health check failed:", error)
        this.emit("health-check-failed", error)
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Initialize progress tracking for active jobs
   */
  private initializeProgressTracking(): void {
    this.progressTrackingInterval = setInterval(async () => {
      if (this.isShuttingDown) return

      try {
        await this.broadcastActiveJobsProgress()
      } catch (error) {
        console.error("Progress tracking failed:", error)
      }
    }, 5000) // Every 5 seconds
  }

  /**
   * Enhanced job creation with priority handling
   */
  async createJob(
    type: JobType,
    data: JobData,
    options: {
      priority?: JobPriority
      delay?: number
      retries?: number
      scheduledFor?: Date
      userId?: string
    } = {}
  ): Promise<string> {
    const priority = options.priority || this.calculateJobPriority(type, data)

    const jobId = await jobQueue.addJob(type, data, {
      ...options,
      priority,
    })

    // Emit job creation event
    this.emitJobEvent("created", jobId, {
      type,
      priority,
      userId: options.userId,
    })

    return jobId
  }

  /**
   * Calculate job priority based on type and data
   */
  private calculateJobPriority(type: JobType, data: JobData): JobPriority {
    // Critical jobs (user-facing operations)
    const criticalJobs = [
      JobType.OPTIMIZATION,
      JobType.CLASSIFICATION,
      JobType.CONVERSION,
    ]

    // High priority jobs (important but not immediate)
    const highPriorityJobs = [
      JobType.QUALITY_ASSESSMENT,
      JobType.CONTENT_ANALYSIS,
      JobType.EMBEDDING_GENERATION,
    ]

    // Medium priority jobs (background processing)
    const mediumPriorityJobs = [
      JobType.DEDUPLICATION,
      JobType.SIMILARITY_SCORING,
      JobType.SEMANTIC_CLUSTERING,
    ]

    if (criticalJobs.includes(type)) {
      return JobPriority.CRITICAL
    } else if (highPriorityJobs.includes(type)) {
      return JobPriority.HIGH
    } else if (mediumPriorityJobs.includes(type)) {
      return JobPriority.NORMAL
    } else {
      return JobPriority.LOW
    }
  }

  /**
   * Enhanced job monitoring with progress updates
   */
  async monitorJob(jobId: string): Promise<Job | null> {
    const job = await jobQueue.getJobStatus(jobId)
    if (!job) return null

    // Get progress if available
    const progress = await jobQueue.getJobProgress(jobId)
    if (progress) {
      job.progress = progress
    }

    return job
  }

  /**
   * Bulk operations for multiple jobs
   */
  async bulkCreateJobs(
    jobs: Array<{
      type: JobType
      data: JobData
      options?: { priority?: JobPriority; delay?: number }
    }>
  ): Promise<string[]> {
    const jobIds = await Promise.all(
      jobs.map(({ type, data, options }) => this.createJob(type, data, options))
    )

    this.emit("bulk-jobs-created", { jobIds, count: jobs.length })
    return jobIds
  }

  /**
   * Cancel multiple jobs
   */
  async bulkCancelJobs(
    jobIds: string[]
  ): Promise<{ cancelled: string[]; failed: string[] }> {
    const results = await Promise.allSettled(
      jobIds.map((id) => jobQueue.cancelJob(id))
    )

    const cancelled: string[] = []
    const failed: string[] = []

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        cancelled.push(jobIds[index])
      } else {
        failed.push(jobIds[index])
      }
    })

    this.emit("bulk-jobs-cancelled", { cancelled, failed })
    return { cancelled, failed }
  }

  /**
   * Queue statistics with enhanced metrics
   */
  async getQueueStatistics(): Promise<{
    queues: Record<JobType, any>
    system: {
      totalJobs: number
      activeJobs: number
      completedToday: number
      failedToday: number
      avgProcessingTime: number
    }
  }> {
    const queueStats = await jobQueue.getQueueStats()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [completedToday, failedToday, avgProcessingTime] = await Promise.all([
      this.getJobCountByStatusAndDate(JobStatus.COMPLETED, today),
      this.getJobCountByStatusAndDate(JobStatus.FAILED, today),
      this.getAverageProcessingTime(),
    ])

    const totalJobs = Object.values(queueStats).reduce(
      (total, stats) =>
        total + stats.waiting + stats.active + stats.completed + stats.failed,
      0
    )

    const activeJobs = Object.values(queueStats).reduce(
      (total, stats) => total + stats.active,
      0
    )

    return {
      queues: queueStats,
      system: {
        totalJobs,
        activeJobs,
        completedToday,
        failedToday,
        avgProcessingTime,
      },
    }
  }

  /**
   * Get job count by status and date
   */
  private async getJobCountByStatusAndDate(
    status: JobStatus,
    date: Date
  ): Promise<number> {
    const count = await prisma.workflowQueue.count({
      where: {
        status,
        completedAt: {
          gte: date,
        },
      },
    })
    return count
  }

  /**
   * Get average processing time for completed jobs
   */
  private async getAverageProcessingTime(): Promise<number> {
    const jobs = await prisma.workflowQueue.findMany({
      where: {
        status: JobStatus.COMPLETED,
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
      take: 100,
      orderBy: { completedAt: "desc" },
    })

    if (jobs.length === 0) return 0

    const totalTime = jobs.reduce((sum, job) => {
      if (job.startedAt && job.completedAt) {
        return sum + (job.completedAt.getTime() - job.startedAt.getTime())
      }
      return sum
    }, 0)

    return Math.round(totalTime / jobs.length / 1000) // Return in seconds
  }

  /**
   * Perform health check on queue system
   */
  private async performHealthCheck(): Promise<void> {
    const stats = await this.getQueueStatistics()
    const unhealthyQueues: string[] = []

    // Check for stuck jobs (active for more than 10 minutes)
    for (const [queueType, queueStats] of Object.entries(stats.queues)) {
      if (queueStats.active > 0) {
        const stuckJobs = await this.findStuckJobs(queueType as JobType)
        if (stuckJobs.length > 0) {
          unhealthyQueues.push(queueType)
          console.warn(
            `Found ${stuckJobs.length} stuck jobs in ${queueType} queue`
          )
        }
      }
    }

    // Check Redis connectivity
    try {
      await redis.ping()
    } catch (error) {
      unhealthyQueues.push("redis")
      console.error("Redis connection failed:", error)
    }

    // Emit health status
    this.emit("health-check", {
      healthy: unhealthyQueues.length === 0,
      unhealthyQueues,
      stats,
      timestamp: new Date(),
    })
  }

  /**
   * Find jobs that have been active for too long
   */
  private async findStuckJobs(
    queueType: JobType,
    maxMinutes: number = 10
  ): Promise<Job[]> {
    const cutoffTime = new Date()
    cutoffTime.setMinutes(cutoffTime.getMinutes() - maxMinutes)

    const stuckJobs = await prisma.workflowQueue.findMany({
      where: {
        type: queueType,
        status: JobStatus.PROCESSING,
        startedAt: {
          lt: cutoffTime,
        },
      },
    })

    return stuckJobs.map((job) => ({
      id: job.id,
      type: job.type as JobType,
      data: (() => {
        try {
          return JSON.parse(job.payload)
        } catch (error) {
          console.error(`Failed to parse payload for job ${job.id}:`, error)
          return {}
        }
      })(),
      priority: job.priority as JobPriority,
      status: job.status as JobStatus,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      scheduledFor: job.scheduledFor,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      createdAt: job.createdAt,
      error: job.error || undefined,
    }))
  }

  /**
   * Broadcast progress updates for active jobs
   */
  private async broadcastActiveJobsProgress(): Promise<void> {
    const activeJobs = await jobQueue.getJobsByStatus(JobStatus.PROCESSING, 50)

    for (const job of activeJobs) {
      const progress = await jobQueue.getJobProgress(job.id)
      if (progress) {
        this.emitJobEvent("progress", job.id, {
          progress,
          type: job.type,
        })
      }
    }
  }

  /**
   * Emit job-related events for WebSocket broadcasting
   */
  private emitJobEvent(event: string, jobId: string, data: any): void {
    const message: WebSocketMessage = {
      type: this.mapEventToMessageType(event),
      data: {
        jobId,
        ...data,
      },
      timestamp: new Date(),
    }

    this.emit("websocket-message", message)
  }

  /**
   * Map internal events to WebSocket message types
   */
  private mapEventToMessageType(event: string): WebSocketMessageType {
    switch (event) {
      case "created":
        return WebSocketMessageType.JOB_CREATED
      case "started":
        return WebSocketMessageType.JOB_STARTED
      case "progress":
        return WebSocketMessageType.JOB_PROGRESS
      case "completed":
        return WebSocketMessageType.JOB_COMPLETED
      case "failed":
        return WebSocketMessageType.JOB_FAILED
      default:
        return WebSocketMessageType.SYSTEM_STATUS
    }
  }

  /**
   * Graceful shutdown with job cleanup
   */
  async shutdown(): Promise<void> {
    console.log("Initiating queue manager shutdown...")
    this.isShuttingDown = true

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    if (this.progressTrackingInterval) {
      clearInterval(this.progressTrackingInterval)
    }

    // Wait for active jobs to complete or timeout
    const maxWaitTime = 30000 // 30 seconds
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const stats = await jobQueue.getQueueStats()
      const activeJobCount = Object.values(stats).reduce(
        (total, queueStats) => total + queueStats.active,
        0
      )

      if (activeJobCount === 0) {
        break
      }

      console.log(`Waiting for ${activeJobCount} active jobs to complete...`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Clean up old jobs
    await jobQueue.cleanOldJobs(7)

    console.log("Queue manager shutdown completed.")
    this.emit("shutdown-complete")
  }

  /**
   * Force clean specific queue type
   */
  async clearQueue(
    queueType: JobType,
    includeActive: boolean = false
  ): Promise<void> {
    const queue = jobQueue.getQueues()[queueType]

    if (includeActive) {
      await queue.obliterate()
    } else {
      await queue.clean(0, "completed")
      await queue.clean(0, "failed")
      await queue.clean(0, "waiting")
    }

    this.emit("queue-cleared", { queueType, includeActive })
  }

  /**
   * Retry failed jobs within a time range
   */
  async retryFailedJobs(
    queueType?: JobType,
    hoursBack: number = 24,
    maxRetries: number = 50
  ): Promise<{ retried: number; skipped: number }> {
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack)

    const whereConditions: any = {
      status: JobStatus.FAILED,
      completedAt: {
        gte: cutoffTime,
      },
      retryCount: {
        lt: 3, // Only retry jobs that haven't exceeded max retries
      },
    }

    if (queueType) {
      whereConditions.type = queueType
    }

    const failedJobs = await prisma.workflowQueue.findMany({
      where: whereConditions,
      take: maxRetries,
      orderBy: { completedAt: "desc" },
    })

    let retried = 0
    let skipped = 0

    for (const job of failedJobs) {
      try {
        const jobData = JSON.parse(job.payload)
        await this.createJob(job.type as JobType, jobData, {
          priority: job.priority as JobPriority,
        })
        retried++
      } catch (error) {
        console.error(`Failed to retry job ${job.id}:`, error)
        skipped++
      }
    }

    this.emit("failed-jobs-retried", { retried, skipped, queueType })
    return { retried, skipped }
  }

  /**
   * Get recent jobs for CLI display
   */
  async getRecentJobs(limit: number = 50, type?: JobType): Promise<Job[]> {
    const whereConditions: any = {}
    if (type) {
      whereConditions.type = type
    }

    const dbJobs = await prisma.workflowQueue.findMany({
      where: whereConditions,
      take: limit,
      orderBy: { createdAt: "desc" },
    })

    return dbJobs.map((job) => ({
      id: job.id,
      type: job.type as JobType,
      data: JSON.parse(job.payload),
      priority: job.priority as JobPriority,
      status: job.status as JobStatus,
      result: job.result ? JSON.parse(job.result) : undefined,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      scheduledFor: job.scheduledFor,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      createdAt: job.createdAt,
      error: job.error || undefined,
    }))
  }

  /**
   * Get user jobs (already exists in base queue, but ensure it's available)
   */
  async getUserJobs(userId: string, limit: number = 50): Promise<Job[]> {
    return jobQueue.getUserJobs(userId, limit)
  }
}

// Export singleton instance
export const queueManager = QueueManager.getInstance()

// Export types
export { JobPriority, JobStatus, JobType } from "./types"
export type { Job, JobData, JobProgress, JobResult } from "./types"
