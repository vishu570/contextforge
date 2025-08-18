import { prisma } from '../db';
import { jobQueue } from '../queue';
import { JobType, JobPriority } from '../queue/types';
import { WebSocketManager } from '../websocket/manager';

export interface PipelineConfig {
  enableAutoClassification: boolean;
  enableAutoOptimization: boolean;
  enableDuplicateDetection: boolean;
  enableQualityAssessment: boolean;
  batchSize: number;
  priority: JobPriority;
}

export interface OptimizationOptions {
  itemId?: string;
  userId: string;
  forceReprocess?: boolean;
  targetModels?: string[];
  skipIfOptimized?: boolean;
}

export class OptimizationPipeline {
  private static instance: OptimizationPipeline;
  private wsManager: WebSocketManager;
  private defaultConfig: PipelineConfig = {
    enableAutoClassification: true,
    enableAutoOptimization: true,
    enableDuplicateDetection: true,
    enableQualityAssessment: true,
    batchSize: 10,
    priority: JobPriority.NORMAL,
  };

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
  }

  public static getInstance(): OptimizationPipeline {
    if (!OptimizationPipeline.instance) {
      OptimizationPipeline.instance = new OptimizationPipeline();
    }
    return OptimizationPipeline.instance;
  }

  /**
   * Process a single item through the optimization pipeline
   */
  async processItem(itemId: string, options: OptimizationOptions): Promise<void> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        optimizations: true,
        conversions: true,
      },
    });

    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    // Check if item should be skipped
    if (options.skipIfOptimized && this.isItemOptimized(item)) {
      console.log(`Skipping already optimized item: ${itemId}`);
      return;
    }

    // Notify user that processing started
    this.wsManager.sendNotification(options.userId, {
      title: 'Item Processing Started',
      message: `Processing "${item.name}" through optimization pipeline`,
      type: 'info',
      userId: options.userId,
      read: false,
    });

    const jobs: string[] = [];

    try {
      // Step 1: Classification (if needed)
      if (this.shouldClassify(item, options)) {
        const classificationJobId = await jobQueue.addJob(
          JobType.CLASSIFICATION,
          {
            userId: options.userId,
            itemId: item.id,
            content: item.content,
            format: item.format,
            targetModels: options.targetModels,
          },
          { priority: this.defaultConfig.priority }
        );
        jobs.push(classificationJobId);
      }

      // Step 2: Quality Assessment
      if (this.defaultConfig.enableQualityAssessment) {
        const qualityJobId = await jobQueue.addJob(
          JobType.QUALITY_ASSESSMENT,
          {
            userId: options.userId,
            itemId: item.id,
            content: item.content,
            type: item.type,
            format: item.format,
          },
          { priority: this.defaultConfig.priority }
        );
        jobs.push(qualityJobId);
      }

      // Step 3: Optimization for each target model
      if (this.defaultConfig.enableAutoOptimization) {
        const targetModels = options.targetModels || this.getDefaultTargetModels(item);
        
        for (const model of targetModels) {
          const optimizationJobId = await jobQueue.addJob(
            JobType.OPTIMIZATION,
            {
              userId: options.userId,
              itemId: item.id,
              content: item.content,
              targetModel: model,
              currentFormat: item.format,
            },
            { priority: this.defaultConfig.priority }
          );
          jobs.push(optimizationJobId);
        }
      }

      // Step 4: Log the pipeline execution
      await this.logPipelineExecution(item.id, jobs, options.userId);

    } catch (error) {
      console.error(`Failed to process item ${itemId}:`, error);
      
      this.wsManager.sendNotification(options.userId, {
        title: 'Processing Failed',
        message: `Failed to process "${item.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        userId: options.userId,
        read: false,
      });
      
      throw error;
    }
  }

  /**
   * Process multiple items in batch
   */
  async processBatch(itemIds: string[], options: OptimizationOptions): Promise<void> {
    const batches = this.chunkArray(itemIds, this.defaultConfig.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} items`);

      // Process batch items in parallel
      const batchPromises = batch.map(itemId => 
        this.processItem(itemId, options).catch(error => {
          console.error(`Failed to process item ${itemId} in batch:`, error);
          return null; // Continue with other items
        })
      );

      await Promise.all(batchPromises);
      
      // Brief delay between batches to avoid overwhelming the system
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Auto-process new items
   */
  async autoProcessNewItem(itemId: string, userId: string): Promise<void> {
    await this.processItem(itemId, {
      itemId,
      userId,
      skipIfOptimized: true,
    });
  }

  /**
   * Run duplicate detection across user's items
   */
  async runDuplicateDetection(userId: string, collectionId?: string): Promise<void> {
    if (!this.defaultConfig.enableDuplicateDetection) {
      return;
    }

    const whereClause: any = { userId };
    if (collectionId) {
      whereClause.collections = {
        some: { collectionId },
      };
    }

    const items = await prisma.item.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        content: true,
      },
      take: 1000, // Limit for performance
    });

    if (items.length < 2) {
      return; // Need at least 2 items for duplicate detection
    }

    const jobId = await jobQueue.addJob(
      JobType.DEDUPLICATION,
      {
        userId,
        items,
        threshold: 0.8,
      },
      { priority: this.defaultConfig.priority }
    );

    this.wsManager.sendNotification(userId, {
      title: 'Duplicate Detection Started',
      message: `Analyzing ${items.length} items for potential duplicates`,
      type: 'info',
      userId,
      read: false,
    });
  }

  /**
   * Run similarity scoring between specific items
   */
  async runSimilarityScoring(
    sourceItemId: string,
    targetItemIds: string[],
    userId: string
  ): Promise<void> {
    const sourceItem = await prisma.item.findUnique({
      where: { id: sourceItemId },
      select: { content: true },
    });

    if (!sourceItem) {
      throw new Error(`Source item ${sourceItemId} not found`);
    }

    const targetItems = await prisma.item.findMany({
      where: { id: { in: targetItemIds } },
      select: { id: true, content: true },
    });

    for (const targetItem of targetItems) {
      await jobQueue.addJob(
        JobType.SIMILARITY_SCORING,
        {
          userId,
          sourceContent: sourceItem.content,
          targetContent: targetItem.content,
          algorithm: 'semantic',
          metadata: {
            sourceItemId,
            targetItemId: targetItem.id,
          },
        },
        { priority: this.defaultConfig.priority }
      );
    }
  }

  /**
   * Get pipeline status for user
   */
  async getPipelineStatus(userId: string): Promise<any> {
    const recentJobs = await jobQueue.getUserJobs(userId, 20);
    
    const stats = {
      total: recentJobs.length,
      pending: recentJobs.filter(job => job.status === 'pending').length,
      processing: recentJobs.filter(job => job.status === 'processing').length,
      completed: recentJobs.filter(job => job.status === 'completed').length,
      failed: recentJobs.filter(job => job.status === 'failed').length,
    };

    const jobsByType = recentJobs.reduce((acc, job) => {
      acc[job.type] = (acc[job.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      stats,
      jobsByType,
      recentJobs: recentJobs.slice(0, 10),
    };
  }

  /**
   * Update pipeline configuration
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.defaultConfig };
  }

  // Private helper methods

  private isItemOptimized(item: any): boolean {
    // Check if item has recent optimizations
    const hasRecentOptimizations = item.optimizations?.some((opt: any) => 
      opt.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
    );

    return hasRecentOptimizations || false;
  }

  private shouldClassify(item: any, options: OptimizationOptions): boolean {
    if (!this.defaultConfig.enableAutoClassification) {
      return false;
    }

    // Always classify if forced
    if (options.forceReprocess) {
      return true;
    }

    // Classify if type is 'other' or missing subtype
    return item.type === 'other' || !item.subType;
  }

  private getDefaultTargetModels(item: any): string[] {
    // Parse existing target models or return defaults
    if (item.targetModels) {
      return item.targetModels.split(',').map((m: string) => m.trim());
    }

    // Default models based on content type
    switch (item.type) {
      case 'agent':
        return ['anthropic', 'openai'];
      case 'prompt':
        return ['openai', 'anthropic', 'gemini'];
      case 'template':
        return ['openai', 'gemini'];
      default:
        return ['openai'];
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async logPipelineExecution(
    itemId: string,
    jobIds: string[],
    userId: string
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        itemId,
        action: 'pipeline_execution',
        entityType: 'item',
        entityId: itemId,
        metadata: JSON.stringify({
          jobIds,
          timestamp: new Date().toISOString(),
          pipelineConfig: this.defaultConfig,
        }),
      },
    });
  }
}

export const optimizationPipeline = OptimizationPipeline.getInstance();