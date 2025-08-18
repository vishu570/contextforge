export interface ContextForgeConfig {
  apiUrl: string;
  apiKey?: string;
  userId?: string;
  defaultFormat: 'json' | 'yaml' | 'table';
  editor?: string;
  autoOptimize: boolean;
  batchSize: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface ContextItem {
  id: string;
  type: 'prompt' | 'rule' | 'agent' | 'collection';
  name: string;
  description?: string;
  content: string;
  metadata?: Record<string, any>;
  tags?: string[];
  folderId?: string;
  folderPath?: string;
  createdAt: string;
  updatedAt: string;
  optimized?: boolean;
  quality?: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  path: string;
  level: number;
  parentId?: string;
  color?: string;
  icon?: string;
  itemCount: number;
  childCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BulkOperation {
  id: string;
  type: 'import' | 'export' | 'optimize' | 'classify';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  results?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchOptions {
  query?: string;
  type?: string[];
  tags?: string[];
  folderId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'score';
  sortOrder?: 'asc' | 'desc';
}

export interface ImportOptions {
  source: 'file' | 'directory' | 'github' | 'url';
  path: string;
  folderId?: string;
  classify?: boolean;
  optimize?: boolean;
  dryRun?: boolean;
  batchSize?: number;
}

export interface ExportOptions {
  format: 'json' | 'yaml' | 'markdown' | 'zip';
  destination: string;
  includeMetadata?: boolean;
  flatStructure?: boolean;
  filters?: SearchOptions;
}

export interface OptimizationOptions {
  model?: string;
  creativity?: number;
  focusAreas?: string[];
  preserveStructure?: boolean;
  batchSize?: number;
}

export interface ClassificationOptions {
  model?: string;
  categories?: string[];
  autoCreateFolders?: boolean;
  confidence?: number;
}

export interface CliCommand {
  name: string;
  description: string;
  aliases?: string[];
  options?: CliOption[];
  examples?: string[];
}

export interface CliOption {
  flags: string;
  description: string;
  defaultValue?: any;
  required?: boolean;
  choices?: string[];
}