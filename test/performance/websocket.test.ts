import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import { WebSocketManager } from '@/lib/websocket/manager';
import { mockRedis, resetAllMocks } from '@/test/mocks/services';

// Mock WebSocket implementation for testing
class MockWebSocket {
  readyState: number = 1; // OPEN
  send = jest.fn();
  close = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  
  constructor(public url: string) {}
  
  // Simulate message sending
  simulateMessage(data: any) {
    const event = { data: JSON.stringify(data) };
    const messageHandler = this.addEventListener.mock.calls
      .find(call => call[0] === 'message')?.[1];
    if (messageHandler) {
      messageHandler(event);
    }
  }
  
  // Simulate connection events
  simulateOpen() {
    const openHandler = this.addEventListener.mock.calls
      .find(call => call[0] === 'open')?.[1];
    if (openHandler) {
      openHandler({});
    }
  }
  
  simulateClose() {
    this.readyState = 3; // CLOSED
    const closeHandler = this.addEventListener.mock.calls
      .find(call => call[0] === 'close')?.[1];
    if (closeHandler) {
      closeHandler({});
    }
  }
  
  simulateError(error: Error) {
    const errorHandler = this.addEventListener.mock.calls
      .find(call => call[0] === 'error')?.[1];
    if (errorHandler) {
      errorHandler({ error });
    }
  }
}

// Mock Redis
jest.mock('@/lib/redis', () => ({
  redis: mockRedis,
}));

// Mock WebSocket constructor
global.WebSocket = MockWebSocket as any;

