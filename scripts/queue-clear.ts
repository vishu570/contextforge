#!/usr/bin/env ts-node

import { queueManager } from '../lib/queue/manager';
import { JobType } from '../lib/queue/types';
import chalk from 'chalk';
import readline from 'readline';

/**
 * Queue Clear CLI Tool
 * 
 * Usage:
 * pnpm queue:clear [queue-type] [--force] [--active] [--failed-only]
 */

interface ClearOptions {
  queueType?: JobType;
  force?: boolean;
  includeActive?: boolean;
  failedOnly?: boolean;
  retryFailed?: boolean;
}

async function parseArgs(): Promise<ClearOptions> {
  const args = process.argv.slice(2);
  const options: ClearOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      switch (arg) {
        case '--force':
        case '-f':
          options.force = true;
          break;
        case '--active':
        case '-a':
          options.includeActive = true;
          break;
        case '--failed-only':
          options.failedOnly = true;
          break;
        case '--retry-failed':
          options.retryFailed = true;
          break;
        case '--help':
        case '-h':
          showHelp();
          process.exit(0);
          break;
      }
    } else {
      // First non-option argument is queue type
      if (Object.values(JobType).includes(arg as JobType)) {
        options.queueType = arg as JobType;
      } else {
        console.error(chalk.red(`Invalid queue type: ${arg}`));
        showValidQueueTypes();
        process.exit(1);
      }
    }
  }

  return options;
}

function showHelp() {
  console.log(`
${chalk.bold('Queue Clear CLI')}

Usage:
  pnpm queue:clear [queue-type] [options]

Arguments:
  queue-type         Specific queue to clear (optional, clears all if not specified)

Options:
  -f, --force        Skip confirmation prompt
  -a, --active       Include active/running jobs (dangerous!)
  --failed-only      Only clear failed jobs
  --retry-failed     Retry failed jobs instead of clearing them
  -h, --help         Show this help message

Queue Types:
  ${Object.values(JobType).join(', ')}

Examples:
  pnpm queue:clear                        # Clear all completed/failed jobs (with confirmation)
  pnpm queue:clear optimization           # Clear only optimization queue
  pnpm queue:clear --failed-only          # Clear only failed jobs
  pnpm queue:clear --retry-failed         # Retry failed jobs from last 24h
  pnpm queue:clear optimization --force   # Clear optimization queue without confirmation
  pnpm queue:clear --active --force       # Clear all jobs including active ones (dangerous!)
  `);
}

function showValidQueueTypes() {
  console.log('\nValid queue types:');
  Object.values(JobType).forEach(type => {
    console.log(`  ${chalk.cyan(type)}`);
  });
}

async function confirmAction(options: ClearOptions): Promise<boolean> {
  if (options.force) return true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = options.retryFailed
    ? `Retry failed jobs from the last 24 hours${options.queueType ? ` in ${options.queueType} queue` : ' in all queues'}?`
    : `Clear ${options.queueType || 'all'} queue(s)${options.includeActive ? ' including active jobs' : ''}${options.failedOnly ? ' (failed jobs only)' : ''}?`;

  return new Promise((resolve) => {
    rl.question(chalk.yellow(`${question} [y/N]: `), (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

async function retryFailedJobs(options: ClearOptions) {
  console.log(chalk.blue('🔄 Retrying failed jobs...'));
  
  const { retried, skipped } = await queueManager.retryFailedJobs(
    options.queueType,
    24, // Last 24 hours
    100 // Max 100 jobs
  );

  console.log(chalk.green(`✅ Retry operation completed:`));
  console.log(`  Retried: ${chalk.green(retried)} jobs`);
  console.log(`  Skipped: ${chalk.yellow(skipped)} jobs`);
}

async function clearJobs(options: ClearOptions) {
  console.log(chalk.blue('🧹 Clearing jobs...'));
  
  if (options.failedOnly) {
    // Clear only failed jobs from database
    const deletedCount = await clearFailedJobsFromDB(options.queueType);
    console.log(chalk.green(`✅ Cleared ${deletedCount} failed jobs from database`));
    return;
  }

  if (options.queueType) {
    // Clear specific queue
    await queueManager.clearQueue(options.queueType, options.includeActive);
    console.log(chalk.green(`✅ Cleared ${options.queueType} queue`));
  } else {
    // Clear all queues
    const queueTypes = Object.values(JobType);
    for (const queueType of queueTypes) {
      await queueManager.clearQueue(queueType, options.includeActive);
    }
    console.log(chalk.green(`✅ Cleared all queues`));
  }

  // Also clean old jobs from database
  await queueManager.cleanOldJobs(0); // Clean all completed/failed jobs
  console.log(chalk.green(`✅ Cleaned old jobs from database`));
}

async function clearFailedJobsFromDB(queueType?: JobType): Promise<number> {
  const { prisma } = await import('../lib/db');
  
  const whereConditions: any = {
    status: 'failed',
  };

  if (queueType) {
    whereConditions.type = queueType;
  }

  const result = await prisma.workflowQueue.deleteMany({
    where: whereConditions,
  });

  return result.count;
}

async function showStatsBefore() {
  console.log(chalk.bold('📊 Current Queue Statistics:\n'));
  
  const stats = await queueManager.getQueueStatistics();
  
  console.log(`Total Jobs: ${stats.system.totalJobs}`);
  console.log(`Active Jobs: ${chalk.blue(stats.system.activeJobs)}`);
  console.log(`Completed Today: ${chalk.green(stats.system.completedToday)}`);
  console.log(`Failed Today: ${chalk.red(stats.system.failedToday)}\n`);
  
  let hasActiveJobs = false;
  for (const [queueType, queueStats] of Object.entries(stats.queues)) {
    const total = queueStats.waiting + queueStats.active + queueStats.completed + queueStats.failed;
    if (total > 0) {
      console.log(`${chalk.cyan(queueType)}: W:${queueStats.waiting} A:${queueStats.active} C:${queueStats.completed} F:${queueStats.failed}`);
      if (queueStats.active > 0) hasActiveJobs = true;
    }
  }
  
  if (hasActiveJobs) {
    console.log(chalk.yellow('\n⚠️  Warning: There are active jobs running!'));
  }
  
  console.log('');
}

async function main() {
  try {
    const options = await parseArgs();
    
    console.log(chalk.bold.blue('🧹 ContextForge Queue Clear Tool\n'));
    
    // Show current stats
    await showStatsBefore();
    
    // Confirm action
    const confirmed = await confirmAction(options);
    if (!confirmed) {
      console.log(chalk.yellow('❌ Operation cancelled'));
      process.exit(0);
    }
    
    // Perform the requested action
    if (options.retryFailed) {
      await retryFailedJobs(options);
    } else {
      await clearJobs(options);
    }
    
    console.log(chalk.green('\n✅ Queue clear operation completed successfully'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error during queue clear operation:'));
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main as queueClear };