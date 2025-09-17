// @ts-nocheck
import { BaseWorker } from './base-worker';
import { 
  JobType, 
  JobData, 
  JobResult, 
  EmbeddingGenerationJobDataSchema,
  ContentAnalysisJobDataSchema,
  SemanticClusteringJobDataSchema,
  ModelOptimizationJobDataSchema,
  ContextAssemblyJobDataSchema,
  IntelligencePipelineJobDataSchema
} from '../types';
import { EmbeddingService } from '@/lib/embeddings';
import SemanticClusteringService from '@/lib/semantic/clustering';
import ModelOptimizer from '@/lib/models/optimizers';
import ContextAssemblyEngine from '@/lib/context/assembly';
import ContentAnalysisService from '@/lib/ai/content-analysis';
import IntelligenceCoordinator from '@/lib/ai/intelligence-coordinator';
import { prisma } from '@/lib/db';

export class IntelligenceWorker extends BaseWorker {
  protected async processJob(jobId: string, type: JobType, data: JobData): Promise<JobResult> {
    try {
      switch (type) {
        case JobType.EMBEDDING_GENERATION:
          return await this.processEmbeddingGeneration(jobId, data);
        case JobType.CONTENT_ANALYSIS:
          return await this.processContentAnalysis(jobId, data);
        case JobType.SEMANTIC_CLUSTERING:
          return await this.processSemanticClustering(jobId, data);
        case JobType.MODEL_OPTIMIZATION:
          return await this.processModelOptimization(jobId, data);
        case JobType.CONTEXT_ASSEMBLY:
          return await this.processContextAssembly(jobId, data);
        case JobType.INTELLIGENCE_PIPELINE:
          return await this.processIntelligencePipeline(jobId, data);
        default:
          throw new Error(`Unsupported job type: ${type}`);
      }
    } catch (error) {
      console.error(`Intelligence worker error for job ${jobId}:`, error);
      return {
        success: false,
        error: error.message,
        metadata: { jobId, type, timestamp: new Date() },
      };
    }
  }

  private async processEmbeddingGeneration(jobId: string, rawData: JobData): Promise<JobResult> {
    const data = EmbeddingGenerationJobDataSchema.parse(rawData);
    
    await this.updateProgress(jobId, 10, 'Initializing embedding service');
    
    const embeddingService = new EmbeddingService(data.userId);
    
    if (data.itemId) {
      // Single item embedding
      await this.updateProgress(jobId, 30, 'Generating embedding for item');
      
      const result = await embeddingService.embedItem(
        data.itemId,
        data.content,
        data.providerId
      );
      
      await this.updateProgress(jobId, 90, 'Storing embedding');
      
      return {
        success: true,
        data: {
          itemId: data.itemId,
          embedding: {
            provider: result.provider,
            model: result.model,
            dimensions: result.dimensions,
            tokenCount: result.tokenCount,
          },
        },
        metadata: {
          processingTime: Date.now(),
          tokenCount: result.tokenCount,
        },
      };
    } else {
      throw new Error('Item ID is required for embedding generation');
    }
  }

  private async processContentAnalysis(jobId: string, rawData: JobData): Promise<JobResult> {
    const data = ContentAnalysisJobDataSchema.parse(rawData);
    
    if (!data.itemId) {
      throw new Error('Item ID is required for content analysis');
    }
    
    await this.updateProgress(jobId, 10, 'Initializing content analysis');
    
    const analysisService = new ContentAnalysisService(data.userId);
    
    await this.updateProgress(jobId, 30, 'Analyzing content');
    
    const insights = await analysisService.analyzeContent(data.itemId, data.content);
    
    await this.updateProgress(jobId, 90, 'Storing analysis results');
    
    return {
      success: true,
      data: {
        itemId: data.itemId,
        insights: {
          summary: insights.summary,
          quality: insights.quality,
          tags: insights.tags,
          recommendations: insights.recommendations,
          relatedItemsCount: insights.relatedItems.length,
        },
      },
      metadata: {
        processingTime: Date.now(),
        tagsGenerated: insights.tags.tags.length,
        qualityScore: insights.quality.overallScore,
      },
    };
  }

