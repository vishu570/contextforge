import { WebSocketEventType, WebSocketMessage } from './types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private isAuthenticated = false;
  private eventHandlers: Map<WebSocketEventType, Set<Function>> = new Map();

  constructor(url?: string) {
    this.url = url || `ws://${window.location.hostname}:8080`;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (token) {
          this.token = token;
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Authenticate if token is available
          if (this.token) {
            this.authenticate(this.token);
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          this.isAuthenticated = false;

          // Attempt to reconnect
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Authenticate with the server
   */
  public authenticate(token: string): void {
    this.token = token;
    this.send({
      type: WebSocketEventType.AUTHENTICATE,
      data: { token },
      timestamp: new Date(),
    });
  }

  /**
   * Send message to server
   */
  public send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  /**
   * Subscribe to job updates
   */
  public subscribeToJob(jobId: string): void {
    // Implementation would depend on server-side job subscription logic
    // For now, we rely on user-based broadcasting
    console.log(`Subscribed to job updates for: ${jobId}`);
  }

  /**
   * Request system status
   */
  public requestSystemStatus(): void {
    this.send({
      type: WebSocketEventType.SYSTEM_STATUS,
      data: {},
      timestamp: new Date(),
    });
  }

  /**
   * Request activity feed
   */
  public requestActivityFeed(limit: number = 50, offset: number = 0): void {
    this.send({
      type: WebSocketEventType.ACTIVITY_FEED,
      data: { limit, offset },
      timestamp: new Date(),
    });
  }

  /**
   * Add event listener
   */
  public on(eventType: WebSocketEventType, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  /**
   * Remove event listener
   */
  public off(eventType: WebSocketEventType, handler: Function): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage): void {
    // Handle authentication response
    if (message.type === WebSocketEventType.AUTHENTICATE) {
      if (message.data.success) {
        this.isAuthenticated = true;
        console.log('WebSocket authenticated successfully');
      } else {
        console.error('WebSocket authentication failed');
      }
    }

    // Trigger event handlers
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data, message);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Attempting to reconnect in ${delay}ms...`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.token || undefined).catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isAuthenticated = false;
  }

  /**
   * Get connection status
   */
  public getStatus(): { connected: boolean; authenticated: boolean } {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
    };
  }
}

// Singleton instance for client-side usage
let clientInstance: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!clientInstance) {
    clientInstance = new WebSocketClient();
  }
  return clientInstance;
}