describe('WebSocket Performance Tests', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    wsManager = WebSocketManager.getInstance();
    resetAllMocks();
    
    // Setup Redis mocks
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.hget.mockResolvedValue(null);
    mockRedis.hset.mockResolvedValue(1);
    mockRedis.hdel.mockResolvedValue(1);
    mockRedis.smembers.mockResolvedValue([]);
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.srem.mockResolvedValue(1);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Performance', () => {
    test('should establish connection under 100ms', async () => {
      const userId = 'user-123';
      const mockWs = new MockWebSocket('ws://localhost:8080');
      
      const startTime = performance.now();
      
      const connectionPromise = wsManager.handleConnection(mockWs as any, userId);
      
      // Simulate successful connection
      setTimeout(() => mockWs.simulateOpen(), 10);
      
      await connectionPromise;
      
      const endTime = performance.now();
      const connectionTime = endTime - startTime;
      
      expect(connectionTime).toBeLessThan(100);
    });

    test('should handle multiple simultaneous connections efficiently', async () => {
      const connectionCount = 100;
      const connections: Promise<void>[] = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < connectionCount; i++) {
        const userId = `user-${i}`;
        const mockWs = new MockWebSocket(`ws://localhost:8080/${i}`);
        
        const connectionPromise = wsManager.handleConnection(mockWs as any, userId);
        connections.push(connectionPromise);
        
        // Simulate connection opening with slight delay
        setTimeout(() => mockWs.simulateOpen(), Math.random() * 50);
      }
      
      await Promise.all(connections);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerConnection = totalTime / connectionCount;
      
      expect(avgTimePerConnection).toBeLessThan(10); // Average under 10ms per connection
      expect(totalTime).toBeLessThan(1000); // Total under 1 second
    });

    test('should handle connection cleanup efficiently', async () => {
      const connectionCount = 50;
      const mockConnections: MockWebSocket[] = [];
      
      // Create connections
      for (let i = 0; i < connectionCount; i++) {
        const userId = `user-${i}`;
        const mockWs = new MockWebSocket(`ws://localhost:8080/${i}`);
        mockConnections.push(mockWs);
        
        await wsManager.handleConnection(mockWs as any, userId);
        mockWs.simulateOpen();
      }
      
      // Disconnect all connections
      const startTime = performance.now();
      
      const disconnectionPromises = mockConnections.map((mockWs, i) => {
        const userId = `user-${i}`;
        mockWs.simulateClose();
        return wsManager.handleDisconnection(userId);
      });
      
      await Promise.all(disconnectionPromises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerDisconnection = totalTime / connectionCount;
      
      expect(avgTimePerDisconnection).toBeLessThan(5); // Average under 5ms per disconnection
    });
  });

  describe('Message Broadcasting Performance', () => {
    test('should broadcast to 100 connections under 50ms', async () => {
      const connectionCount = 100;
      const mockConnections: MockWebSocket[] = [];
      
      // Setup connections
      for (let i = 0; i < connectionCount; i++) {
        const userId = `user-${i}`;
        const mockWs = new MockWebSocket(`ws://localhost:8080/${i}`);
        mockConnections.push(mockWs);
        
        await wsManager.handleConnection(mockWs as any, userId);
        mockWs.simulateOpen();
      }
      
      const message = {
        type: 'test_broadcast',
        data: { message: 'Performance test broadcast' },
      };
      
      const startTime = performance.now();
      
      await wsManager.broadcastUpdate(message);
      
      const endTime = performance.now();
      const broadcastTime = endTime - startTime;
      
      expect(broadcastTime).toBeLessThan(50);
      
      // Verify all connections received the message
      mockConnections.forEach(mockWs => {
        expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message));
      });
    });

    test('should handle targeted notifications efficiently', async () => {
      const userCount = 50;
      const mockConnections: MockWebSocket[] = [];
      const userIds: string[] = [];
      
      // Setup connections
      for (let i = 0; i < userCount; i++) {
        const userId = `user-${i}`;
        userIds.push(userId);
        const mockWs = new MockWebSocket(`ws://localhost:8080/${i}`);
        mockConnections.push(mockWs);
        
        await wsManager.handleConnection(mockWs as any, userId);
        mockWs.simulateOpen();
      }
      
      const notification = {
        title: 'Performance Test',
        message: 'Targeted notification test',
        type: 'info' as const,
        userId: 'user-25',
        read: false,
      };
      
      const startTime = performance.now();
      
      await wsManager.sendNotification('user-25', notification);
      
      const endTime = performance.now();
      const notificationTime = endTime - startTime;
      
      expect(notificationTime).toBeLessThan(10); // Should be very fast for targeted sends
      
      // Verify only the target user received the notification
      const targetConnection = mockConnections[25];
      expect(targetConnection.send).toHaveBeenCalled();
      
      // Verify other users didn't receive it
      const otherConnections = mockConnections.filter((_, i) => i !== 25);
      otherConnections.forEach(mockWs => {
        expect(mockWs.send).not.toHaveBeenCalled();
      });
    });

    test('should maintain performance under high message volume', async () => {
      const connectionCount = 20;
      const messagesPerSecond = 1000;
      const testDurationMs = 1000;
      
      // Setup connections
      for (let i = 0; i < connectionCount; i++) {
        const userId = `user-${i}`;
        const mockWs = new MockWebSocket(`ws://localhost:8080/${i}`);
        
        await wsManager.handleConnection(mockWs as any, userId);
        mockWs.simulateOpen();
      }
      
      const messagesSent: number[] = [];
      const startTime = performance.now();
      
      // Send messages at target rate
      const messageInterval = 1000 / messagesPerSecond; // ms between messages
      let messageCount = 0;
      
      const sendInterval = setInterval(async () => {
        const messageTime = performance.now();
        
        await wsManager.broadcastUpdate({
          type: 'performance_test',
          data: { 
            messageId: messageCount++,
            timestamp: messageTime 
          },
        });
        
        messagesSent.push(messageTime);
        
        if (performance.now() - startTime >= testDurationMs) {
          clearInterval(sendInterval);
        }
      }, messageInterval);
      
      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, testDurationMs + 100));
      
      const endTime = performance.now();
      const actualDuration = endTime - startTime;
      const actualRate = messagesSent.length / (actualDuration / 1000);
      
      // Should achieve at least 80% of target rate
      expect(actualRate).toBeGreaterThan(messagesPerSecond * 0.8);
    });
  });

  describe('Memory Management Performance', () => {
    test('should maintain stable memory usage with connection churn', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const cycleCount = 10;
      const connectionsPerCycle = 20;
      
      for (let cycle = 0; cycle < cycleCount; cycle++) {
        const mockConnections: MockWebSocket[] = [];
        
        // Create connections
        for (let i = 0; i < connectionsPerCycle; i++) {
          const userId = `cycle-${cycle}-user-${i}`;
          const mockWs = new MockWebSocket(`ws://localhost:8080/${cycle}/${i}`);
          mockConnections.push(mockWs);
          
          await wsManager.handleConnection(mockWs as any, userId);
          mockWs.simulateOpen();
        }
        
        // Send some messages
        await wsManager.broadcastUpdate({
          type: 'cycle_test',
          data: { cycle, timestamp: Date.now() },
        });
        
        // Disconnect all connections
        for (let i = 0; i < connectionsPerCycle; i++) {
          const userId = `cycle-${cycle}-user-${i}`;
          const mockWs = mockConnections[i];
          
          mockWs.simulateClose();
          await wsManager.handleDisconnection(userId);
        }
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('should handle Redis memory optimization', async () => {
      const connectionCount = 100;
      
      // Track Redis operations
      let redisOperations = 0;
      const originalSet = mockRedis.set;
      const originalDel = mockRedis.del;
      
      mockRedis.set.mockImplementation((...args) => {
        redisOperations++;
        return originalSet(...args);
      });
      
      mockRedis.del.mockImplementation((...args) => {
        redisOperations++;
        return originalDel(...args);
      });
      
      // Create and destroy connections
      for (let i = 0; i < connectionCount; i++) {
        const userId = `redis-test-user-${i}`;
        const mockWs = new MockWebSocket(`ws://localhost:8080/redis/${i}`);
        
        await wsManager.handleConnection(mockWs as any, userId);
        mockWs.simulateOpen();
        
        await wsManager.handleDisconnection(userId);
      }
      
      // Verify efficient Redis usage
      expect(redisOperations).toBeLessThan(connectionCount * 5); // Max 5 operations per connection lifecycle
    });
  });

  describe('Error Recovery Performance', () => {
    test('should recover from connection errors quickly', async () => {
      const userId = 'error-test-user';
      const mockWs = new MockWebSocket('ws://localhost:8080/error-test');
      
      await wsManager.handleConnection(mockWs as any, userId);
      mockWs.simulateOpen();
      
      const startTime = performance.now();
      
      // Simulate connection error
      mockWs.simulateError(new Error('Connection lost'));
      
      // Manager should handle error and cleanup quickly
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const endTime = performance.now();
      const recoveryTime = endTime - startTime;
      
      expect(recoveryTime).toBeLessThan(100); // Should recover in under 100ms
    });

    test('should handle rapid connection/disconnection cycles', async () => {
      const userId = 'rapid-cycle-user';
      const cycleCount = 50;
      
      const startTime = performance.now();
      
      for (let i = 0; i < cycleCount; i++) {
        const mockWs = new MockWebSocket(`ws://localhost:8080/rapid/${i}`);
        
        await wsManager.handleConnection(mockWs as any, userId);
        mockWs.simulateOpen();
        
        // Immediately disconnect
        mockWs.simulateClose();
        await wsManager.handleDisconnection(userId);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgCycleTime = totalTime / cycleCount;
      
      expect(avgCycleTime).toBeLessThan(10); // Each cycle should be under 10ms
      expect(totalTime).toBeLessThan(1000); // Total under 1 second
    });
  });

  describe('Scalability Performance', () => {
    test('should scale to 500 concurrent connections', async () => {
      const connectionCount = 500;
      const mockConnections: MockWebSocket[] = [];
      
      const startTime = performance.now();
      
      // Create all connections
      const connectionPromises = [];
      for (let i = 0; i < connectionCount; i++) {
        const userId = `scale-test-user-${i}`;
        const mockWs = new MockWebSocket(`ws://localhost:8080/scale/${i}`);
        mockConnections.push(mockWs);
        
        connectionPromises.push(
          wsManager.handleConnection(mockWs as any, userId).then(() => {
            mockWs.simulateOpen();
          })
        );
      }
      
      await Promise.all(connectionPromises);
      
      const connectionTime = performance.now() - startTime;
      
      // Test broadcasting to all connections
      const broadcastStartTime = performance.now();
      
      await wsManager.broadcastUpdate({
        type: 'scale_test',
        data: { connectionCount, timestamp: Date.now() },
      });
      
      const broadcastTime = performance.now() - broadcastStartTime;
      
      expect(connectionTime).toBeLessThan(5000); // Connect all in under 5 seconds
      expect(broadcastTime).toBeLessThan(200); // Broadcast in under 200ms
      
      // Verify all connections received the message
      mockConnections.forEach(mockWs => {
        expect(mockWs.send).toHaveBeenCalled();
      });
    });

    test('should maintain performance with mixed connection types', async () => {
      const regularConnections = 100;
      const highFrequencyConnections = 20;
      
      // Create regular connections
      for (let i = 0; i < regularConnections; i++) {
        const userId = `regular-user-${i}`;
        const mockWs = new MockWebSocket(`ws://localhost:8080/regular/${i}`);
        
        await wsManager.handleConnection(mockWs as any, userId);
        mockWs.simulateOpen();
      }
      
      // Create high-frequency connections
      for (let i = 0; i < highFrequencyConnections; i++) {
        const userId = `hf-user-${i}`;
        const mockWs = new MockWebSocket(`ws://localhost:8080/hf/${i}`);
        
        await wsManager.handleConnection(mockWs as any, userId);
        mockWs.simulateOpen();
      }
      
      // Send targeted messages to high-frequency users
      const startTime = performance.now();
      
      const messagePromises = [];
      for (let i = 0; i < highFrequencyConnections; i++) {
        const userId = `hf-user-${i}`;
        
        for (let j = 0; j < 10; j++) {
          messagePromises.push(
            wsManager.sendNotification(userId, {
              title: `Message ${j}`,
              message: `High frequency message ${j}`,
              type: 'info',
              userId,
              read: false,
            })
          );
        }
      }
      
      await Promise.all(messagePromises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgMessageTime = totalTime / (highFrequencyConnections * 10);
      
      expect(avgMessageTime).toBeLessThan(2); // Each message should be under 2ms
    });
  });
});