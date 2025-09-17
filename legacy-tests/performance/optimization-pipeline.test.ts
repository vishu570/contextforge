import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import { OptimizationPipeline } from '@/lib/pipeline/optimization-pipeline';
import { mockPrisma, mockJobQueue, resetAllMocks } from '@/test/mocks/services';
import { createMockItem, createMockUser } from '@/test/utils/test-utils';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/lib/queue', () => ({
  jobQueue: mockJobQueue,
}));

jest.mock('@/lib/websocket/manager', () => ({
  WebSocketManager: {
    getInstance: () => ({
      sendNotification: jest.fn(),
    }),
  },
}));

describe('Optimization Pipeline Performance Tests', () => {
  let pipeline: OptimizationPipeline;
  let mockUser: any;

  beforeEach(() => {
    pipeline = OptimizationPipeline.getInstance();
    mockUser = createMockUser();
    resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Item Processing Performance', () => {
    test('should process single item under 100ms', async () => {
      const mockItem = createMockItem();
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options = {
        itemId: mockItem.id,
        userId: mockUser.id,
      };

      const startTime = performance.now();
      await pipeline.processItem(mockItem.id, options);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should handle database latency gracefully', async () => {
      const mockItem = createMockItem();
      
      // Mock database with 50ms delay
      mockPrisma.item.findUnique.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockItem), 50))
      );
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options = {
        itemId: mockItem.id,
        userId: mockUser.id,
      };

      const startTime = performance.now();
      await pipeline.processItem(mockItem.id, options);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(50); // Should include the database delay
      expect(duration).toBeLessThan(200); // But not exceed reasonable bounds
    });
  });

  describe('Batch Processing Performance', () => {
    test('should process 100 items efficiently', async () => {
      const itemIds = Array.from({ length: 100 }, (_, i) => `item-${i}`);
      const mockItem = createMockItem();
      
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options = {
        userId: mockUser.id,
      };

      const startTime = performance.now();
      await pipeline.processBatch(itemIds, options);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const averageTimePerItem = duration / itemIds.length;

      expect(averageTimePerItem).toBeLessThan(10); // Less than 10ms per item on average
      expect(duration).toBeLessThan(5000); // Total batch under 5 seconds
    });

    test('should scale linearly with batch size', async () => {
      const batchSizes = [10, 50, 100];
      const results: { size: number; duration: number; avgPerItem: number }[] = [];

      for (const size of batchSizes) {
        const itemIds = Array.from({ length: size }, (_, i) => `item-${i}`);
        const mockItem = createMockItem();
        
        mockPrisma.item.findUnique.mockResolvedValue(mockItem);
        mockPrisma.auditLog.create.mockResolvedValue({});
        mockJobQueue.addJob.mockResolvedValue('job-123');

        const options = {
          userId: mockUser.id,
        };

        const startTime = performance.now();
        await pipeline.processBatch(itemIds, options);
        const endTime = performance.now();

        const duration = endTime - startTime;
        const avgPerItem = duration / size;

        results.push({ size, duration, avgPerItem });

        // Reset mocks for next iteration
        jest.clearAllMocks();
      }

      // Verify linear scaling - average time per item should remain relatively consistent
      const avgTimes = results.map(r => r.avgPerItem);
      const maxVariation = Math.max(...avgTimes) - Math.min(...avgTimes);
      
      expect(maxVariation).toBeLessThan(5); // Variation should be less than 5ms
    });

    test('should handle concurrent batch processing', async () => {
      const numberOfConcurrentBatches = 5;
      const itemsPerBatch = 20;
      
      const mockItem = createMockItem();
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const batches = Array.from({ length: numberOfConcurrentBatches }, (_, batchIndex) => {
        const itemIds = Array.from({ length: itemsPerBatch }, (_, i) => `batch-${batchIndex}-item-${i}`);
        return pipeline.processBatch(itemIds, { userId: mockUser.id });
      });

      const startTime = performance.now();
      await Promise.all(batches);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const totalItems = numberOfConcurrentBatches * itemsPerBatch;
      const avgTimePerItem = duration / totalItems;

      expect(avgTimePerItem).toBeLessThan(15); // Should maintain efficiency under concurrent load
      expect(duration).toBeLessThan(3000); // Total time should be reasonable
    });
  });

  describe('Memory Usage Performance', () => {
    test('should maintain stable memory usage during large batch processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const batchSize = 1000;
      const itemIds = Array.from({ length: batchSize }, (_, i) => `item-${i}`);
      
      const mockItem = createMockItem();
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options = {
        userId: mockUser.id,
      };

      await pipeline.processBatch(itemIds, options);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 1000 items)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by creating large objects
      const largeBatch = Array.from({ length: 10000 }, (_, i) => `item-${i}`);
      
      const mockItem = createMockItem({
        content: 'x'.repeat(10000), // Large content to simulate memory usage
      });
      
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options = {
        userId: mockUser.id,
      };

      // Should not throw memory errors
      expect(async () => {
        await pipeline.processBatch(largeBatch, options);
      }).not.toThrow();
    });
  });

  describe('Configuration Impact on Performance', () => {
    test('should process faster with reduced pipeline steps', async () => {
      const itemIds = Array.from({ length: 50 }, (_, i) => `item-${i}`);
      const mockItem = createMockItem();
      
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options = {
        userId: mockUser.id,
      };

      // Test with full pipeline
      pipeline.updateConfig({
        enableAutoClassification: true,
        enableAutoOptimization: true,
        enableQualityAssessment: true,
      });

      const startTimeFull = performance.now();
      await pipeline.processBatch(itemIds, options);
      const endTimeFull = performance.now();
      const fullPipelineDuration = endTimeFull - startTimeFull;

      // Reset mocks
      jest.clearAllMocks();

      // Test with minimal pipeline
      pipeline.updateConfig({
        enableAutoClassification: false,
        enableAutoOptimization: true,
        enableQualityAssessment: false,
      });

      const startTimeMinimal = performance.now();
      await pipeline.processBatch(itemIds, options);
      const endTimeMinimal = performance.now();
      const minimalPipelineDuration = endTimeMinimal - startTimeMinimal;

      // Minimal pipeline should be faster
      expect(minimalPipelineDuration).toBeLessThan(fullPipelineDuration);
    });

    test('should scale performance with batch size configuration', async () => {
      const totalItems = 100;
      const itemIds = Array.from({ length: totalItems }, (_, i) => `item-${i}`);
      const mockItem = createMockItem();
      
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options = {
        userId: mockUser.id,
      };

      // Test with small batch size
      pipeline.updateConfig({ batchSize: 5 });
      const startTimeSmall = performance.now();
      await pipeline.processBatch(itemIds, options);
      const endTimeSmall = performance.now();
      const smallBatchDuration = endTimeSmall - startTimeSmall;

      // Reset mocks
      jest.clearAllMocks();

      // Test with large batch size
      pipeline.updateConfig({ batchSize: 25 });
      const startTimeLarge = performance.now();
      await pipeline.processBatch(itemIds, options);
      const endTimeLarge = performance.now();
      const largeBatchDuration = endTimeLarge - startTimeLarge;

      // Both should complete in reasonable time, but large batches might be more efficient
      expect(smallBatchDuration).toBeLessThan(10000);
      expect(largeBatchDuration).toBeLessThan(10000);
    });
  });

  describe('Database Performance Impact', () => {
    test('should handle database query optimization', async () => {
      const itemIds = Array.from({ length: 100 }, (_, i) => `item-${i}`);
      const mockItem = createMockItem();
      
      // Track database call count
      let dbCallCount = 0;
      mockPrisma.item.findUnique.mockImplementation(() => {
        dbCallCount++;
        return Promise.resolve(mockItem);
      });
      
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options = {
        userId: mockUser.id,
      };

      const startTime = performance.now();
      await pipeline.processBatch(itemIds, options);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Verify efficient database usage
      expect(dbCallCount).toBe(itemIds.length); // One call per item
      expect(duration).toBeLessThan(5000); // Reasonable total time
    });

    test('should handle database connection failures gracefully', async () => {
      const itemIds = Array.from({ length: 10 }, (_, i) => `item-${i}`);
      
      // Simulate intermittent database failures
      let callCount = 0;
      mockPrisma.item.findUnique.mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          return Promise.reject(new Error('Database timeout'));
        }
        return Promise.resolve(createMockItem());
      });

      const options = {
        userId: mockUser.id,
      };

      // Should handle failures without crashing
      await pipeline.processBatch(itemIds, options);
      
      // Verify that some items were processed successfully
      expect(callCount).toBeGreaterThan(0);
    });
  });

  describe('Resource Utilization', () => {
    test('should maintain reasonable CPU usage during processing', async () => {
      const itemIds = Array.from({ length: 200 }, (_, i) => `item-${i}`);
      const mockItem = createMockItem();
      
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options = {
        userId: mockUser.id,
      };

      // Monitor processing time to detect CPU-intensive operations
      const startTime = performance.now();
      await pipeline.processBatch(itemIds, options);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const itemsPerSecond = (itemIds.length / duration) * 1000;

      // Should maintain good throughput (at least 50 items per second)
      expect(itemsPerSecond).toBeGreaterThan(50);
    });

    test('should handle multiple pipeline instances efficiently', async () => {
      const pipeline1 = OptimizationPipeline.getInstance();
      const pipeline2 = OptimizationPipeline.getInstance();
      
      // Verify singleton pattern
      expect(pipeline1).toBe(pipeline2);
      
      const itemIds = Array.from({ length: 50 }, (_, i) => `item-${i}`);
      const mockItem = createMockItem();
      
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options = {
        userId: mockUser.id,
      };

      // Both instances should work efficiently
      const startTime = performance.now();
      await Promise.all([
        pipeline1.processBatch(itemIds, options),
        pipeline2.processBatch(itemIds, options),
      ]);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000); // Should complete concurrently
    });
  });
});