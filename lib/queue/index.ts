import Bull, { Queue, Job as BullJob, JobOptions } from 'bull';
import { redis } from '../redis';
import { JobType, JobPriority, JobStatus /*, JobData, JobResult, JobProgress, Job */ } from './types';
import { prisma } from '../db';

// Queue configuration
const queueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// Create queues for different job types
const queues: Record<JobType, Queue> = {
  [JobType.CLASSIFICATION]: new Bull('classification', queueConfig),
  [JobType.OPTIMIZATION]: new Bull('optimization', queueConfig),
  [JobType.CONVERSION]: new Bull('conversion', queueConfig),
  [JobType.DEDUPLICATION]: new Bull('deduplication', queueConfig),
  [JobType.FOLDER_SUGGESTION]: new Bull('folder-suggestion', queueConfig),
  [JobType.BATCH_IMPORT]: new Bull('batch-import', queueConfig),
  [JobType.QUALITY_ASSESSMENT]: new Bull('quality-assessment', queueConfig),
  [JobType.SIMILARITY_SCORING]: new Bull('similarity-scoring', queueConfig),
  // New intelligence queues
  [JobType.EMBEDDING_GENERATION]: new Bull('embedding-generation', queueConfig),
  [JobType.CONTENT_ANALYSIS]: new Bull('content-analysis', queueConfig),
  [JobType.SEMANTIC_CLUSTERING]: new Bull('semantic-clustering', queueConfig),
  [JobType.MODEL_OPTIMIZATION]: new Bull('model-optimization', queueConfig),
  [JobType.CONTEXT_ASSEMBLY]: new Bull('context-assembly', queueConfig),
  [JobType.INTELLIGENCE_PIPELINE]: new Bull('intelligence-pipeline', queueConfig),
};

export class JobQueue {
  private static instance: JobQueue;

  private constructor() {}

  public static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    type: JobType,
    data: JobData,
    options: {
      priority?: JobPriority;
      delay?: number;
      retries?: number;
      scheduledFor?: Date;
    } = {}
  ): Promise<string> {
    const queue = queues[type];
    
    const jobOptions: JobOptions = {
      priority: options.priority || JobPriority.NORMAL,
      delay: options.delay || 0,
      attempts: options.retries || 3,
    };

    // Add to Bull queue
    const bullJob = await queue.add(data, jobOptions);

    // Store in database for persistence and tracking
    const dbJob = await prisma.workflowQueue.create({
      data: {
        id: bullJob.id.toString(),
        type,
        status: JobStatus.PENDING,
        priority: options.priority || JobPriority.NORMAL,
        payload: JSON.stringify(data),
        maxRetries: options.retries || 3,
        scheduledFor: options.scheduledFor || new Date(),
      },
    });

    return dbJob.id;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<Job | null> {
    const dbJob = await prisma.workflowQueue.findUnique({
      where: { id: jobId },
    });

    if (!dbJob) return null;

    return {
      id: dbJob.id,
      type: dbJob.type as JobType,
      data: JSON.parse(dbJob.payload),
      priority: dbJob.priority as JobPriority,
      status: dbJob.status as JobStatus,
      result: dbJob.result ? JSON.parse(dbJob.result) : undefined,
      retryCount: dbJob.retryCount,
      maxRetries: dbJob.maxRetries,
      scheduledFor: dbJob.scheduledFor,
      startedAt: dbJob.startedAt || undefined,
      completedAt: dbJob.completedAt || undefined,
      createdAt: dbJob.createdAt,
      error: dbJob.error || undefined,
    };
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    result?: JobResult,
    error?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      error,
    };

    if (status === JobStatus.PROCESSING && !await this.getJobStartTime(jobId)) {
      updateData.startedAt = new Date();
    }

    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED || status === JobStatus.DEAD) {
      updateData.completedAt = new Date();
    }

    if (result) {
      updateData.result = JSON.stringify(result);
    }

    await prisma.workflowQueue.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  /**
   * Update job progress
   */
  async updateJobProgress(jobId: string, progress: JobProgress): Promise<void> {
    // Store progress in Redis for real-time updates
    await redis.setex(`job_progress:${jobId}`, 300, JSON.stringify(progress));
  }

  /**
   * Get job progress
   */
  async getJobProgress(jobId: string): Promise<JobProgress | null> {
    const progressData = await redis.get(`job_progress:${jobId}`);
    return progressData ? JSON.parse(progressData) : null;
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(jobId: string): Promise<void> {
    await prisma.workflowQueue.update({
      where: { id: jobId },
      data: {
        retryCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: JobStatus, limit: number = 100): Promise<Job[]> {
    const dbJobs = await prisma.workflowQueue.findMany({
      where: { status },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return dbJobs.map(job => ({
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
    }));
  }

  /**
   * Get user jobs
   */
  async getUserJobs(userId: string, limit: number = 50): Promise<Job[]> {
    const dbJobs = await prisma.workflowQueue.findMany({
      where: {
        payload: {
          contains: `"userId":"${userId}"`,
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return dbJobs.map(job => ({
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
    }));
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      // Find which queue the job belongs to
      for (const [type, queue] of Object.entries(queues)) {
        const bullJob = await queue.getJob(jobId);
        if (bullJob) {
          await bullJob.remove();
          break;
        }
      }

      await this.updateJobStatus(jobId, JobStatus.FAILED, undefined, 'Job cancelled by user');
      return true;
    } catch (error) {
      console.error('Error cancelling job:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<JobType, any>> {
    const stats: Record<JobType, any> = {} as any;

    for (const [type, queue] of Object.entries(queues)) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      stats[type as JobType] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    }

    return stats;
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(olderThanDays: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    await prisma.workflowQueue.deleteMany({
      where: {
        completedAt: {
          lt: cutoffDate,
        },
        status: {
          in: [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.DEAD],
        },
      },
    });
  }

  /**
   * Get job start time
   */
  private async getJobStartTime(jobId: string): Promise<Date | null> {
    const job = await prisma.workflowQueue.findUnique({
      where: { id: jobId },
      select: { startedAt: true },
    });
    return job?.startedAt || null;
  }

  /**
   * Get all queues (for monitoring)
   */
  getQueues(): Record<JobType, Queue> {
    return queues;
  }
}

export const jobQueue = JobQueue.getInstance();
export { queues };

// Re-export types
export {
  JobType,
  JobPriority,
  JobStatus,
  // JobData,
  // JobResult,
  // JobProgress,
  // Job,
  WebSocketMessageType,
  // WebSocketMessage,
} from './types';