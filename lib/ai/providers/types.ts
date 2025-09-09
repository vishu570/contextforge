// AI Provider interfaces and types
export enum OptimizationType {
  content = 'content',
  structure = 'structure', 
  metadata = 'metadata',
  categorization = 'categorization'
}

export interface OptimizationResult {
  id: string
  itemId: string
  optimizationType: OptimizationType
  originalVersion: string
  optimizedVersion: string
  confidence: number
  aiProvider: string
  aiModel: string
  processingTime?: number
  tokenUsage?: {
    input: number
    output: number
  }
  costEstimate?: number
  status: 'pending' | 'optimized' | 'failed'
  errorMessage?: string
  metadata?: Record<string, any>
}

export interface AIProvider {
  readonly name: string
  readonly models: string[]
  
  optimize(content: string, type: OptimizationType, options?: OptimizationOptions): Promise<OptimizationResult>
  categorize(content: string, options?: CategorizationOptions): Promise<string[]>
  embed(text: string, options?: EmbeddingOptions): Promise<number[]>
  isHealthy(): Promise<boolean>
}

export interface OptimizationOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  preserveStructure?: boolean
  targetFormat?: string
}

export interface CategorizationOptions {
  maxSuggestions?: number
  confidence?: number
  existingCategories?: string[]
}

export interface EmbeddingOptions {
  model?: string
  dimensions?: number
}

export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
  retries?: number
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}