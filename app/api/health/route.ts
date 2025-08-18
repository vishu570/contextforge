import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { getWorkerStats } from '@/lib/queue/workers';
import { jobQueue } from '@/lib/queue';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    workers: HealthCheck;
    queues: HealthCheck;
    memory: HealthCheck;
  };
}

interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
  responseTime?: number;
}

// GET /api/health - Health check endpoint
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      workers: await checkWorkers(),
      queues: await checkQueues(),
      memory: checkMemory(),
    },
  };

  // Determine overall status
  const checkStatuses = Object.values(healthStatus.checks);
  if (checkStatuses.some(check => check.status === 'fail')) {
    healthStatus.status = 'unhealthy';
  } else if (checkStatuses.some(check => check.status === 'warn')) {
    healthStatus.status = 'degraded';
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                    healthStatus.status === 'degraded' ? 200 : 503;

  const responseTime = Date.now() - startTime;
  
  return NextResponse.json({
    ...healthStatus,
    responseTime,
  }, { status: statusCode });
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'pass',
      message: 'Database connection successful',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const testKey = `health_check_${Date.now()}`;
    await redis.set(testKey, 'test', 'EX', 10);
    const value = await redis.get(testKey);
    await redis.del(testKey);
    
    if (value === 'test') {
      return {
        status: 'pass',
        message: 'Redis connection successful',
        responseTime: Date.now() - start,
      };
    } else {
      return {
        status: 'fail',
        message: 'Redis data integrity check failed',
        responseTime: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Redis connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

async function checkWorkers(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const workerStats = await getWorkerStats();
    const unhealthyWorkers = Object.entries(workerStats).filter(
      ([_, stats]) => stats.health !== 'healthy'
    );

    if (unhealthyWorkers.length === 0) {
      return {
        status: 'pass',
        message: 'All workers healthy',
        details: workerStats,
        responseTime: Date.now() - start,
      };
    } else if (unhealthyWorkers.length < Object.keys(workerStats).length) {
      return {
        status: 'warn',
        message: `${unhealthyWorkers.length} workers reporting issues`,
        details: {
          unhealthy: unhealthyWorkers.map(([name, _]) => name),
          stats: workerStats,
        },
        responseTime: Date.now() - start,
      };
    } else {
      return {
        status: 'fail',
        message: 'All workers unhealthy',
        details: workerStats,
        responseTime: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Worker health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

async function checkQueues(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const queueStats = await jobQueue.getQueueStats();
    const totalFailed = Object.values(queueStats).reduce(
      (sum: number, stats: any) => sum + (stats.failed || 0), 0
    );
    const totalActive = Object.values(queueStats).reduce(
      (sum: number, stats: any) => sum + (stats.active || 0), 0
    );

    // Warn if there are many failed jobs or very high active job count
    if (totalFailed > 10) {
      return {
        status: 'warn',
        message: `High number of failed jobs: ${totalFailed}`,
        details: queueStats,
        responseTime: Date.now() - start,
      };
    } else if (totalActive > 50) {
      return {
        status: 'warn',
        message: `High number of active jobs: ${totalActive}`,
        details: queueStats,
        responseTime: Date.now() - start,
      };
    } else {
      return {
        status: 'pass',
        message: 'Queues operating normally',
        details: queueStats,
        responseTime: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Queue health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

function checkMemory(): HealthCheck {
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024),
  };

  // Warn if heap usage is over 80% of heap total
  const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  if (heapUsagePercent > 90) {
    return {
      status: 'fail',
      message: `Critical memory usage: ${heapUsagePercent.toFixed(1)}%`,
      details: memoryUsageMB,
    };
  } else if (heapUsagePercent > 80) {
    return {
      status: 'warn',
      message: `High memory usage: ${heapUsagePercent.toFixed(1)}%`,
      details: memoryUsageMB,
    };
  } else {
    return {
      status: 'pass',
      message: `Memory usage normal: ${heapUsagePercent.toFixed(1)}%`,
      details: memoryUsageMB,
    };
  }
}