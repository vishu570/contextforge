import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockPrisma, mockJobQueue, resetAllMocks } from '@/test/mocks/services';
import { createMockUser, createMockItem } from '@/test/utils/test-utils';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/lib/queue', () => ({
  jobQueue: mockJobQueue,
}));

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn().mockResolvedValue({
    user: { id: 'user-123', email: 'test@example.com' }
  }),
}));

describe('/api/intelligence', () => {
  let mockUser: any;
  let mockItem: any;

  beforeEach(() => {
    mockUser = createMockUser();
    mockItem = createMockItem();
    resetAllMocks();
  });

  describe('POST /api/intelligence/optimization', () => {
    test('should queue optimization job for single item', async () => {
      // Mock the route handler
      const { POST } = await import('@/app/api/intelligence/optimization/route');
      
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockJobQueue.addJob.mockResolvedValue('job-123');

      const request = new NextRequest('http://localhost:3000/api/intelligence/optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          itemId: mockItem.id,
          targetModels: ['openai', 'anthropic'],
          forceReprocess: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobId).toBe('job-123');
      expect(mockJobQueue.addJob).toHaveBeenCalled();
    });

    test('should handle batch optimization', async () => {
      const { POST } = await import('@/app/api/intelligence/optimization/route');
      
      const mockItems = [
        createMockItem({ id: 'item-1' }),
        createMockItem({ id: 'item-2' }),
        createMockItem({ id: 'item-3' }),
      ];

      mockPrisma.item.findMany.mockResolvedValue(mockItems);
      mockJobQueue.addJob.mockResolvedValue('batch-job-123');

      const request = new NextRequest('http://localhost:3000/api/intelligence/optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          itemIds: mockItems.map(item => item.id),
          targetModels: ['openai'],
          batchSize: 2,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.batchJobId).toBe('batch-job-123');
    });

    test('should validate required parameters', async () => {
      const { POST } = await import('@/app/api/intelligence/optimization/route');

      const request = new NextRequest('http://localhost:3000/api/intelligence/optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({}), // Missing required parameters
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    test('should handle non-existent item', async () => {
      const { POST } = await import('@/app/api/intelligence/optimization/route');
      
      mockPrisma.item.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/intelligence/optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          itemId: 'non-existent',
          targetModels: ['openai'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('GET /api/intelligence/stats', () => {
    test('should return intelligence statistics', async () => {
      const { GET } = await import('@/app/api/intelligence/stats/route');
      
      mockPrisma.optimization.findMany.mockResolvedValue([
        { improvementRatio: 0.8, targetModel: 'openai' },
        { improvementRatio: 0.9, targetModel: 'anthropic' },
        { improvementRatio: 0.7, targetModel: 'openai' },
      ]);

      mockPrisma.item.count.mockResolvedValue(100);
      mockJobQueue.getQueueStats.mockResolvedValue({
        optimization: { completed: 50, failed: 2 },
        classification: { completed: 30, failed: 1 },
      });

      const request = new NextRequest('http://localhost:3000/api/intelligence/stats?userId=user-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        totalItems: expect.any(Number),
        optimizedItems: expect.any(Number),
        averageImprovement: expect.any(Number),
        modelStats: expect.any(Object),
        processingStats: expect.any(Object),
      });
    });

    test('should filter stats by date range', async () => {
      const { GET } = await import('@/app/api/intelligence/stats/route');
      
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');
      
      mockPrisma.optimization.findMany.mockResolvedValue([]);
      mockPrisma.item.count.mockResolvedValue(0);

      const request = new NextRequest(
        `http://localhost:3000/api/intelligence/stats?userId=user-123&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.optimization.findMany).toHaveBeenCalledWith({
        where: {
          item: { userId: 'user-123' },
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        include: expect.any(Object),
      });
    });
  });

  describe('POST /api/intelligence/analysis', () => {
    test('should analyze content and return insights', async () => {
      const { POST } = await import('@/app/api/intelligence/analysis/route');
      
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);

      const request = new NextRequest('http://localhost:3000/api/intelligence/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          itemId: mockItem.id,
          analysisTypes: ['complexity', 'sentiment', 'keywords'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis).toBeDefined();
      expect(data.analysis.complexity).toBeDefined();
      expect(data.analysis.sentiment).toBeDefined();
      expect(data.analysis.keywords).toBeDefined();
    });

    test('should handle custom content analysis', async () => {
      const { POST } = await import('@/app/api/intelligence/analysis/route');

      const request = new NextRequest('http://localhost:3000/api/intelligence/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          content: 'Analyze this custom text content',
          analysisTypes: ['readability', 'structure'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis).toBeDefined();
      expect(data.analysis.readability).toBeDefined();
      expect(data.analysis.structure).toBeDefined();
    });
  });

  describe('POST /api/intelligence/embeddings', () => {
    test('should generate embeddings for content', async () => {
      const { POST } = await import('@/app/api/intelligence/embeddings/route');
      
      mockPrisma.item.findUnique.mockResolvedValue(mockItem);

      const request = new NextRequest('http://localhost:3000/api/intelligence/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          itemId: mockItem.id,
          model: 'text-embedding-ada-002',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.embeddings).toBeDefined();
      expect(Array.isArray(data.embeddings)).toBe(true);
      expect(data.embeddings.length).toBeGreaterThan(0);
    });

    test('should handle batch embedding generation', async () => {
      const { POST } = await import('@/app/api/intelligence/embeddings/route');
      
      const mockItems = [
        createMockItem({ id: 'item-1' }),
        createMockItem({ id: 'item-2' }),
      ];

      mockPrisma.item.findMany.mockResolvedValue(mockItems);

      const request = new NextRequest('http://localhost:3000/api/intelligence/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          itemIds: mockItems.map(item => item.id),
          model: 'text-embedding-ada-002',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results).toHaveLength(2);
    });
  });

  describe('POST /api/intelligence/clustering', () => {
    test('should cluster items by similarity', async () => {
      const { POST } = await import('@/app/api/intelligence/clustering/route');
      
      const mockItems = Array.from({ length: 10 }, (_, i) => 
        createMockItem({ 
          id: `item-${i}`,
          content: `Content for item ${i}`,
        })
      );

      mockPrisma.item.findMany.mockResolvedValue(mockItems);

      const request = new NextRequest('http://localhost:3000/api/intelligence/clustering', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          folderId: 'folder-123',
          algorithm: 'kmeans',
          numClusters: 3,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clusters).toBeDefined();
      expect(Array.isArray(data.clusters)).toBe(true);
      expect(data.clusters).toHaveLength(3);
      
      // Verify cluster structure
      data.clusters.forEach((cluster: any) => {
        expect(cluster).toMatchObject({
          id: expect.any(String),
          label: expect.any(String),
          items: expect.any(Array),
          centroid: expect.any(Array),
        });
      });
    });

    test('should handle hierarchical clustering', async () => {
      const { POST } = await import('@/app/api/intelligence/clustering/route');
      
      const mockItems = Array.from({ length: 5 }, (_, i) => 
        createMockItem({ id: `item-${i}` })
      );

      mockPrisma.item.findMany.mockResolvedValue(mockItems);

      const request = new NextRequest('http://localhost:3000/api/intelligence/clustering', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          itemIds: mockItems.map(item => item.id),
          algorithm: 'hierarchical',
          threshold: 0.7,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dendrogram).toBeDefined();
      expect(data.clusters).toBeDefined();
    });
  });

  describe('GET /api/intelligence/search', () => {
    test('should perform semantic search', async () => {
      const { GET } = await import('@/app/api/intelligence/search/route');
      
      const mockSearchResults = [
        { ...createMockItem({ id: 'result-1' }), score: 0.95 },
        { ...createMockItem({ id: 'result-2' }), score: 0.87 },
        { ...createMockItem({ id: 'result-3' }), score: 0.82 },
      ];

      // Mock search implementation would go here
      // For now, mock the database query
      mockPrisma.item.findMany.mockResolvedValue(mockSearchResults);

      const query = 'machine learning optimization';
      const request = new NextRequest(
        `http://localhost:3000/api/intelligence/search?q=${encodeURIComponent(query)}&userId=user-123&limit=10`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.query).toBe(query);
      expect(data.totalResults).toBeDefined();
    });

    test('should filter search results by type', async () => {
      const { GET } = await import('@/app/api/intelligence/search/route');
      
      mockPrisma.item.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/intelligence/search?q=test&userId=user-123&type=prompt&limit=5'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          type: 'prompt',
          OR: expect.any(Array), // Search conditions
        },
        take: 5,
        orderBy: expect.any(Object),
      });
    });
  });

  describe('POST /api/intelligence/batch', () => {
    test('should process multiple intelligence operations in batch', async () => {
      const { POST } = await import('@/app/api/intelligence/batch/route');
      
      const batchOperations = [
        { type: 'optimization', itemId: 'item-1', targetModels: ['openai'] },
        { type: 'classification', itemId: 'item-2' },
        { type: 'analysis', itemId: 'item-3', analysisTypes: ['complexity'] },
      ];

      mockJobQueue.addJob.mockResolvedValue('batch-job-123');

      const request = new NextRequest('http://localhost:3000/api/intelligence/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          operations: batchOperations,
          priority: 'high',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.batchId).toBe('batch-job-123');
      expect(data.operationCount).toBe(3);
      expect(mockJobQueue.addJob).toHaveBeenCalledWith(
        'BATCH_INTELLIGENCE',
        expect.objectContaining({
          operations: batchOperations,
        }),
        expect.objectContaining({
          priority: 'HIGH',
        })
      );
    });

    test('should validate batch operation limits', async () => {
      const { POST } = await import('@/app/api/intelligence/batch/route');
      
      // Create a batch that exceeds the limit
      const tooManyOperations = Array.from({ length: 101 }, (_, i) => ({
        type: 'optimization',
        itemId: `item-${i}`,
      }));

      const request = new NextRequest('http://localhost:3000/api/intelligence/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          operations: tooManyOperations,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('limit');
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication errors', async () => {
      const { validateSession } = require('@/lib/auth');
      validateSession.mockRejectedValue(new Error('Invalid session'));

      const { POST } = await import('@/app/api/intelligence/optimization/route');

      const request = new NextRequest('http://localhost:3000/api/intelligence/optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({
          itemId: 'item-123',
          targetModels: ['openai'],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    test('should handle database errors gracefully', async () => {
      const { POST } = await import('@/app/api/intelligence/optimization/route');
      
      mockPrisma.item.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/intelligence/optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          itemId: 'item-123',
          targetModels: ['openai'],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    test('should handle malformed JSON requests', async () => {
      const { POST } = await import('@/app/api/intelligence/optimization/route');

      const request = new NextRequest('http://localhost:3000/api/intelligence/optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: 'invalid json{',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});