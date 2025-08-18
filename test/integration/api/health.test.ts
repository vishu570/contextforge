import { describe, expect, test, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';
import { mockPrisma, mockRedis, resetAllMocks } from '@/test/mocks/services';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/lib/redis', () => ({
  redis: mockRedis,
}));

jest.mock('@/lib/queue/workers', () => ({
  getWorkerStats: jest.fn(),
}));

jest.mock('@/lib/queue', () => ({
  jobQueue: {
    getQueueStats: jest.fn(),
  },
}));

describe('/api/health', () => {
  beforeEach(() => {
    resetAllMocks();
    
    // Setup default successful responses
    mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue('test');
    mockRedis.del.mockResolvedValue(1);
    
    const { getWorkerStats } = require('@/lib/queue/workers');
    getWorkerStats.mockResolvedValue({
      'optimization-worker': { health: 'healthy', processedJobs: 10 },
      'classification-worker': { health: 'healthy', processedJobs: 5 },
    });
    
    const { jobQueue } = require('@/lib/queue');
    jobQueue.getQueueStats.mockResolvedValue({
      optimization: { pending: 2, active: 1, completed: 10, failed: 0 },
      classification: { pending: 0, active: 0, completed: 5, failed: 1 },
    });
  });

  test('should return healthy status when all checks pass', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks).toBeDefined();
    expect(data.checks.database.status).toBe('pass');
    expect(data.checks.redis.status).toBe('pass');
    expect(data.checks.workers.status).toBe('pass');
    expect(data.checks.queues.status).toBe('pass');
    expect(data.checks.memory.status).toBe('pass');
    expect(data.uptime).toBeGreaterThan(0);
    expect(data.responseTime).toBeGreaterThan(0);
  });

  test('should return degraded status when some checks warn', async () => {
    // Mock high failed job count to trigger warning
    const { jobQueue } = require('@/lib/queue');
    jobQueue.getQueueStats.mockResolvedValue({
      optimization: { pending: 2, active: 1, completed: 10, failed: 15 }, // High failed count
      classification: { pending: 0, active: 0, completed: 5, failed: 0 },
    });

    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('degraded');
    expect(data.checks.queues.status).toBe('warn');
    expect(data.checks.queues.message).toContain('High number of failed jobs');
  });

  test('should return unhealthy status when critical checks fail', async () => {
    // Mock database failure
    mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database.status).toBe('fail');
    expect(data.checks.database.message).toBe('Database connection failed');
  });

  describe('Database Health Check', () => {
    test('should pass when database is accessible', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.database.status).toBe('pass');
      expect(data.checks.database.responseTime).toBeGreaterThan(0);
    });

    test('should fail when database is not accessible', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection timeout'));

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.database.status).toBe('fail');
      expect(data.checks.database.details).toBe('Connection timeout');
    });
  });

  describe('Redis Health Check', () => {
    test('should pass when Redis is accessible and data integrity is maintained', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue('test');
      mockRedis.del.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.redis.status).toBe('pass');
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
    });

    test('should fail when Redis connection fails', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection refused'));

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.redis.status).toBe('fail');
      expect(data.checks.redis.details).toBe('Redis connection refused');
    });

    test('should fail when Redis data integrity check fails', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue('wrong_value'); // Wrong value returned
      mockRedis.del.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.redis.status).toBe('fail');
      expect(data.checks.redis.message).toBe('Redis data integrity check failed');
    });
  });

  describe('Workers Health Check', () => {
    test('should pass when all workers are healthy', async () => {
      const { getWorkerStats } = require('@/lib/queue/workers');
      getWorkerStats.mockResolvedValue({
        'optimization-worker': { health: 'healthy', processedJobs: 10 },
        'classification-worker': { health: 'healthy', processedJobs: 5 },
        'deduplication-worker': { health: 'healthy', processedJobs: 3 },
      });

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.workers.status).toBe('pass');
      expect(data.checks.workers.message).toBe('All workers healthy');
    });

    test('should warn when some workers are unhealthy', async () => {
      const { getWorkerStats } = require('@/lib/queue/workers');
      getWorkerStats.mockResolvedValue({
        'optimization-worker': { health: 'healthy', processedJobs: 10 },
        'classification-worker': { health: 'degraded', processedJobs: 5 },
        'deduplication-worker': { health: 'unhealthy', processedJobs: 0 },
      });

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.workers.status).toBe('warn');
      expect(data.checks.workers.message).toContain('workers reporting issues');
      expect(data.checks.workers.details.unhealthy).toContain('deduplication-worker');
    });

    test('should fail when all workers are unhealthy', async () => {
      const { getWorkerStats } = require('@/lib/queue/workers');
      getWorkerStats.mockResolvedValue({
        'optimization-worker': { health: 'unhealthy', processedJobs: 0 },
        'classification-worker': { health: 'unhealthy', processedJobs: 0 },
      });

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.workers.status).toBe('fail');
      expect(data.checks.workers.message).toBe('All workers unhealthy');
    });
  });

  describe('Queue Health Check', () => {
    test('should pass when queues are operating normally', async () => {
      const { jobQueue } = require('@/lib/queue');
      jobQueue.getQueueStats.mockResolvedValue({
        optimization: { pending: 2, active: 1, completed: 10, failed: 1 },
        classification: { pending: 0, active: 0, completed: 5, failed: 0 },
      });

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.queues.status).toBe('pass');
      expect(data.checks.queues.message).toBe('Queues operating normally');
    });

    test('should warn when there are too many failed jobs', async () => {
      const { jobQueue } = require('@/lib/queue');
      jobQueue.getQueueStats.mockResolvedValue({
        optimization: { pending: 2, active: 1, completed: 10, failed: 12 },
        classification: { pending: 0, active: 0, completed: 5, failed: 5 },
      });

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.queues.status).toBe('warn');
      expect(data.checks.queues.message).toContain('High number of failed jobs: 17');
    });

    test('should warn when there are too many active jobs', async () => {
      const { jobQueue } = require('@/lib/queue');
      jobQueue.getQueueStats.mockResolvedValue({
        optimization: { pending: 10, active: 30, completed: 10, failed: 0 },
        classification: { pending: 5, active: 25, completed: 5, failed: 0 },
      });

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.queues.status).toBe('warn');
      expect(data.checks.queues.message).toContain('High number of active jobs: 55');
    });
  });

  describe('Memory Health Check', () => {
    test('should pass when memory usage is normal', async () => {
      // Mock normal memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        rss: 100 * 1024 * 1024, // 100MB
        heapTotal: 50 * 1024 * 1024, // 50MB
        heapUsed: 30 * 1024 * 1024, // 30MB (60% of heap)
        external: 10 * 1024 * 1024, // 10MB
        arrayBuffers: 5 * 1024 * 1024, // 5MB
      }));

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.memory.status).toBe('pass');
      expect(data.checks.memory.message).toContain('Memory usage normal');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    test('should warn when memory usage is high', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        rss: 200 * 1024 * 1024, // 200MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        heapUsed: 85 * 1024 * 1024, // 85MB (85% of heap)
        external: 20 * 1024 * 1024, // 20MB
        arrayBuffers: 10 * 1024 * 1024, // 10MB
      }));

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.memory.status).toBe('warn');
      expect(data.checks.memory.message).toContain('High memory usage');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    test('should fail when memory usage is critical', async () => {
      // Mock critical memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        rss: 300 * 1024 * 1024, // 300MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        heapUsed: 95 * 1024 * 1024, // 95MB (95% of heap)
        external: 30 * 1024 * 1024, // 30MB
        arrayBuffers: 15 * 1024 * 1024, // 15MB
      }));

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.memory.status).toBe('fail');
      expect(data.checks.memory.message).toContain('Critical memory usage');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Response Format', () => {
    test('should include all required fields in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        responseTime: expect.any(Number),
        checks: {
          database: {
            status: expect.stringMatching(/^(pass|warn|fail)$/),
            message: expect.any(String),
            responseTime: expect.any(Number),
          },
          redis: {
            status: expect.stringMatching(/^(pass|warn|fail)$/),
            message: expect.any(String),
            responseTime: expect.any(Number),
          },
          workers: {
            status: expect.stringMatching(/^(pass|warn|fail)$/),
            message: expect.any(String),
            responseTime: expect.any(Number),
          },
          queues: {
            status: expect.stringMatching(/^(pass|warn|fail)$/),
            message: expect.any(String),
            responseTime: expect.any(Number),
          },
          memory: {
            status: expect.stringMatching(/^(pass|warn|fail)$/),
            message: expect.any(String),
          },
        },
      });
    });

    test('should include timestamp in ISO format', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });
  });
});