import { z } from 'zod';

// Job types enum
export enum JobType {
  CLASSIFICATION = 'classification',
  OPTIMIZATION = 'optimization',
  CONVERSION = 'conversion',
  DEDUPLICATION = 'deduplication',
  FOLDER_SUGGESTION = 'folder_suggestion',
  BATCH_IMPORT = 'batch_import',
  QUALITY_ASSESSMENT = 'quality_assessment',
  SIMILARITY_SCORING = 'similarity_scoring',
  // New intelligence job types
  EMBEDDING_GENERATION = 'embedding_generation',
  CONTENT_ANALYSIS = 'content_analysis',
  SEMANTIC_CLUSTERING = 'semantic_clustering',
  MODEL_OPTIMIZATION = 'model_optimization',
  CONTEXT_ASSEMBLY = 'context_assembly',
  INTELLIGENCE_PIPELINE = 'intelligence_pipeline',
}

// Job priorities
export enum JobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

// Job status enum
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRY = 'retry',
  DEAD = 'dead',
}

// Base job data schema
export const BaseJobDataSchema = z.object({
  userId: z.string(),
  itemId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Classification job data
export const ClassificationJobDataSchema = BaseJobDataSchema.extend({
  content: z.string(),
  format: z.string(),
  targetModels: z.array(z.string()).optional(),
});

// Optimization job data
export const OptimizationJobDataSchema = BaseJobDataSchema.extend({
  content: z.string(),
  targetModel: z.string(),
  currentFormat: z.string(),
});

// Conversion job data
export const ConversionJobDataSchema = BaseJobDataSchema.extend({
  content: z.string(),
  fromFormat: z.string(),
  toFormat: z.string(),
});

// Deduplication job data
export const DeduplicationJobDataSchema = BaseJobDataSchema.extend({
  items: z.array(z.object({
    id: z.string(),
    content: z.string(),
    name: z.string(),
  })),
  threshold: z.number().min(0).max(1).default(0.8),
});

// Folder suggestion job data
export const FolderSuggestionJobDataSchema = BaseJobDataSchema.extend({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    content: z.string(),
    type: z.string(),
  })),
});

// Batch import job data
export const BatchImportJobDataSchema = BaseJobDataSchema.extend({
  importId: z.string(),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    metadata: z.record(z.any()).optional(),
  })),
});

// Quality assessment job data
export const QualityAssessmentJobDataSchema = BaseJobDataSchema.extend({
  content: z.string(),
  type: z.string(),
  format: z.string(),
});

// Similarity scoring job data
export const SimilarityScoringJobDataSchema = BaseJobDataSchema.extend({
  sourceContent: z.string(),
  targetContent: z.string(),
  algorithm: z.enum(['semantic', 'syntactic', 'hybrid']).default('semantic'),
});

// New intelligence job schemas
export const EmbeddingGenerationJobDataSchema = BaseJobDataSchema.extend({
  content: z.string(),
  providerId: z.string().optional(),
});

export const ContentAnalysisJobDataSchema = BaseJobDataSchema.extend({
  content: z.string(),
  includeQuality: z.boolean().default(true),
  includeSummary: z.boolean().default(true),
  includeTags: z.boolean().default(true),
});

export const SemanticClusteringJobDataSchema = BaseJobDataSchema.extend({
  algorithm: z.enum(['kmeans', 'hierarchical', 'dbscan']).default('kmeans'),
  numClusters: z.number().optional(),
  threshold: z.number().min(0).max(1).default(0.7),
  itemIds: z.array(z.string()).optional(),
});

export const ModelOptimizationJobDataSchema = BaseJobDataSchema.extend({
  content: z.string(),
  targetModel: z.string(),
  maxTokenBudget: z.number().optional(),
  prioritizeQuality: z.boolean().default(false),
  aggressiveOptimization: z.boolean().default(false),
});

export const ContextAssemblyJobDataSchema = BaseJobDataSchema.extend({
  intent: z.string(),
  query: z.string().optional(),
  targetAudience: z.string().optional(),
  domain: z.string().optional(),
  strategy: z.enum(['automatic', 'semantic', 'manual', 'hybrid']).default('automatic'),
  targetModel: z.string().optional(),
  maxTokens: z.number().default(8000),
});

export const IntelligencePipelineJobDataSchema = BaseJobDataSchema.extend({
  itemIds: z.array(z.string()),
  operations: z.array(z.enum([
    'embedding',
    'analysis',
    'clustering',
    'optimization',
    'assembly'
  ])),
  options: z.record(z.any()).optional(),
});

// Union type for all job data
export type JobData = 
  | z.infer<typeof ClassificationJobDataSchema>
  | z.infer<typeof OptimizationJobDataSchema>
  | z.infer<typeof ConversionJobDataSchema>
  | z.infer<typeof DeduplicationJobDataSchema>
  | z.infer<typeof FolderSuggestionJobDataSchema>
  | z.infer<typeof BatchImportJobDataSchema>
  | z.infer<typeof QualityAssessmentJobDataSchema>
  | z.infer<typeof SimilarityScoringJobDataSchema>
  | z.infer<typeof EmbeddingGenerationJobDataSchema>
  | z.infer<typeof ContentAnalysisJobDataSchema>
  | z.infer<typeof SemanticClusteringJobDataSchema>
  | z.infer<typeof ModelOptimizationJobDataSchema>
  | z.infer<typeof ContextAssemblyJobDataSchema>
  | z.infer<typeof IntelligencePipelineJobDataSchema>;

// Job result types
export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// Job progress interface
export interface JobProgress {
  percentage: number;
  message: string;
  data?: any;
}

// Job interface
export interface Job {
  id: string;
  type: JobType;
  data: JobData;
  priority: JobPriority;
  status: JobStatus;
  result?: JobResult;
  progress?: JobProgress;
  retryCount: number;
  maxRetries: number;
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  error?: string;
}

// WebSocket message types
export enum WebSocketMessageType {
  JOB_CREATED = 'job_created',
  JOB_STARTED = 'job_started',
  JOB_PROGRESS = 'job_progress',
  JOB_COMPLETED = 'job_completed',
  JOB_FAILED = 'job_failed',
  SYSTEM_STATUS = 'system_status',
  ACTIVITY_FEED = 'activity_feed',
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  userId?: string;
  data: any;
  timestamp: Date;
}