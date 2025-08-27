// Type definitions for the advanced AI features

export interface ModelConfiguration {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  customEndpoint?: string;
  cost: number;
  maxContextLength: number;
  capabilities: string[];
  isActive: boolean;
}

export interface FunctionDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: FunctionParameter[];
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'apikey' | 'basic' | 'none';
    key?: string;
    value?: string;
  };
  examples?: FunctionExample[];
  tags: string[];
  isActive: boolean;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FunctionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required: boolean;
  defaultValue?: any;
  enum?: string[];
  properties?: Record<string, FunctionParameter>;
  items?: FunctionParameter;
}

export interface FunctionExample {
  name: string;
  parameters: Record<string, any>;
  expectedResponse?: any;
  description?: string;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

export interface TestRun {
  id: string;
  promptId?: string;
  prompt: string;
  variables?: Record<string, any>;
  modelConfigurations: ModelConfiguration[];
  attachedFunctions: string[];
  results: TestResult[];
  summary: TestSummary;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  duration?: number;
  totalCost?: number;
}

export interface TestResult {
  modelId: string;
  modelName: string;
  success: boolean;
  response?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  duration: number;
  metrics: {
    relevance: number;
    coherence: number;
    completeness: number;
    creativity: number;
  };
  timestamp: string;
  functionCalls?: Array<{
    name: string;
    arguments: any;
    result?: any;
  }>;
}

export interface TestSummary {
  totalTests: number;
  successful: number;
  failed: number;
  totalCost: number;
  averageDuration: number;
  totalTokens: number;
  bestPerforming?: {
    modelId: string;
    score: number;
  };
  mostCostEffective?: {
    modelId: string;
    costPerToken: number;
  };
  fastest?: {
    modelId: string;
    duration: number;
  };
}

export interface PromptVersion {
  id: string;
  versionNumber: string;
  content: string;
  changes: string;
  createdAt: string;
  createdBy: string;
  approved: boolean;
  performance?: {
    avgTokens: number;
    avgCost: number;
    avgScore: number;
    testCount: number;
  };
  metadata?: Record<string, any>;
}

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  variantA: {
    name: string;
    content: string;
  };
  variantB: {
    name: string;
    content: string;
  };
  trafficSplit: number; // percentage for variant A (0-100)
  metrics: {
    variantA: TestMetrics;
    variantB: TestMetrics;
  };
  status: 'draft' | 'running' | 'paused' | 'completed';
  winner?: 'A' | 'B';
  confidence?: number; // statistical confidence level
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number; // planned duration in hours
}

export interface TestMetrics {
  impressions: number;
  conversions: number;
  conversionRate: number;
  averageScore: number;
  totalCost: number;
  averageDuration: number;
  errorRate: number;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'performance' | 'cost' | 'clarity' | 'structure' | 'security';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedChange: string;
  reasoning: string;
  estimatedImpact: {
    costReduction?: number;
    performanceImprovement?: number;
    clarityScore?: number;
    tokenReduction?: number;
  };
  confidence: number; // 0-1
  applied: boolean;
  createdAt: string;
}

export interface AnalyticsData {
  usage: {
    totalTests: number;
    totalCost: number;
    avgTokensPerTest: number;
    avgCostPerTest: number;
    successRate: number;
    testTrends: Array<{
      date: string;
      tests: number;
      cost: number;
      avgScore: number;
    }>;
  };
  performance: {
    avgResponseTime: number;
    avgQualityScore: number;
    modelPerformance: Array<{
      modelId: string;
      modelName: string;
      usage: number;
      avgScore: number;
      avgCost: number;
      avgDuration: number;
    }>;
    functionUsage: Array<{
      functionId: string;
      functionName: string;
      usage: number;
      successRate: number;
    }>;
  };
  insights: {
    topCategories: Array<{ category: string; count: number }>;
    popularTags: Array<{ tag: string; count: number }>;
    costOptimizations: OptimizationSuggestion[];
    performanceBottlenecks: string[];
    recommendations: string[];
  };
}

export interface CollaborationComment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  position?: {
    line: number;
    column: number;
    selection?: {
      start: number;
      end: number;
    };
  };
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  replies: CollaborationReply[];
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationReply {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
}

export interface PromptCollaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  permissions: string[];
  addedAt: string;
  lastActive?: string;
}

export interface CustomEndpoint {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  modelMapping?: Record<string, string>; // local name -> remote name mapping
  supportedFeatures: string[];
  authentication?: {
    type: 'bearer' | 'apikey' | 'basic' | 'oauth';
    config: Record<string, any>;
  };
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelComparison {
  id: string;
  name: string;
  prompt: string;
  models: string[];
  results: Array<{
    modelId: string;
    modelName: string;
    result: TestResult;
    rank: number;
    score: number;
  }>;
  winner: {
    modelId: string;
    reason: string;
    confidence: number;
  };
  metrics: {
    avgCost: number;
    avgDuration: number;
    avgTokens: number;
    qualityScores: Record<string, number>;
    costEfficiency: Record<string, number>;
    speedRanking: Record<string, number>;
  };
  createdAt: string;
}

export interface CostEstimation {
  model: string;
  estimatedTokens: number;
  estimatedCost: number;
  maxCost: number;
  breakdown: {
    promptTokens: number;
    maxCompletionTokens: number;
    promptCost: number;
    completionCost: number;
  };
  confidence: number; // accuracy of estimation
  factors: string[]; // factors affecting the estimation
}

// Utility types
export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'custom';
export type TestStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed';
export type OptimizationType = 'performance' | 'cost' | 'clarity' | 'structure' | 'security';
export type Priority = 'high' | 'medium' | 'low';
export type CollaboratorRole = 'owner' | 'editor' | 'commenter' | 'viewer';