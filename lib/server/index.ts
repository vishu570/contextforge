import { WebSocketManager } from '../websocket/manager';
import { initializeWorkers, shutdownWorkers } from '../queue/workers';
import { redis } from '../redis';

export class ContextForgeServer {
  private static instance: ContextForgeServer;
  private wsManager: WebSocketManager;
  private isInitialized = false;

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
  }

  public static getInstance(): ContextForgeServer {
    if (!ContextForgeServer.instance) {
      ContextForgeServer.instance = new ContextForgeServer();
    }
    return ContextForgeServer.instance;
  }

  /**
   * Initialize the ContextForge server with all background services
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Server already initialized');
      return;
    }

    console.log('Initializing ContextForge server...');

    try {
      // Initialize Redis connection
      await this.initializeRedis();

      // Initialize WebSocket server
      this.wsManager.initialize();

      // Initialize background workers
      initializeWorkers();

      // Set up cleanup handlers
      this.setupCleanupHandlers();

      this.isInitialized = true;
      console.log('ContextForge server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ContextForge server:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown all services
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down ContextForge server...');

    try {
      // Shutdown workers
      await shutdownWorkers();

      // Shutdown WebSocket manager
      await this.wsManager.shutdown();

      // Close Redis connections
      await redis.quit();

      this.isInitialized = false;
      console.log('ContextForge server shut down successfully');
    } catch (error) {
      console.error('Error during server shutdown:', error);
      throw error;
    }
  }

  /**
   * Get server status
   */
  public getStatus(): any {
    return {
      initialized: this.isInitialized,
      websocket: {
        connected: this.wsManager.getConnectionCount(),
        users: this.wsManager.getConnectedUsers().length,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  private async initializeRedis(): Promise<void> {
    try {
      await redis.ping();
      console.log('Redis connection established');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  private setupCleanupHandlers(): void {
    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      this.shutdown().finally(() => {
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.shutdown().finally(() => {
        process.exit(1);
      });
    });
  }
}

// Export singleton instance
export const server = ContextForgeServer.getInstance();