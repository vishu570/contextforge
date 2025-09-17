import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  mockPrisma, 
  mockAnthropicClient, 
  mockOpenAIClient, 
  resetAllMocks 
} from '@/test/mocks/services';
import { createMockItem, createMockUser } from '@/test/utils/test-utils';

// Mock the AI clients
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => mockAnthropicClient),
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => mockOpenAIClient),
}));

// Mock the database
jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

describe('OptimizationWorker', () => {
  let optimizationWorker: any;
  let mockItem: any;
  let mockUser: any;

  beforeEach(async () => {
    // Dynamically import the worker to ensure mocks are in place
    const { OptimizationWorker } = await import('@/lib/queue/workers/optimization-worker');
    optimizationWorker = new OptimizationWorker();
    
    mockItem = createMockItem({
      type: 'prompt',
      content: 'Summarize the following text: {text}',
      targetModels: 'openai,anthropic',
    });
    
    mockUser = createMockUser();
    resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Job Processing', () => {
    test('should process optimization job successfully', async () => {
      const jobData = {
        userId: mockUser.id,
        itemId: mockItem.id,
        content: mockItem.content,
        targetModel: 'openai',
        currentFormat: 'text',
      };

      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.optimization.create.mockResolvedValue({
        id: 'opt-123',
        optimizedContent: 'Optimized content',
        improvementRatio: 0.85,
      });

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                optimizedContent: 'Please provide a concise summary of the following text: {text}',
                explanation: 'Made the prompt more specific and concise',
                metrics: {
                  tokenReduction: 15,
                  clarityImprovement: 20,
                  specificityIncrease: 30,
                },
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 80,
          total_tokens: 230,
        },
      });

      const result = await optimizationWorker.processJob(jobData);

      expect(result).toBeDefined();
      expect(result.optimizedContent).toBe('Please provide a concise summary of the following text: {text}');
      expect(mockPrisma.optimization.create).toHaveBeenCalled();
    });

    test('should handle Anthropic optimization', async () => {
      const jobData = {
        userId: mockUser.id,
        itemId: mockItem.id,
        content: mockItem.content,
        targetModel: 'anthropic',
        currentFormat: 'text',
      };

      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.optimization.create.mockResolvedValue({
        id: 'opt-124',
        optimizedContent: 'Anthropic optimized content',
        improvementRatio: 0.92,
      });

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              optimizedContent: 'Human: Please summarize this text concisely: {text}\n\nAssistant: I\'ll provide a concise summary.',
              explanation: 'Optimized for Anthropic format with proper Human/Assistant structure',
              metrics: {
                tokenReduction: 10,
                clarityImprovement: 25,
                specificityIncrease: 35,
              },
            }),
          },
        ],
        usage: {
          input_tokens: 140,
          output_tokens: 90,
        },
      });

      const result = await optimizationWorker.processJob(jobData);

      expect(result).toBeDefined();
      expect(result.optimizedContent).toContain('Human:');
      expect(result.optimizedContent).toContain('Assistant:');
      expect(mockPrisma.optimization.create).toHaveBeenCalled();
    });

    test('should handle different content types', async () => {
      const codeItem = createMockItem({
        type: 'agent',
        content: 'You are a helpful assistant that writes code.',
        format: 'markdown',
      });

      const jobData = {
        userId: mockUser.id,
        itemId: codeItem.id,
        content: codeItem.content,
        targetModel: 'openai',
        currentFormat: 'markdown',
      };

      mockPrisma.item.findUnique.mockResolvedValue(codeItem);
      mockPrisma.optimization.create.mockResolvedValue({
        id: 'opt-125',
        optimizedContent: 'Optimized agent prompt',
        improvementRatio: 0.78,
      });

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                optimizedContent: 'You are an expert software engineer who provides clean, well-documented code solutions.',
                explanation: 'Enhanced specificity and added professional context',
                metrics: {
                  tokenReduction: 5,
                  clarityImprovement: 40,
                  specificityIncrease: 50,
                },
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 70,
          total_tokens: 190,
        },
      });

      const result = await optimizationWorker.processJob(jobData);

      expect(result).toBeDefined();
      expect(result.optimizedContent).toContain('expert software engineer');
    });

    test('should calculate improvement ratio correctly', async () => {
      const jobData = {
        userId: mockUser.id,
        itemId: mockItem.id,
        content: 'This is a very long and verbose prompt that could be much shorter and more effective',
        targetModel: 'openai',
        currentFormat: 'text',
      };

      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.optimization.create.mockResolvedValue({
        id: 'opt-126',
        optimizedContent: 'Short, effective prompt',
        improvementRatio: 0.75,
      });

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                optimizedContent: 'Short, effective prompt',
                explanation: 'Removed verbose language while maintaining intent',
                metrics: {
                  tokenReduction: 75,
                  clarityImprovement: 30,
                  specificityIncrease: 10,
                },
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      });

      const result = await optimizationWorker.processJob(jobData);

      expect(result.improvementRatio).toBeGreaterThan(0);
      expect(result.improvementRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle API failures gracefully', async () => {
      const jobData = {
        userId: mockUser.id,
        itemId: mockItem.id,
        content: mockItem.content,
        targetModel: 'openai',
        currentFormat: 'text',
      };

      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockOpenAIClient.chat.completions.create.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      await expect(optimizationWorker.processJob(jobData))
        .rejects.toThrow('API rate limit exceeded');
    });

    test('should handle invalid JSON responses', async () => {
      const jobData = {
        userId: mockUser.id,
        itemId: mockItem.id,
        content: mockItem.content,
        targetModel: 'openai',
        currentFormat: 'text',
      };

      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 20,
          total_tokens: 120,
        },
      });

      await expect(optimizationWorker.processJob(jobData))
        .rejects.toThrow();
    });

    test('should handle missing item', async () => {
      const jobData = {
        userId: mockUser.id,
        itemId: 'non-existent',
        content: 'Some content',
        targetModel: 'openai',
        currentFormat: 'text',
      };

      mockPrisma.item.findUnique.mockResolvedValue(null);

      await expect(optimizationWorker.processJob(jobData))
        .rejects.toThrow('Item not found');
    });

    test('should handle database save failures', async () => {
      const jobData = {
        userId: mockUser.id,
        itemId: mockItem.id,
        content: mockItem.content,
        targetModel: 'openai',
        currentFormat: 'text',
      };

      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.optimization.create.mockRejectedValue(
        new Error('Database connection failed')
      );

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                optimizedContent: 'Optimized content',
                explanation: 'Test optimization',
                metrics: {},
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      });

      await expect(optimizationWorker.processJob(jobData))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('Model-Specific Optimization', () => {
    test('should use appropriate prompt format for each model', async () => {
      const models = ['openai', 'anthropic', 'gemini'];
      
      for (const model of models) {
        const jobData = {
          userId: mockUser.id,
          itemId: mockItem.id,
          content: 'Test prompt',
          targetModel: model,
          currentFormat: 'text',
        };

        mockPrisma.item.findUnique.mockResolvedValue(mockItem);
        
        if (model === 'anthropic') {
          mockAnthropicClient.messages.create.mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  optimizedContent: `${model} optimized content`,
                  explanation: 'Model-specific optimization',
                  metrics: {},
                }),
              },
            ],
            usage: { input_tokens: 100, output_tokens: 50 },
          });
        } else {
          mockOpenAIClient.chat.completions.create.mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    optimizedContent: `${model} optimized content`,
                    explanation: 'Model-specific optimization',
                    metrics: {},
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          });
        }

        mockPrisma.optimization.create.mockResolvedValue({
          id: `opt-${model}`,
          optimizedContent: `${model} optimized content`,
          improvementRatio: 0.8,
        });

        const result = await optimizationWorker.processJob(jobData);
        
        expect(result.optimizedContent).toContain(model);
        expect(result.targetModel).toBe(model);
      }
    });
  });

  describe('Performance Metrics', () => {
    test('should track token usage and costs', async () => {
      const jobData = {
        userId: mockUser.id,
        itemId: mockItem.id,
        content: mockItem.content,
        targetModel: 'openai',
        currentFormat: 'text',
      };

      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.optimization.create.mockResolvedValue({
        id: 'opt-127',
        optimizedContent: 'Optimized content',
        improvementRatio: 0.85,
      });

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                optimizedContent: 'Optimized content',
                explanation: 'Test optimization',
                metrics: {
                  tokenReduction: 25,
                  clarityImprovement: 30,
                  specificityIncrease: 20,
                },
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 100,
          total_tokens: 300,
        },
      });

      const result = await optimizationWorker.processJob(jobData);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.tokenCount).toBeDefined();
      expect(result.metrics.estimatedCost).toBeDefined();
      expect(typeof result.metrics.estimatedCost).toBe('number');
    });
  });

  describe('Worker Health', () => {
    test('should report healthy status', () => {
      const health = optimizationWorker.getHealth();
      
      expect(health).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        lastActivity: expect.any(Date),
        processedJobs: expect.any(Number),
        failedJobs: expect.any(Number),
        averageProcessingTime: expect.any(Number),
      });
    });

    test('should track processing statistics', async () => {
      const jobData = {
        userId: mockUser.id,
        itemId: mockItem.id,
        content: mockItem.content,
        targetModel: 'openai',
        currentFormat: 'text',
      };

      mockPrisma.item.findUnique.mockResolvedValue(mockItem);
      mockPrisma.optimization.create.mockResolvedValue({
        id: 'opt-128',
        optimizedContent: 'Optimized content',
        improvementRatio: 0.85,
      });

      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                optimizedContent: 'Optimized content',
                explanation: 'Test optimization',
                metrics: {},
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      });

      const initialHealth = optimizationWorker.getHealth();
      const initialProcessedJobs = initialHealth.processedJobs;

      await optimizationWorker.processJob(jobData);

      const finalHealth = optimizationWorker.getHealth();
      expect(finalHealth.processedJobs).toBe(initialProcessedJobs + 1);
      expect(finalHealth.lastActivity).toBeInstanceOf(Date);
    });
  });
});