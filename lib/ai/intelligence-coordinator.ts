import { EmbeddingService } from '@/lib/embeddings';
import SemanticClusteringService from '@/lib/semantic/clustering';
import ModelOptimizer from '@/lib/models/optimizers';
import ContextAssemblyEngine from '@/lib/context/assembly';
import ContentAnalysisService from '@/lib/ai/content-analysis';
import { jobQueue, JobType, JobPriority } from '@/lib/queue';
import { prisma } from '@/lib/db';

export interface IntelligenceWorkflow {
  id: string;
  name: string;
  description: string;
  steps: IntelligenceStep[];
  triggers: WorkflowTrigger[];
  enabled: boolean;
}

export interface IntelligenceStep {
  type: 'embedding' | 'analysis' | 'clustering' | 'optimization' | 'assembly';
  options: Record<string, any>;
  condition?: string; // JavaScript condition to evaluate
}

export interface WorkflowTrigger {
  event: 'item_created' | 'item_updated' | 'batch_import' | 'manual';
  condition?: string;
}

export interface ProcessingResult {
  success: boolean;
  results: Record<string, any>;
  errors: string[];
  processingTime: number;
  jobIds: string[];
}

/**
 * Central coordinator for all AI intelligence features
 * Orchestrates embeddings, analysis, clustering, optimization, and assembly
 */
export class IntelligenceCoordinator {
  private embeddingService: EmbeddingService;
  private clusteringService: SemanticClusteringService;
  private modelOptimizer: ModelOptimizer;
  private assemblyEngine: ContextAssemblyEngine;
  private analysisService: ContentAnalysisService;

  constructor(private userId: string) {
    this.embeddingService = new EmbeddingService(userId);
    this.clusteringService = new SemanticClusteringService(userId);
    this.modelOptimizer = new ModelOptimizer(userId);
    this.assemblyEngine = new ContextAssemblyEngine(userId);
    this.analysisService = new ContentAnalysisService(userId);
  }

