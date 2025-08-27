"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.ApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const chalk_1 = __importDefault(require("chalk"));
class ApiClient {
    constructor() {
        this.config = config_1.ConfigManager.getConfig();
        this.client = axios_1.default.create({
            baseURL: this.config.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': `ContextForge-CLI/1.0.0`,
            },
        });
        this.client.interceptors.request.use((config) => {
            if (this.config.apiKey) {
                config.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
            }
            return config;
        });
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.response?.status === 401) {
                console.error(chalk_1.default.red('Authentication failed. Please check your API key.'));
                console.log(chalk_1.default.yellow('Run: contextforge config set apiKey <your-api-key>'));
            }
            else if (error.response?.status === 429) {
                console.error(chalk_1.default.red('Rate limit exceeded. Please try again later.'));
            }
            else if (error.code === 'ECONNREFUSED') {
                console.error(chalk_1.default.red('Cannot connect to ContextForge API. Please check your connection and API URL.'));
            }
            return Promise.reject(error);
        });
    }
    async health() {
        try {
            const response = await this.client.get('/health');
            return { data: response.data, status: response.status };
        }
        catch (error) {
            return { error: error.message, status: error.response?.status || 500 };
        }
    }
    async login(email, password) {
        try {
            const response = await this.client.post('/auth/login', { email, password });
            return { data: response.data, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async getItems(options = {}) {
        try {
            const params = new URLSearchParams();
            Object.entries(options).forEach(([key, value]) => {
                if (value !== undefined) {
                    if (Array.isArray(value)) {
                        value.forEach(v => params.append(key, v));
                    }
                    else {
                        params.set(key, value.toString());
                    }
                }
            });
            const response = await this.client.get(`/items?${params.toString()}`);
            return { data: response.data.items, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async getItem(id) {
        try {
            const response = await this.client.get(`/items/${id}`);
            return { data: response.data.item, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async createItem(item) {
        try {
            const response = await this.client.post('/items', item);
            return { data: response.data.item, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async updateItem(id, updates) {
        try {
            const response = await this.client.put(`/items/${id}`, updates);
            return { data: response.data.item, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async deleteItem(id) {
        try {
            const response = await this.client.delete(`/items/${id}`);
            return { data: response.data, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async getFolders(flat = false) {
        try {
            const response = await this.client.get(`/folders?flat=${flat}`);
            return { data: response.data.folders, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async createFolder(folder) {
        try {
            const response = await this.client.post('/folders', folder);
            return { data: response.data.folder, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async optimizeItem(id, options = {}) {
        try {
            const response = await this.client.post(`/intelligence/optimization`, { itemId: id, ...options });
            return { data: response.data, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async classifyItems(itemIds, options = {}) {
        try {
            const response = await this.client.post(`/intelligence/batch`, {
                itemIds,
                operation: 'classify',
                ...options
            });
            return { data: response.data, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async searchSemantic(query, options = {}) {
        try {
            const response = await this.client.post('/intelligence/search', { query, ...options });
            return { data: response.data.results, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async startImport(source, options = {}) {
        try {
            const response = await this.client.post('/import/files', { source, ...options });
            return { data: response.data, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async getJob(id) {
        try {
            const response = await this.client.get(`/jobs/${id}`);
            return { data: response.data.job, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
    async request(method, endpoint, data, options) {
        try {
            const response = await this.client.request({
                method,
                url: endpoint,
                data,
                ...options,
            });
            return { data: response.data, status: response.status };
        }
        catch (error) {
            return { error: error.response?.data?.error || error.message, status: error.response?.status || 500 };
        }
    }
}
exports.ApiClient = ApiClient;
exports.api = new ApiClient();
//# sourceMappingURL=api.js.map