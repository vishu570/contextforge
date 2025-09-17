import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { OptimizationPipeline, PipelineConfig, OptimizationOptions } from '@/lib/pipeline/optimization-pipeline';
import { JobType, JobPriority } from '@/lib/queue/types';
import { mockPrisma, mockJobQueue, mockWebSocketManager, resetAllMocks } from '@/test/mocks/services';
import { createMockItem, createMockUser } from '@/test/utils/test-utils';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/lib/queue', () => ({
  jobQueue: mockJobQueue,
}));

jest.mock('@/lib/websocket/manager', () => ({
  WebSocketManager: mockWebSocketManager,
}));

describe('OptimizationPipeline', () => {
  let pipeline: OptimizationPipeline;
  let mockItem: any;
  let mockUser: any;

  beforeEach(() => {
    pipeline = OptimizationPipeline.getInstance();
    mockItem = createMockItem();
    mockUser = createMockUser();
    resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Pipeline Configuration', () => {
    test('should have default configuration', () => {
      const config = pipeline.getConfig();
      
      expect(config).toMatchObject({
        enableAutoClassification: true,
        enableAutoOptimization: true,
        enableDuplicateDetection: true,
        enableQualityAssessment: true,
        batchSize: 10,
        priority: JobPriority.NORMAL,
      });
    });

    test('should update configuration', () => {
      const newConfig: Partial<PipelineConfig> = {
        enableAutoClassification: false,
        batchSize: 5,
        priority: JobPriority.HIGH,
      };

      pipeline.updateConfig(newConfig);
      const updatedConfig = pipeline.getConfig();

      expect(updatedConfig.enableAutoClassification).toBe(false);
      expect(updatedConfig.batchSize).toBe(5);
      expect(updatedConfig.priority).toBe(JobPriority.HIGH);
      expect(updatedConfig.enableAutoOptimization).toBe(true); // Should remain unchanged
    });
  });

  describe('Item Processing', () => {
    test('should process item successfully', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options: OptimizationOptions = {
        itemId: mockItem.id,
        userId: mockUser.id,
      };

      await pipeline.processItem(mockItem.id, options);

      expect(mockPrisma.item.findUnique).toHaveBeenCalledWith({
        where: { id: mockItem.id },
        include: {
          optimizations: true,
          conversions: true,
        },
      });

      expect(mockJobQueue.addJob).toHaveBeenCalledWith(
        JobType.QUALITY_ASSESSMENT,
        expect.objectContaining({
          userId: mockUser.id,
          itemId: mockItem.id,
        }),
        expect.any(Object)
      );
    });

    test('should skip already optimized items when configured', async () => {
      const optimizedItem = {
        ...mockItem,
        optimizations: [
          {
            id: 'opt-1',
            createdAt: new Date(),
          },
        ],
      };

      mockPrisma.item.findUnique.mockResolvedValue(optimizedItem);

      const options: OptimizationOptions = {
        itemId: optimizedItem.id,
        userId: mockUser.id,
        skipIfOptimized: true,
      };

      await pipeline.processItem(optimizedItem.id, options);

      expect(mockJobQueue.addJob).not.toHaveBeenCalled();
    });

    test('should force reprocess when configured', async () => {
      const optimizedItem = {
        ...mockItem,
        optimizations: [
          {
            id: 'opt-1',
            createdAt: new Date(),
          },
        ],
      };

      mockPrisma.item.findUnique.mockResolvedValue(optimizedItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options: OptimizationOptions = {
        itemId: optimizedItem.id,
        userId: mockUser.id,
        forceReprocess: true,
      };

      await pipeline.processItem(optimizedItem.id, options);

      expect(mockJobQueue.addJob).toHaveBeenCalled();
    });

    test('should handle item not found', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(null);

      const options: OptimizationOptions = {
        itemId: 'non-existent',
        userId: mockUser.id,
      };

      await expect(pipeline.processItem('non-existent', options))
        .rejects.toThrow('Item non-existent not found');
    });

    test('should create jobs for different target models', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options: OptimizationOptions = {
        itemId: mockItem.id,
        userId: mockUser.id,
        targetModels: ['openai', 'anthropic', 'gemini'],
      };

      await pipeline.processItem(mockItem.id, options);

      // Should create optimization jobs for each target model
      expect(mockJobQueue.addJob).toHaveBeenCalledWith(
        JobType.OPTIMIZATION,
        expect.objectContaining({ targetModel: 'openai' }),
        expect.any(Object)
      );

      expect(mockJobQueue.addJob).toHaveBeenCalledWith(
        JobType.OPTIMIZATION,
        expect.objectContaining({ targetModel: 'anthropic' }),
        expect.any(Object)
      );

      expect(mockJobQueue.addJob).toHaveBeenCalledWith(
        JobType.OPTIMIZATION,
        expect.objectContaining({ targetModel: 'gemini' }),
        expect.any(Object)
      );
    });
  });

  describe('Batch Processing', () => {
    test('should process items in batches', async () => {
      const itemIds = Array.from({ length: 25 }, (_, i) => `item-${i}`);
      
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options: OptimizationOptions = {
        userId: mockUser.id,
      };

      await pipeline.processBatch(itemIds, options);

      // With default batch size of 10, should process in 3 batches
      expect(mockPrisma.item.findUnique).toHaveBeenCalledTimes(25);
    });

    test('should handle batch processing errors gracefully', async () => {
      const itemIds = ['item-1', 'item-2', 'item-3'];
      
      // Mock first item to succeed, second to fail, third to succeed
      mockPrisma.item.findUnique
        .mockResolvedValueOnce(mockItem)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(mockItem);
      
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const options: OptimizationOptions = {
        userId: mockUser.id,
      };

      // Should not throw error
      await pipeline.processBatch(itemIds, options);

      expect(mockPrisma.item.findUnique).toHaveBeenCalledTimes(3);
    });
  });

  describe('Duplicate Detection', () => {
    test('should run duplicate detection for user items', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Item 1', content: 'Content 1' },
        { id: 'item-2', name: 'Item 2', content: 'Content 2' },
        { id: 'item-3', name: 'Item 3', content: 'Content 3' },
      ];

      mockPrisma.item.findMany.mockResolvedValue(mockItems);
      mockJobQueue.addJob.mockResolvedValue('dedup-job-123');

      await pipeline.runDuplicateDetection(mockUser.id);

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        select: {
          id: true,
          name: true,
          content: true,
        },
        take: 1000,
      });

      expect(mockJobQueue.addJob).toHaveBeenCalledWith(
        JobType.DEDUPLICATION,
        expect.objectContaining({
          userId: mockUser.id,
          items: mockItems,
          threshold: 0.8,
        }),
        expect.any(Object)
      );
    });

    test('should skip duplicate detection for collections with too few items', async () => {
      mockPrisma.item.findMany.mockResolvedValue([mockItem]); // Only one item

      await pipeline.runDuplicateDetection(mockUser.id);

      expect(mockJobQueue.addJob).not.toHaveBeenCalled();
    });

    test('should filter by collection when specified', async () => {
      const collectionId = 'collection-123';
      const mockItems = [mockItem, createMockItem({ id: 'item-2' })];

      mockPrisma.item.findMany.mockResolvedValue(mockItems);
      mockJobQueue.addJob.mockResolvedValue('dedup-job-123');

      await pipeline.runDuplicateDetection(mockUser.id, collectionId);

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          collections: {
            some: { collectionId },
          },
        },
        select: {
          id: true,
          name: true,
          content: true,
        },
        take: 1000,
      });
    });
  });

  describe('Similarity Scoring', () => {
    test('should run similarity scoring between items', async () => {
      const sourceItem = { content: 'Source content' };
      const targetItems = [
        { id: 'target-1', content: 'Target content 1' },
        { id: 'target-2', content: 'Target content 2' },
      ];

      mockPrisma.item.findUnique.mockResolvedValue(sourceItem);
      mockPrisma.item.findMany.mockResolvedValue(targetItems);
      mockJobQueue.addJob.mockResolvedValue('similarity-job-123');

      await pipeline.runSimilarityScoring(
        'source-item-id',
        ['target-1', 'target-2'],
        mockUser.id
      );

      expect(mockJobQueue.addJob).toHaveBeenCalledTimes(2);
      expect(mockJobQueue.addJob).toHaveBeenCalledWith(
        JobType.SIMILARITY_SCORING,
        expect.objectContaining({
          sourceContent: 'Source content',
          targetContent: 'Target content 1',
          metadata: {
            sourceItemId: 'source-item-id',
            targetItemId: 'target-1',
          },
        }),
        expect.any(Object)
      );
    });

    test('should handle missing source item', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(null);

      await expect(pipeline.runSimilarityScoring(
        'non-existent',
        ['target-1'],
        mockUser.id
      )).rejects.toThrow('Source item non-existent not found');
    });
  });

  describe('Pipeline Status', () => {
    test('should get pipeline status for user', async () => {
      const mockJobs = [
        { type: 'OPTIMIZATION', status: 'pending' },
        { type: 'CLASSIFICATION', status: 'completed' },
        { type: 'OPTIMIZATION', status: 'failed' },
      ];

      mockJobQueue.getUserJobs.mockResolvedValue(mockJobs);

      const status = await pipeline.getPipelineStatus(mockUser.id);

      expect(status).toMatchObject({
        stats: {
          total: 3,
          pending: 1,
          processing: 0,
          completed: 1,
          failed: 1,
        },
        jobsByType: {
          'OPTIMIZATION': 2,
          'CLASSIFICATION': 1,
        },
        recentJobs: expect.any(Array),
      });
    });
  });

  describe('Auto Processing', () => {
    test('should auto-process new items', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockJobQueue.addJob.mockResolvedValue('job-123');

      await pipeline.autoProcessNewItem(mockItem.id, mockUser.id);

      expect(mockPrisma.item.findUnique).toHaveBeenCalledWith({
        where: { id: mockItem.id },
        include: {
          optimizations: true,
          conversions: true,
        },
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockPrisma.item.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const options: OptimizationOptions = {
        itemId: mockItem.id,
        userId: mockUser.id,
      };

      await expect(pipeline.processItem(mockItem.id, options))
        .rejects.toThrow('Database connection failed');
    });

    test('should handle job queue errors', async () => {
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockJobQueue.addJob.mockRejectedValue(new Error('Queue is full'));

      const options: OptimizationOptions = {
        itemId: mockItem.id,
        userId: mockUser.id,
      };

      await expect(pipeline.processItem(mockItem.id, options))
        .rejects.toThrow('Queue is full');
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = OptimizationPipeline.getInstance();
      const instance2 = OptimizationPipeline.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});