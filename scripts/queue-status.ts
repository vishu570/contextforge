#!/usr/bin/env ts-node

import { queueManager } from '../lib/queue/manager';
import { JobType, JobPriority, JobStatus } from '../lib/queue/types';
import chalk from 'chalk';

/**
 * Queue Status CLI Tool
 * 
 * Usage:
 * pnpm queue:status [--detailed] [--type <queue-type>] [--user <user-id>]
 */

interface StatusOptions {
  detailed?: boolean;
  type?: JobType;
  user?: string;
}

async function parseArgs(): Promise<StatusOptions> {
  const args = process.argv.slice(2);
  const options: StatusOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--detailed':
      case '-d':
        options.detailed = true;
        break;
      case '--type':
      case '-t':
        options.type = args[++i] as JobType;
        break;
      case '--user':
      case '-u':
        options.user = args[++i];
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
${chalk.bold('Queue Status CLI')}

Usage:
  pnpm queue:status [options]

Options:
  -d, --detailed     Show detailed job information
  -t, --type <type>  Filter by queue type
  -u, --user <id>    Filter by user ID
  -h, --help         Show this help message

Queue Types:
  ${Object.values(JobType).join(', ')}

Examples:
  pnpm queue:status
  pnpm queue:status --detailed
  pnpm queue:status --type optimization
  pnpm queue:status --user user123 --detailed
  `);
}

function formatJobStatus(status: JobStatus): string {
  const colors: Record<JobStatus, any> = {
    [JobStatus.PENDING]: chalk.yellow,
    [JobStatus.PROCESSING]: chalk.blue,
    [JobStatus.COMPLETED]: chalk.green,
    [JobStatus.FAILED]: chalk.red,
    [JobStatus.RETRY]: chalk.orange,
    [JobStatus.DEAD]: chalk.gray,
  };
  return colors[status]?.(status.toUpperCase()) || status;
}

function formatJobPriority(priority: JobPriority): string {
  const colors: Record<JobPriority, any> = {
    [JobPriority.LOW]: chalk.gray,
    [JobPriority.NORMAL]: chalk.white,
    [JobPriority.HIGH]: chalk.yellow,
    [JobPriority.CRITICAL]: chalk.red,
  };
  const names = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
  return colors[priority]?.(names[priority]) || priority.toString();
}

function formatDuration(startTime: Date, endTime?: Date): string {
  const end = endTime || new Date();
  const duration = end.getTime() - startTime.getTime();
  
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${Math.round(duration / 1000)}s`;
  if (duration < 3600000) return `${Math.round(duration / 60000)}m`;
  return `${Math.round(duration / 3600000)}h`;
}

async function showQueueStatistics(options: StatusOptions) {
  const stats = await queueManager.getQueueStatistics();
  
  console.log(chalk.bold('\n📊 Queue Statistics\n'));
  
  // System overview
  console.log(chalk.bold('System Overview:'));
  console.log(`  Total Jobs: ${stats.system.totalJobs}`);
  console.log(`  Active Jobs: ${chalk.blue(stats.system.activeJobs)}`);
  console.log(`  Completed Today: ${chalk.green(stats.system.completedToday)}`);
  console.log(`  Failed Today: ${chalk.red(stats.system.failedToday)}`);
  console.log(`  Avg Processing Time: ${stats.system.avgProcessingTime}s`);
  
  console.log(chalk.bold('\nQueue Breakdown:'));
  
  // Filter queues if type specified
  const queues = options.type 
    ? { [options.type]: stats.queues[options.type] }
    : stats.queues;
  
  for (const [queueType, queueStats] of Object.entries(queues)) {
    if (!queueStats) continue;
    
    const total = queueStats.waiting + queueStats.active + queueStats.completed + queueStats.failed;
    if (total === 0 && !options.detailed) continue;
    
    console.log(`\n  ${chalk.cyan(queueType)}:`);
    console.log(`    Waiting: ${chalk.yellow(queueStats.waiting)}`);
    console.log(`    Active: ${chalk.blue(queueStats.active)}`);
    console.log(`    Completed: ${chalk.green(queueStats.completed)}`);
    console.log(`    Failed: ${chalk.red(queueStats.failed)}`);
    console.log(`    Total: ${total}`);
  }
}

async function showJobDetails(options: StatusOptions) {
  if (!options.detailed) return;
  
  console.log(chalk.bold('\n📝 Recent Job Details\n'));
  
  const recentJobs = options.user
    ? await queueManager.getUserJobs(options.user, 20)
    : await queueManager.getRecentJobs(20, options.type);
  
  if (recentJobs.length === 0) {
    console.log(chalk.gray('No recent jobs found.'));
    return;
  }
  
  for (const job of recentJobs) {
    console.log(`${chalk.bold('Job:')} ${job.id}`);
    console.log(`  Type: ${chalk.cyan(job.type)}`);
    console.log(`  Status: ${formatJobStatus(job.status)}`);
    console.log(`  Priority: ${formatJobPriority(job.priority)}`);
    console.log(`  Created: ${job.createdAt.toLocaleString()}`);
    
    if (job.startedAt) {
      const duration = job.completedAt 
        ? formatDuration(job.startedAt, job.completedAt)
        : formatDuration(job.startedAt);
      console.log(`  Duration: ${duration}`);
    }
    
    if (job.retryCount > 0) {
      console.log(`  Retries: ${job.retryCount}/${job.maxRetries}`);
    }
    
    if (job.error) {
      console.log(`  Error: ${chalk.red(job.error.substring(0, 100))}${job.error.length > 100 ? '...' : ''}`);
    }
    
    if (job.progress) {
      console.log(`  Progress: ${job.progress.percentage}% - ${job.progress.message}`);
    }
    
    console.log('');
  }
}

async function main() {
  try {
    const options = await parseArgs();
    
    console.log(chalk.bold.blue('🔄 ContextForge Queue Status'));
    
    await showQueueStatistics(options);
    await showJobDetails(options);
    
    console.log(chalk.green('\n✅ Queue status retrieved successfully'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error retrieving queue status:'));
    console.error(error);
    process.exit(1);
  }
}

// Add method to queue manager for recent jobs
declare module '../lib/queue/manager' {
  interface QueueManager {
    getRecentJobs(limit: number, type?: JobType): Promise<Job[]>;
    getUserJobs(userId: string, limit: number): Promise<Job[]>;
  }
}

if (require.main === module) {
  main();
}

export { main as queueStatus };