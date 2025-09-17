import { jest } from '@jest/globals';

// Mock Prisma Client
export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  item: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  folder: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  optimization: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  job: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  $transaction: jest.fn(),
};

// Mock Redis Client
export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  flushdb: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  lpush: jest.fn(),
  rpop: jest.fn(),
  llen: jest.fn(),
  sadd: jest.fn(),
  smembers: jest.fn(),
  srem: jest.fn(),
};

// Mock AI Services
export const mockAnthropicClient = {
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: 'Mocked AI response',
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    }),
  },
};

export const mockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Mocked OpenAI response',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }),
    },
  },
  embeddings: {
    create: jest.fn().mockResolvedValue({
      data: [
        {
          embedding: new Array(1536).fill(0).map(() => Math.random()),
        },
      ],
    }),
  },
};

// Mock Job Queue
export const mockJobQueue = {
  addJob: jest.fn().mockResolvedValue('job-123'),
  getJob: jest.fn(),
  getUserJobs: jest.fn().mockResolvedValue([]),
  getQueueStats: jest.fn().mockResolvedValue({
    optimization: { pending: 0, active: 0, completed: 5, failed: 0 },
    classification: { pending: 0, active: 0, completed: 3, failed: 0 },
    deduplication: { pending: 0, active: 0, completed: 1, failed: 0 },
  }),
  processJob: jest.fn(),
  retryJob: jest.fn(),
  cancelJob: jest.fn(),
};

// Mock WebSocket Manager
export const mockWebSocketManager = {
  getInstance: jest.fn().mockReturnValue({
    sendNotification: jest.fn(),
    sendUpdate: jest.fn(),
    broadcastUpdate: jest.fn(),
    handleConnection: jest.fn(),
    handleDisconnection: jest.fn(),
  }),
};

// Mock Swarm Orchestrator
export const mockSwarmOrchestrator = {
  start: jest.fn(),
  stop: jest.fn(),
  addTask: jest.fn().mockResolvedValue('task-123'),
  getMetrics: jest.fn().mockReturnValue({
    totalTasks: 10,
    completedTasks: 8,
    averageCompletionTime: 2.5,
    throughput: 3.2,
    teamUtilization: {
      uiux: 0.6,
      backend: 0.8,
      ai: 0.7,
      devtools: 0.5,
      analytics: 0.4,
      qa: 0.9,
    },
    successRate: 0.95,
    blockedTasks: 1,
  }),
  getTaskStatus: jest.fn(),
  getActiveTasks: jest.fn().mockReturnValue([]),
};

// Mock Email Service
export const mockEmailService = {
  sendWelcomeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendNotificationEmail: jest.fn(),
  sendBulkEmail: jest.fn(),
};

// Mock File System Operations
export const mockFileSystem = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  deleteFile: jest.fn(),
  createDirectory: jest.fn(),
  listFiles: jest.fn(),
  fileExists: jest.fn(),
};

// Helper to reset all mocks
export const resetAllMocks = () => {
  Object.values(mockPrisma).forEach(mock => {
    if (typeof mock === 'object') {
      Object.values(mock).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    }
  });
  
  Object.values(mockRedis).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  mockAnthropicClient.messages.create.mockReset();
  mockOpenAIClient.chat.completions.create.mockReset();
  mockOpenAIClient.embeddings.create.mockReset();
  
  Object.values(mockJobQueue).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};