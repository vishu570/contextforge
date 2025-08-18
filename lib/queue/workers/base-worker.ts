import { Job as BullJob } from 'bull';
import { JobType, JobData, JobResult, JobProgress, JobStatus } from '../types';
import { jobQueue } from '../index';
import { WebSocketManager } from '../../websocket/manager';

export abstract class BaseWorker<T extends JobData = JobData> {
  protected jobType: JobType;
  protected maxConcurrency: number;

  constructor(jobType: JobType, maxConcurrency: number = 1) {
    this.jobType = jobType;
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Abstract method that must be implemented by each worker
   */
  abstract process(data: T, progress: (progress: JobProgress) => Promise<void>): Promise<JobResult>;

  /**
   * Process a job with error handling and progress tracking
   */
  async processJob(job: BullJob<T>): Promise<JobResult> {
    const jobId = job.id.toString();
    const wsManager = WebSocketManager.getInstance();

    try {
      // Update job status to processing
      await jobQueue.updateJobStatus(jobId, JobStatus.PROCESSING);
      
      // Notify via WebSocket
      wsManager.notifyJobStarted(jobId, this.jobType, job.data);

      // Progress callback
      const progressCallback = async (progress: JobProgress) => {
        await jobQueue.updateJobProgress(jobId, progress);
        wsManager.notifyJobProgress(jobId, progress);
      };

      // Process the job
      const result = await this.process(job.data, progressCallback);

      // Update job status to completed
      await jobQueue.updateJobStatus(jobId, JobStatus.COMPLETED, result);
      
      // Notify completion
      wsManager.notifyJobCompleted(jobId, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Increment retry count
      await jobQueue.incrementRetryCount(jobId);
      
      // Check if we should retry
      const jobData = await jobQueue.getJobStatus(jobId);
      const shouldRetry = jobData && jobData.retryCount < jobData.maxRetries;

      if (shouldRetry) {
        await jobQueue.updateJobStatus(jobId, JobStatus.RETRY, undefined, errorMessage);
        wsManager.notifyJobRetry(jobId, errorMessage, jobData.retryCount);
        throw error; // Let Bull handle the retry
      } else {
        // Mark as failed
        await jobQueue.updateJobStatus(jobId, JobStatus.FAILED, undefined, errorMessage);
        wsManager.notifyJobFailed(jobId, errorMessage);
        
        const result: JobResult = {
          success: false,
          error: errorMessage,
        };
        
        return result;
      }
    }
  }

  /**
   * Get the job type
   */
  getJobType(): JobType {
    return this.jobType;
  }

  /**
   * Get max concurrency
   */
  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  /**
   * Validate job data (override in subclasses for specific validation)
   */
  protected validateJobData(data: T): boolean {
    return data && typeof data === 'object' && 'userId' in data;
  }

  /**
   * Handle job failure (override for custom failure handling)
   */
  protected async handleJobFailure(jobId: string, error: Error): Promise<void> {
    console.error(`Job ${jobId} failed:`, error);
  }

  /**
   * Handle job completion (override for custom completion handling)
   */
  protected async handleJobCompletion(jobId: string, result: JobResult): Promise<void> {
    console.log(`Job ${jobId} completed successfully`);
  }
}