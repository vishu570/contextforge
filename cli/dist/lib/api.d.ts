import { AxiosRequestConfig } from 'axios';
import { ApiResponse, ContextItem, Folder, BulkOperation, SearchOptions } from '../types';
export declare class ApiClient {
    private client;
    private config;
    constructor();
    health(): Promise<ApiResponse>;
    login(email: string, password: string): Promise<ApiResponse>;
    getItems(options?: SearchOptions): Promise<ApiResponse<ContextItem[]>>;
    getItem(id: string): Promise<ApiResponse<ContextItem>>;
    createItem(item: Partial<ContextItem>): Promise<ApiResponse<ContextItem>>;
    updateItem(id: string, updates: Partial<ContextItem>): Promise<ApiResponse<ContextItem>>;
    deleteItem(id: string): Promise<ApiResponse>;
    getFolders(flat?: boolean): Promise<ApiResponse<Folder[]>>;
    createFolder(folder: Partial<Folder>): Promise<ApiResponse<Folder>>;
    optimizeItem(id: string, options?: any): Promise<ApiResponse>;
    classifyItems(itemIds: string[], options?: any): Promise<ApiResponse>;
    searchSemantic(query: string, options?: any): Promise<ApiResponse<ContextItem[]>>;
    startImport(source: string, options?: any): Promise<ApiResponse<BulkOperation>>;
    getJob(id: string): Promise<ApiResponse<BulkOperation>>;
    request(method: string, endpoint: string, data?: any, options?: AxiosRequestConfig): Promise<ApiResponse>;
}
export declare const api: ApiClient;
//# sourceMappingURL=api.d.ts.map