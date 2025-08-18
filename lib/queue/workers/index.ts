import { Queue } from 'bull';
import { ClassificationWorker } from './classification-worker';
import { OptimizationWorker } from './optimization-worker';
import { DeduplicationWorker } from './deduplication-worker';
import { QualityAssessmentWorker } from './quality-assessment-worker';
import { JobType } from '../types';
import { queues } from '../index';

// Worker instances
const workers = {
  classification: new ClassificationWorker(),
  optimization: new OptimizationWorker(),
  deduplication: new DeduplicationWorker(),
  qualityAssessment: new QualityAssessmentWorker(),
};

/**
 * Initialize all workers and set up job processing
 */
export function initializeWorkers(): void {
  console.log('Initializing background workers...');

  // Set up classification worker
  queues[JobType.CLASSIFICATION].process(
    workers.classification.getMaxConcurrency(),
    async (job) => {
      return await workers.classification.processJob(job);
    }
  );

  // Set up optimization worker
  queues[JobType.OPTIMIZATION].process(
    workers.optimization.getMaxConcurrency(),
    async (job) => {
      return await workers.optimization.processJob(job);
    }
  );

  // Set up deduplication worker
  queues[JobType.DEDUPLICATION].process(
    workers.deduplication.getMaxConcurrency(),
    async (job) => {
      return await workers.deduplication.processJob(job);
    }
  );

  // Set up quality assessment worker
  queues[JobType.QUALITY_ASSESSMENT].process(
    workers.qualityAssessment.getMaxConcurrency(),
    async (job) => {
      return await workers.qualityAssessment.processJob(job);
    }
  );

  // Set up error handlers
  setupErrorHandlers();

  console.log('Background workers initialized successfully');
}

/**
 * Set up error handlers for all queues
 */
function setupErrorHandlers(): void {
  Object.entries(queues).forEach(([jobType, queue]) => {
    queue.on('failed', (job, err) => {
      console.error(`Job ${job.id} of type ${jobType} failed:`, err);
    });

    queue.on('stalled', (job) => {
      console.warn(`Job ${job.id} of type ${jobType} stalled`);
    });

    queue.on('completed', (job, result) => {
      console.log(`Job ${job.id} of type ${jobType} completed successfully`);
    });

    queue.on('active', (job) => {
      console.log(`Job ${job.id} of type ${jobType} started processing`);
    });
  });
}

/**
 * Gracefully shutdown all workers
 */
export async function shutdownWorkers(): Promise<void> {
  console.log('Shutting down background workers...');
  
  const shutdownPromises = Object.values(queues).map(queue => queue.close());
  await Promise.all(shutdownPromises);
  
  console.log('Background workers shut down successfully');
}

/**
 * Get worker statistics
 */
export async function getWorkerStats(): Promise<Record<string, any>> {
  const stats: Record<string, any> = {};

  for (const [jobType, queue] of Object.entries(queues)) {
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    const delayed = await queue.getDelayed();

    stats[jobType] = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      health: active.length < 10 ? 'healthy' : 'busy', // Simple health check
    };
  }

  return stats;
}

// Graceful shutdown on process termination
process.on('SIGINT', async () => {
  await shutdownWorkers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownWorkers();
  process.exit(0);
});

export { workers };