  private async processSemanticClustering(jobId: string, rawData: JobData): Promise<JobResult> {
    const data = SemanticClusteringJobDataSchema.parse(rawData);
    
    await this.updateProgress(jobId, 10, 'Initializing clustering service');
    
    const clusteringService = new SemanticClusteringService(data.userId);
    
    await this.updateProgress(jobId, 30, 'Performing clustering analysis');
    
    const analysis = await clusteringService.clusterItems(data.userId, {
      algorithm: data.algorithm,
      numClusters: data.numClusters,
      threshold: data.threshold,
    });
    
    await this.updateProgress(jobId, 90, 'Storing clustering results');
    
    return {
      success: true,
      data: {
        clusters: analysis.clusters.map(cluster => ({
          id: cluster.id,
          name: cluster.name,
          algorithm: cluster.algorithm,
          itemCount: cluster.items.length,
          threshold: cluster.threshold,
        })),
        summary: analysis.summary,
        silhouetteScore: analysis.silhouetteScore,
        outliers: analysis.outliers,
      },
      metadata: {
        processingTime: Date.now(),
        clustersCreated: analysis.clusters.length,
        outliersFound: analysis.outliers.length,
        qualityScore: analysis.silhouetteScore,
      },
    };
  }

  private async processModelOptimization(jobId: string, rawData: JobData): Promise<JobResult> {
    const data = ModelOptimizationJobDataSchema.parse(rawData);
    
    if (!data.itemId) {
      throw new Error('Item ID is required for model optimization');
    }
    
    await this.updateProgress(jobId, 10, 'Initializing model optimizer');
    
    const optimizer = new ModelOptimizer(data.userId);
    
    await this.updateProgress(jobId, 30, `Optimizing for ${data.targetModel}`);
    
    const result = await optimizer.optimizeForModel(data.content, data.targetModel, {
      maxTokenBudget: data.maxTokenBudget,
      prioritizeQuality: data.prioritizeQuality,
      aggressiveOptimization: data.aggressiveOptimization,
    });
    
    await this.updateProgress(jobId, 70, 'Storing optimization results');
    
    await optimizer.storeOptimization(data.itemId, result);
    
    await this.updateProgress(jobId, 90, 'Optimization complete');
    
    return {
      success: true,
      data: {
        itemId: data.itemId,
        targetModel: data.targetModel,
        optimization: {
          tokenSavings: result.tokenSavings,
          costSavings: result.costSavings,
          qualityScore: result.qualityScore,
          strategiesApplied: result.strategiesApplied.map(s => s.name),
        },
      },
      metadata: {
        processingTime: Date.now(),
        tokenSavings: result.tokenSavings,
        costSavings: result.costSavings,
        qualityScore: result.qualityScore,
      },
    };
  }

  private async processContextAssembly(jobId: string, rawData: JobData): Promise<JobResult> {
    const data = ContextAssemblyJobDataSchema.parse(rawData);
    
    await this.updateProgress(jobId, 10, 'Initializing context assembly engine');
    
    const assemblyEngine = new ContextAssemblyEngine(data.userId);
    
    await this.updateProgress(jobId, 30, 'Finding relevant items');
    
    const context = {
      intent: data.intent,
      query: data.query,
      targetAudience: data.targetAudience,
      domain: data.domain,
    };
    
    const options = {
      strategy: data.strategy,
      targetModel: data.targetModel,
      maxTokens: data.maxTokens,
    };
    
    await this.updateProgress(jobId, 60, 'Assembling context');
    
    const assembledContext = await assemblyEngine.assembleContext(context, options);
    
    await this.updateProgress(jobId, 90, 'Context assembly complete');
    
    return {
      success: true,
      data: {
        context: {
          content: assembledContext.content,
          metadata: assembledContext.metadata,
          itemsIncluded: assembledContext.items.length,
          template: assembledContext.template,
          suggestions: assembledContext.suggestions,
        },
      },
      metadata: {
        processingTime: Date.now(),
        itemsIncluded: assembledContext.items.length,
        totalTokens: assembledContext.metadata.totalTokens,
        qualityScore: assembledContext.metadata.qualityScore,
        confidence: assembledContext.metadata.confidence,
      },
    };
  }

