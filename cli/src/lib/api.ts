import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ConfigManager } from './config';
import { ApiResponse, ContextItem, Folder, BulkOperation, SearchOptions } from '../types';
import chalk from 'chalk';

export class ApiClient {
  private client: AxiosInstance;
  private config: any;

  constructor() {
    this.config = ConfigManager.getConfig();
    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `ContextForge-CLI/1.0.0`,
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      if (this.config.apiKey) {
        config.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error(chalk.red('Authentication failed. Please check your API key.'));
          console.log(chalk.yellow('Run: contextforge config set apiKey <your-api-key>'));
        } else if (error.response?.status === 429) {
          console.error(chalk.red('Rate limit exceeded. Please try again later.'));
        } else if (error.code === 'ECONNREFUSED') {
          console.error(chalk.red('Cannot connect to ContextForge API. Please check your connection and API URL.'));
        }
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async health(): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/health');
      return { data: response.data, status: response.status };
    } catch (error: any) {
      return { error: error.message, status: error.response?.status || 500 };
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      return { data: response.data, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  // Context Items
  async getItems(options: SearchOptions = {}): Promise<ApiResponse<ContextItem[]>> {
    try {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.set(key, value.toString());
          }
        }
      });

      const response = await this.client.get(`/items?${params.toString()}`);
      return { data: response.data.items, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  async getItem(id: string): Promise<ApiResponse<ContextItem>> {
    try {
      const response = await this.client.get(`/items/${id}`);
      return { data: response.data.item, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  async createItem(item: Partial<ContextItem>): Promise<ApiResponse<ContextItem>> {
    try {
      const response = await this.client.post('/items', item);
      return { data: response.data.item, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  async updateItem(id: string, updates: Partial<ContextItem>): Promise<ApiResponse<ContextItem>> {
    try {
      const response = await this.client.put(`/items/${id}`, updates);
      return { data: response.data.item, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  async deleteItem(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.delete(`/items/${id}`);
      return { data: response.data, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  // Folders
  async getFolders(flat = false): Promise<ApiResponse<Folder[]>> {
    try {
      const response = await this.client.get(`/folders?flat=${flat}`);
      return { data: response.data.folders, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  async createFolder(folder: Partial<Folder>): Promise<ApiResponse<Folder>> {
    try {
      const response = await this.client.post('/folders', folder);
      return { data: response.data.folder, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  // Intelligence/AI Operations
  async optimizeItem(id: string, options: any = {}): Promise<ApiResponse> {
    try {
      const response = await this.client.post(`/intelligence/optimization`, { itemId: id, ...options });
      return { data: response.data, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  async classifyItems(itemIds: string[], options: any = {}): Promise<ApiResponse> {
    try {
      const response = await this.client.post(`/intelligence/batch`, { 
        itemIds, 
        operation: 'classify',
        ...options 
      });
      return { data: response.data, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  async searchSemantic(query: string, options: any = {}): Promise<ApiResponse<ContextItem[]>> {
    try {
      const response = await this.client.post('/intelligence/search', { query, ...options });
      return { data: response.data.results, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  // Import/Export
  async startImport(source: string, options: any = {}): Promise<ApiResponse<BulkOperation>> {
    try {
      const response = await this.client.post('/import/files', { source, ...options });
      return { data: response.data, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  async getJob(id: string): Promise<ApiResponse<BulkOperation>> {
    try {
      const response = await this.client.get(`/jobs/${id}`);
      return { data: response.data.job, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }

  // Generic request method for custom endpoints
  async request(method: string, endpoint: string, data?: any, options?: AxiosRequestConfig): Promise<ApiResponse> {
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
        ...options,
      });
      return { data: response.data, status: response.status };
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
    }
  }
}

export const api = new ApiClient();