  /**
   * Process a single item through the complete intelligence pipeline
   */
  async processItem(
    itemId: string,
    options: {
      includeEmbedding?: boolean;
      includeAnalysis?: boolean;
      includeClustering?: boolean;
      includeOptimization?: boolean;
      priority?: JobPriority;
      targetModels?: string[];
    } = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const jobIds: string[] = [];
    const results: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // Get item content
      const item = await prisma.item.findUnique({
        where: { id: itemId, userId: this.userId },
      });

      if (!item) {
        throw new Error('Item not found');
      }

      // Step 1: Generate embeddings (foundational for other steps)
      if (options.includeEmbedding !== false) {
        try {
          const embeddingResult = await this.embeddingService.embedItem(
            itemId,
            item.content
          );
          results.embedding = embeddingResult;
        } catch (error) {
          errors.push(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 2: Content analysis (can run in parallel with embeddings)
      if (options.includeAnalysis !== false) {
        try {
          const analysisResult = await this.analysisService.analyzeContent(
            itemId,
            item.content
          );
          results.analysis = analysisResult;
        } catch (error) {
          errors.push(`Content analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 3: Model optimization (if target models specified)
      if (options.includeOptimization !== false && options.targetModels) {
        try {
          const optimizations: Record<string, any> = {};
          for (const model of options.targetModels) {
            const optimization = await this.modelOptimizer.optimizeForModel(
              item.content,
              model
            );
            await this.modelOptimizer.storeOptimization(itemId, optimization);
            optimizations[model] = optimization;
          }
          results.optimizations = optimizations;
        } catch (error) {
          errors.push(`Model optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 4: Queue clustering update (async, since it affects multiple items)
      if (options.includeClustering !== false) {
        try {
          const clusterJobId = await jobQueue.addJob(
            JobType.SIMILARITY_SCORING,
            {
              userId: this.userId,
              triggeredBy: itemId,
              action: 'update_clusters',
            },
            { priority: options.priority || JobPriority.LOW }
          );
          jobIds.push(clusterJobId);
          results.clusteringJobId = clusterJobId;
        } catch (error) {
          errors.push(`Clustering update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        success: errors.length === 0,
        results,
        errors,
        processingTime,
        jobIds,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        success: false,
        results,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
        processingTime,
        jobIds,
      };
    }
  }

  /**
   * Process multiple items in batches
   */
  async processBatch(
    itemIds: string[],
    options: {
      batchSize?: number;
      includeEmbedding?: boolean;
      includeAnalysis?: boolean;
      includeClustering?: boolean;
      includeOptimization?: boolean;
      targetModels?: string[];
      priority?: JobPriority;
    } = {}
  ): Promise<{
    totalItems: number;
    processedItems: number;
    jobIds: string[];
    errors: string[];
  }> {
    const batchSize = options.batchSize || 10;
    const jobIds: string[] = [];
    const errors: string[] = [];
    let processedItems = 0;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize);
      
      // Queue batch processing job
      try {
        const jobId = await jobQueue.addJob(
          JobType.BATCH_IMPORT,
          {
            userId: this.userId,
            operation: 'intelligence_pipeline',
            itemIds: batch,
            options,
          },
          { priority: options.priority || JobPriority.NORMAL }
        );
        jobIds.push(jobId);
        processedItems += batch.length;
      } catch (error) {
        errors.push(`Batch ${i / batchSize + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      totalItems: itemIds.length,
      processedItems,
      jobIds,
      errors,
    };
  }

  /**
   * Smart context assembly with automatic optimization
   */
  async smartAssembly(
    intent: string,
    options: {
      query?: string;
      targetAudience?: string;
      domain?: string;
      maxTokens?: number;
      maxCost?: number;
      targetModel?: string;
      autoOptimize?: boolean;
      includeRelated?: boolean;
    } = {}
  ): Promise<{
    context: any;
    optimization?: any;
    recommendations: string[];
    metadata: Record<string, any>;
  }> {
    const startTime = Date.now();

    // Step 1: Assemble initial context
    const assemblyContext = {
      intent,
      query: options.query,
      targetAudience: options.targetAudience,
      domain: options.domain,
    };

    const assemblyOptions = {
      strategy: 'hybrid' as const,
      targetModel: options.targetModel,
      maxTokens: options.maxTokens,
      maxCost: options.maxCost,
      includeRelated: options.includeRelated !== false,
    };

    const assembledContext = await this.assemblyEngine.assembleContext(
      assemblyContext,
      assemblyOptions
    );

    let optimization: any = undefined;
    const recommendations: string[] = [...(assembledContext.suggestions || [])];

    // Step 2: Auto-optimize if requested and target model specified
    if (options.autoOptimize && options.targetModel) {
      try {
        optimization = await this.modelOptimizer.optimizeForModel(
          assembledContext.content,
          options.targetModel,
          {
            maxTokenBudget: options.maxTokens,
            prioritizeQuality: true,
          }
        );

        if (optimization.tokenSavings > 0) {
          recommendations.push(
            `Optimization saved ${optimization.tokenSavings} tokens (${(optimization.costSavings * 1000).toFixed(3)}¢)`
          );
        }
      } catch (error) {
        recommendations.push('Optimization failed - using original content');
      }
    }

    // Step 3: Generate smart recommendations
    const smartRecommendations = await this.generateSmartRecommendations(
      assembledContext,
      optimization,
      options
    );
    recommendations.push(...smartRecommendations);

    const processingTime = Date.now() - startTime;

    return {
      context: assembledContext,
      optimization,
      recommendations: recommendations.slice(0, 10), // Limit recommendations
      metadata: {
        processingTime,
        itemsIncluded: assembledContext.items.length,
        totalTokens: assembledContext.metadata.totalTokens,
        estimatedCost: assembledContext.metadata.estimatedCost,
        qualityScore: assembledContext.metadata.qualityScore,
        confidence: assembledContext.metadata.confidence,
      },
    };
  }

  /**
   * Generate smart recommendations based on assembly and optimization results
   */
  private async generateSmartRecommendations(
    assembledContext: any,
    optimization: any,
    options: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Token efficiency recommendations
    if (assembledContext.metadata.totalTokens > 4000) {
      recommendations.push('Consider using a model with larger context window for better performance');
    }

    // Cost optimization recommendations
    if (assembledContext.metadata.estimatedCost > 0.10) {
      recommendations.push('High cost detected - consider using a more cost-effective model');
    }

    // Quality recommendations
    if (assembledContext.metadata.qualityScore < 0.7) {
      recommendations.push('Low quality score - review selected items for relevance');
    }

    // Confidence recommendations
    if (assembledContext.metadata.confidence < 0.6) {
      recommendations.push('Low confidence - try refining your intent or adding more specific keywords');
    }

    // Model-specific recommendations
    if (options.targetModel) {
      const modelRecommendations = await this.modelOptimizer.getModelRecommendations(
        assembledContext.content,
        {
          maxCost: options.maxCost,
          prioritizeQuality: true,
        }
      );

      const currentModel = modelRecommendations.find(r => r.modelId === options.targetModel);
      const betterOptions = modelRecommendations.filter(r => 
        r.score > (currentModel?.score || 0) && r.cost < (currentModel?.cost || Infinity)
      );

      if (betterOptions.length > 0) {
        recommendations.push(
          `Consider ${betterOptions[0].modelId} for better cost/quality ratio`
        );
      }
    }

    return recommendations;
  }

  /**
   * Comprehensive content discovery and organization
   */
  async discoverAndOrganize(options: {
    includeUntagged?: boolean;
    includeUnclustered?: boolean;
    suggestFolders?: boolean;
    autoTag?: boolean;
    clusteringAlgorithm?: 'kmeans' | 'hierarchical' | 'dbscan';
  } = {}): Promise<{
    untaggedItems: number;
    newTags: number;
    clusters: any[];
    folderSuggestions: any[];
    processingTime: number;
  }> {
    const startTime = Date.now();

    // Find items needing attention
    const untaggedItems = await prisma.item.findMany({
      where: {
        userId: this.userId,
        tags: { none: {} },
      },
      select: { id: true, content: true, name: true },
    });

    let newTags = 0;
    let clusters: any[] = [];
    let folderSuggestions: any[] = [];

    // Auto-tag untagged items
    if (options.autoTag && options.includeUntagged !== false) {
      for (const item of untaggedItems.slice(0, 20)) { // Limit to avoid overwhelming
        try {
          const analysis = await this.analysisService.analyzeContent(item.id, item.content);
          newTags += analysis.tags.tags.length;
        } catch (error) {
          console.error(`Auto-tagging failed for item ${item.id}:`, error);
        }
      }
    }

    // Perform clustering if requested
    if (options.includeUnclustered !== false) {
      try {
        const clusteringResult = await this.clusteringService.clusterItems(
          this.userId,
          {
            algorithm: options.clusteringAlgorithm || 'kmeans',
            threshold: 0.7,
          }
        );
        clusters = clusteringResult.clusters;
      } catch (error) {
        console.error('Clustering failed:', error);
      }
    }

    // Generate folder suggestions based on clusters and content analysis
    if (options.suggestFolders) {
      folderSuggestions = await this.generateFolderSuggestions(clusters);
    }

    const processingTime = Date.now() - startTime;

    return {
      untaggedItems: untaggedItems.length,
      newTags,
      clusters,
      folderSuggestions,
      processingTime,
    };
  }

  /**
   * Generate folder structure suggestions based on content analysis
   */
  private async generateFolderSuggestions(clusters: any[]): Promise<any[]> {
    const suggestions: any[] = [];

    for (const cluster of clusters.slice(0, 5)) { // Limit suggestions
      // Analyze cluster content to suggest folder structure
      const items = await prisma.item.findMany({
        where: {
          id: { in: cluster.items.map((item: any) => item.itemId) },
        },
        select: {
          type: true,
          metadata: true,
          tags: {
            include: { tag: true },
          },
        },
      });

      const types = [...new Set(items.map(item => item.type))];
      const commonTags = this.findCommonTags(items);

      let suggestedPath = '';
      if (types.length === 1) {
        suggestedPath = `/${types[0]}s/${cluster.name}`;
      } else if (commonTags.length > 0) {
        suggestedPath = `/${commonTags[0]}/${cluster.name}`;
      } else {
        suggestedPath = `/organized/${cluster.name}`;
      }

      suggestions.push({
        path: suggestedPath,
        name: cluster.name,
        description: `Auto-generated from cluster analysis (${cluster.items.length} items)`,
        itemIds: cluster.items.map((item: any) => item.itemId),
        confidence: 0.8,
        reasoning: `Clustered ${cluster.items.length} similar items`,
      });
    }

    return suggestions;
  }

  /**
   * Find common tags across items
   */
  private findCommonTags(items: any[]): string[] {
    const tagCounts: Record<string, number> = {};
    
    for (const item of items) {
      for (const itemTag of item.tags) {
        const tagName = itemTag.tag.name;
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      }
    }

    return Object.entries(tagCounts)
      .filter(([_, count]) => count >= Math.ceil(items.length * 0.5)) // At least 50% of items
      .map(([tag, _]) => tag)
      .slice(0, 3);
  }

  /**
   * Get comprehensive intelligence overview
   */
  async getIntelligenceOverview(): Promise<{
    summary: {
      totalItems: number;
      itemsWithEmbeddings: number;
      itemsWithAnalysis: number;
      activeClusters: number;
      totalOptimizations: number;
    };
    recentActivity: any[];
    recommendations: string[];
    health: {
      embeddingCoverage: number;
      analysisCoverage: number;
      averageQuality: number;
      systemHealth: 'healthy' | 'warning' | 'critical';
    };
  }> {
    const [
      totalItems,
      itemsWithEmbeddings,
      itemsWithAnalysis,
      activeClusters,
      totalOptimizations,
      avgQuality,
      recentGenerations,
    ] = await Promise.all([
      prisma.item.count({ where: { userId: this.userId } }),
      prisma.itemEmbedding.count({
        where: { item: { userId: this.userId } },
      }),
      prisma.contentSummary.count({
        where: { item: { userId: this.userId } },
      }),
      prisma.semanticCluster.count({
        where: {
          items: { some: { item: { userId: this.userId } } },
        },
      }),
      prisma.modelOptimization.count({
        where: { item: { userId: this.userId } },
      }),
      prisma.contentSummary.aggregate({
        where: { item: { userId: this.userId } },
        _avg: { readabilityScore: true },
      }),
      prisma.contextGeneration.findMany({
        where: { userId: this.userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const embeddingCoverage = totalItems > 0 ? (itemsWithEmbeddings / totalItems) * 100 : 0;
    const analysisCoverage = totalItems > 0 ? (itemsWithAnalysis / totalItems) * 100 : 0;
    const averageQuality = avgQuality._avg.readabilityScore || 0;

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (embeddingCoverage < 50 || analysisCoverage < 30) {
      systemHealth = 'warning';
    }
    if (embeddingCoverage < 20 || averageQuality < 0.3) {
      systemHealth = 'critical';
    }

    const recommendations: string[] = [];
    if (embeddingCoverage < 80) {
      recommendations.push(`Generate embeddings for ${totalItems - itemsWithEmbeddings} items to improve search`);
    }
    if (analysisCoverage < 60) {
      recommendations.push(`Analyze ${totalItems - itemsWithAnalysis} items for better organization`);
    }
    if (activeClusters === 0 && totalItems > 10) {
      recommendations.push('Run clustering analysis to discover content patterns');
    }

    return {
      summary: {
        totalItems,
        itemsWithEmbeddings,
        itemsWithAnalysis,
        activeClusters,
        totalOptimizations,
      },
      recentActivity: recentGenerations.map(gen => ({
        type: 'context_generation',
        intent: gen.intent,
        strategy: gen.assemblyStrategy,
        quality: gen.quality,
        createdAt: gen.createdAt,
      })),
      recommendations,
      health: {
        embeddingCoverage,
        analysisCoverage,
        averageQuality,
        systemHealth,
      },
    };
  }
}

export default IntelligenceCoordinator;