  private async processIntelligencePipeline(jobId: string, rawData: JobData): Promise<JobResult> {
    const data = IntelligencePipelineJobDataSchema.parse(rawData);
    
    await this.updateProgress(jobId, 5, 'Initializing intelligence pipeline');
    
    const coordinator = new IntelligenceCoordinator(data.userId);
    const results: Record<string, any> = {};
    const errors: string[] = [];
    const totalOperations = data.operations.length;
    let completedOperations = 0;

    for (const operation of data.operations) {
      try {
        const operationProgress = (completedOperations / totalOperations) * 80 + 10;
        await this.updateProgress(jobId, operationProgress, `Processing ${operation}`);

        switch (operation) {
          case 'embedding':
            const embeddingResults = await this.processEmbeddingBatch(
              data.itemIds,
              data.userId,
              data.options?.embedding || {}
            );
            results.embeddings = embeddingResults;
            break;

          case 'analysis':
            const analysisResults = await this.processAnalysisBatch(
              data.itemIds,
              data.userId,
              data.options?.analysis || {}
            );
            results.analysis = analysisResults;
            break;

          case 'clustering':
            const clusteringResult = await coordinator.discoverAndOrganize({
              includeUnclustered: true,
              clusteringAlgorithm: data.options?.clustering?.algorithm || 'kmeans',
            });
            results.clustering = clusteringResult;
            break;

          case 'optimization':
            if (data.options?.optimization?.targetModels) {
              const optimizationResults = await this.processOptimizationBatch(
                data.itemIds,
                data.userId,
                data.options.optimization
              );
              results.optimization = optimizationResults;
            }
            break;

          case 'assembly':
            if (data.options?.assembly?.intent) {
              const assemblyResult = await coordinator.smartAssembly(
                data.options.assembly.intent,
                data.options.assembly
              );
              results.assembly = assemblyResult;
            }
            break;

          default:
            errors.push(`Unknown operation: ${operation}`);
        }

        completedOperations++;
      } catch (error) {
        errors.push(`${operation} failed: ${error.message}`);
        console.error(`Pipeline operation ${operation} failed:`, error);
      }
    }

    await this.updateProgress(jobId, 95, 'Pipeline processing complete');

    return {
      success: errors.length === 0,
      data: {
        results,
        operations: data.operations,
        itemsProcessed: data.itemIds.length,
        completedOperations,
        totalOperations,
      },
      error: errors.length > 0 ? errors.join('; ') : undefined,
      metadata: {
        processingTime: Date.now(),
        operationsCompleted: completedOperations,
        operationsTotal: totalOperations,
        errorsCount: errors.length,
      },
    };
  }

  private async processEmbeddingBatch(
    itemIds: string[],
    userId: string,
    options: any
  ): Promise<any> {
    const embeddingService = new EmbeddingService(userId);
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        userId,
      },
      select: { id: true, content: true },
    });

    await embeddingService.batchEmbedItems(
      items.map(item => ({ id: item.id, content: item.content })),
      options.providerId,
      options.batchSize || 10
    );

    return {
      itemsProcessed: items.length,
      provider: options.providerId || 'openai-small',
    };
  }

  private async processAnalysisBatch(
    itemIds: string[],
    userId: string,
    options: any
  ): Promise<any> {
    const analysisService = new ContentAnalysisService(userId);
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        userId,
      },
      select: { id: true, content: true },
    });

    await analysisService.batchAnalyzeContent(
      items.map(item => ({ id: item.id, content: item.content })),
      options.batchSize || 5
    );

    return {
      itemsProcessed: items.length,
      analysisTypes: ['summary', 'quality', 'tags'],
    };
  }

  private async processOptimizationBatch(
    itemIds: string[],
    userId: string,
    options: any
  ): Promise<any> {
    const optimizer = new ModelOptimizer(userId);
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        userId,
      },
      select: { id: true, content: true },
    });

    const results: Record<string, any> = {};
    
    for (const targetModel of options.targetModels) {
      let optimizedCount = 0;
      let totalSavings = 0;

      for (const item of items) {
        try {
          const optimization = await optimizer.optimizeForModel(
            item.content,
            targetModel,
            options
          );
          await optimizer.storeOptimization(item.id, optimization);
          optimizedCount++;
          totalSavings += optimization.tokenSavings;
        } catch (error) {
          console.error(`Optimization failed for item ${item.id}:`, error);
        }
      }

      results[targetModel] = {
        itemsOptimized: optimizedCount,
        totalTokenSavings: totalSavings,
      };
    }

    return results;
  }
}

export default IntelligenceWorker;