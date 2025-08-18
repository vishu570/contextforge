import { prisma } from '@/lib/db';
import { EmbeddingService } from '@/lib/embeddings';
import { ModelOptimizer, MODEL_CONFIGS } from '@/lib/models/optimizers';
import { LLMService } from '@/lib/llm';

export interface ContextAssemblyOptions {
  strategy: 'automatic' | 'semantic' | 'manual' | 'hybrid';
  targetModel?: string;
  maxTokens?: number;
  maxCost?: number;
  prioritizeQuality?: boolean;
  includeRelated?: boolean;
  diversityWeight?: number; // 0-1, higher means more diverse content
  relevanceThreshold?: number; // 0-1, minimum relevance to include item
  templateId?: string;
}

export interface AssemblyContext {
  intent: string;
  query?: string;
  targetAudience?: string;
  useCase?: string;
  domain?: string;
  complexity?: 'simple' | 'moderate' | 'complex';
}

export interface AssembledContext {
  content: string;
  metadata: {
    totalTokens: number;
    estimatedCost: number;
    qualityScore: number;
    confidence: number;
    strategy: string;
    targetModel?: string;
  };
  items: Array<{
    itemId: string;
    position: number;
    relevanceScore: number;
    includedTokens: number;
    reason: string;
    role?: string;
  }>;
  template?: {
    id: string;
    name: string;
    variables: Record<string, any>;
  };
  suggestions?: string[];
}

export interface ContextTemplate {
  id: string;
  name: string;
  description?: string;
  template: string;
  variables: Record<string, any>;
  category?: string;
  targetModel?: string;
  quality?: number;
}

export class ContextAssemblyEngine {
  private embeddingService: EmbeddingService;
  private modelOptimizer: ModelOptimizer;
  private llmService: LLMService;

  constructor(private userId: string) {
    this.embeddingService = new EmbeddingService(userId);
    this.modelOptimizer = new ModelOptimizer(userId);
    this.llmService = new LLMService(userId);
  }

  /**
   * Assemble intelligent context based on user intent
   */
  async assembleContext(
    context: AssemblyContext,
    options: ContextAssemblyOptions
  ): Promise<AssembledContext> {
    // Get relevant items based on strategy
    const relevantItems = await this.findRelevantItems(context, options);
    
    // Apply template if specified
    let template: ContextTemplate | undefined;
    if (options.templateId) {
      template = await this.getTemplate(options.templateId);
    } else if (options.strategy === 'automatic' || options.strategy === 'hybrid') {
      template = await this.suggestTemplate(context, relevantItems);
    }

    // Select and order items based on relevance and constraints
    const selectedItems = await this.selectOptimalItems(
      relevantItems,
      context,
      options,
      template
    );

    // Generate the final context
    const assembledContent = await this.generateFinalContext(
      selectedItems,
      template,
      context,
      options
    );

    // Calculate metadata
    const metadata = await this.calculateMetadata(assembledContent, selectedItems, options);

    // Generate suggestions for improvement
    const suggestions = await this.generateSuggestions(context, selectedItems, options);

    // Store the generation for learning
    const generationId = await this.storeGeneration(
      context,
      options,
      assembledContent,
      selectedItems,
      template,
      metadata
    );

    return {
      content: assembledContent,
      metadata,
      items: selectedItems,
      template: template ? {
        id: template.id,
        name: template.name,
        variables: template.variables,
      } : undefined,
      suggestions,
    };
  }

  /**
   * Find relevant items based on context and strategy
   */
  private async findRelevantItems(
    context: AssemblyContext,
    options: ContextAssemblyOptions
  ): Promise<Array<{
    itemId: string;
    name: string;
    type: string;
    content: string;
    relevanceScore: number;
    reason: string;
  }>> {
    let items: any[] = [];

    switch (options.strategy) {
      case 'semantic':
      case 'hybrid':
        // Use semantic search based on intent and query
        const searchQuery = context.query || context.intent;
        const semanticResults = await this.embeddingService.semanticSearch(
          searchQuery,
          this.userId,
          {
            threshold: options.relevanceThreshold || 0.7,
            limit: 50,
          }
        );

        // Get item details
        const semanticItems = await prisma.item.findMany({
          where: {
            id: { in: semanticResults.results.map(r => r.itemId) },
            userId: this.userId,
          },
        });

        items = semanticItems.map(item => {
          const result = semanticResults.results.find(r => r.itemId === item.id);
          return {
            itemId: item.id,
            name: item.name,
            type: item.type,
            content: item.content,
            relevanceScore: result?.similarity || 0,
            reason: `Semantic similarity: ${(result?.similarity || 0).toFixed(2)}`,
          };
        });
        break;

      case 'automatic':
        // Combine multiple strategies
        items = await this.automaticItemSelection(context, options);
        break;

      case 'manual':
        // For manual strategy, we'd typically get pre-selected items
        // For now, fall back to basic search
        items = await this.keywordBasedSearch(context, options);
        break;
    }

    // Apply domain and type filtering
    items = this.applyFilters(items, context, options);

    return items.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Automatic item selection using multiple strategies
   */
  private async automaticItemSelection(
    context: AssemblyContext,
    options: ContextAssemblyOptions
  ): Promise<any[]> {
    const items: any[] = [];

    // 1. Semantic search on intent
    if (context.intent) {
      const semanticResults = await this.embeddingService.semanticSearch(
        context.intent,
        this.userId,
        { threshold: 0.6, limit: 20 }
      );

      const semanticItems = await prisma.item.findMany({
        where: { id: { in: semanticResults.results.map(r => r.itemId) } },
      });

      items.push(...semanticItems.map(item => {
        const result = semanticResults.results.find(r => r.itemId === item.id);
        return {
          itemId: item.id,
          name: item.name,
          type: item.type,
          content: item.content,
          relevanceScore: (result?.similarity || 0) * 0.8, // Weight semantic
          reason: 'Semantic match on intent',
        };
      }));
    }

    // 2. Type-based selection for common patterns
    const typeBasedItems = await this.getItemsByTypeRelevance(context);
    items.push(...typeBasedItems);

    // 3. Recent and high-quality items
    const qualityItems = await this.getHighQualityItems(context);
    items.push(...qualityItems);

    // Deduplicate and merge scores
    const itemMap = new Map();
    for (const item of items) {
      if (itemMap.has(item.itemId)) {
        const existing = itemMap.get(item.itemId);
        existing.relevanceScore = Math.max(existing.relevanceScore, item.relevanceScore);
        existing.reason += `, ${item.reason}`;
      } else {
        itemMap.set(item.itemId, item);
      }
    }

    return Array.from(itemMap.values());
  }

  /**
   * Get items based on type relevance to context
   */
  private async getItemsByTypeRelevance(context: AssemblyContext): Promise<any[]> {
    const typeWeights: Record<string, number> = {
      prompt: 0.9,
      agent: 0.8,
      template: 0.7,
      rule: 0.6,
      snippet: 0.5,
      other: 0.3,
    };

    const items = await prisma.item.findMany({
      where: {
        userId: this.userId,
        type: { in: Object.keys(typeWeights) },
      },
      take: 30,
      orderBy: { updatedAt: 'desc' },
    });

    return items.map(item => ({
      itemId: item.id,
      name: item.name,
      type: item.type,
      content: item.content,
      relevanceScore: typeWeights[item.type] || 0.3,
      reason: `Type relevance: ${item.type}`,
    }));
  }

  /**
   * Get high-quality items based on usage and optimization scores
   */
  private async getHighQualityItems(context: AssemblyContext): Promise<any[]> {
    // Get items with high-quality optimizations
    const optimizedItems = await prisma.modelOptimization.findMany({
      where: {
        item: { userId: this.userId },
        qualityScore: { gte: 0.8 },
        status: 'approved',
      },
      include: { item: true },
      take: 15,
      orderBy: { qualityScore: 'desc' },
    });

    return optimizedItems.map(opt => ({
      itemId: opt.item.id,
      name: opt.item.name,
      type: opt.item.type,
      content: opt.item.content,
      relevanceScore: opt.qualityScore * 0.6, // Weight quality
      reason: `High quality (${opt.qualityScore.toFixed(2)})`,
    }));
  }

  /**
   * Keyword-based search fallback
   */
  private async keywordBasedSearch(
    context: AssemblyContext,
    options: ContextAssemblyOptions
  ): Promise<any[]> {
    const keywords = this.extractKeywords(context.intent + ' ' + (context.query || ''));
    
    const items = await prisma.item.findMany({
      where: {
        userId: this.userId,
        OR: keywords.map(keyword => ({
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { content: { contains: keyword, mode: 'insensitive' } },
          ],
        })),
      },
      take: 20,
    });

    return items.map(item => ({
      itemId: item.id,
      name: item.name,
      type: item.type,
      content: item.content,
      relevanceScore: this.calculateKeywordRelevance(item, keywords),
      reason: 'Keyword match',
    }));
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
  }

  /**
   * Calculate keyword relevance score
   */
  private calculateKeywordRelevance(item: any, keywords: string[]): number {
    const text = (item.name + ' ' + item.content).toLowerCase();
    const matches = keywords.filter(keyword => text.includes(keyword));
    return matches.length / keywords.length;
  }

  /**
   * Apply filters based on context
   */
  private applyFilters(items: any[], context: AssemblyContext, options: ContextAssemblyOptions): any[] {
    let filtered = items;

    // Filter by domain if specified
    if (context.domain) {
      filtered = filtered.filter(item => 
        item.content.toLowerCase().includes(context.domain.toLowerCase()) ||
        item.name.toLowerCase().includes(context.domain.toLowerCase())
      );
    }

    // Filter by complexity
    if (context.complexity) {
      filtered = this.filterByComplexity(filtered, context.complexity);
    }

    return filtered;
  }

  /**
   * Filter items by complexity level
   */
  private filterByComplexity(items: any[], complexity: string): any[] {
    // Simple heuristic based on content length and structure
    return items.filter(item => {
      const contentLength = item.content.length;
      const hasCodeBlocks = item.content.includes('```');
      const hasComplexStructure = item.content.split('\n').length > 10;

      switch (complexity) {
        case 'simple':
          return contentLength < 500 && !hasCodeBlocks;
        case 'moderate':
          return contentLength < 2000 && (!hasComplexStructure || hasCodeBlocks);
        case 'complex':
          return true; // Include all for complex requests
        default:
          return true;
      }
    });
  }

  /**
   * Select optimal items based on constraints
   */
  private async selectOptimalItems(
    relevantItems: any[],
    context: AssemblyContext,
    options: ContextAssemblyOptions,
    template?: ContextTemplate
  ): Promise<Array<{
    itemId: string;
    position: number;
    relevanceScore: number;
    includedTokens: number;
    reason: string;
    role?: string;
  }>> {
    const maxTokens = options.maxTokens || 8000;
    const diversityWeight = options.diversityWeight || 0.3;
    
    let currentTokens = 0;
    const selectedItems: any[] = [];
    const usedTypes = new Set<string>();

    // Sort by relevance and apply diversity
    const sortedItems = relevantItems.sort((a, b) => {
      let scoreA = a.relevanceScore;
      let scoreB = b.relevanceScore;

      // Apply diversity bonus
      if (diversityWeight > 0) {
        if (!usedTypes.has(a.type)) scoreA += diversityWeight;
        if (!usedTypes.has(b.type)) scoreB += diversityWeight;
      }

      return scoreB - scoreA;
    });

    for (const item of sortedItems) {
      // Estimate tokens for this item
      const tokenCount = Math.ceil(item.content.length / 4);
      
      // Skip if adding this item would exceed token limit
      if (currentTokens + tokenCount > maxTokens) {
        continue;
      }

      // Determine role if template is being used
      let role: string | undefined;
      if (template) {
        role = this.determineItemRole(item, template);
      }

      selectedItems.push({
        itemId: item.itemId,
        position: selectedItems.length,
        relevanceScore: item.relevanceScore,
        includedTokens: tokenCount,
        reason: item.reason,
        role,
      });

      currentTokens += tokenCount;
      usedTypes.add(item.type);

      // Stop if we have enough content
      if (selectedItems.length >= 15 || currentTokens > maxTokens * 0.8) {
        break;
      }
    }

    return selectedItems;
  }

  /**
   * Determine the role of an item within a template
   */
  private determineItemRole(item: any, template: ContextTemplate): string {
    // Simple heuristic based on item type and template structure
    if (template.template.includes('{{system}}') && item.type === 'rule') {
      return 'system';
    }
    if (template.template.includes('{{context}}') && item.type === 'prompt') {
      return 'context';
    }
    if (template.template.includes('{{examples}}') && item.type === 'snippet') {
      return 'examples';
    }
    if (template.template.includes('{{instructions}}') && item.type === 'prompt') {
      return 'instructions';
    }
    return 'content';
  }

  /**
   * Generate the final assembled context
   */
  private async generateFinalContext(
    selectedItems: any[],
    template: ContextTemplate | undefined,
    context: AssemblyContext,
    options: ContextAssemblyOptions
  ): Promise<string> {
    if (template) {
      return this.applyTemplate(selectedItems, template, context);
    } else {
      return this.generateStructuredContext(selectedItems, context, options);
    }
  }

  /**
   * Apply template to generate context
   */
  private async applyTemplate(
    selectedItems: any[],
    template: ContextTemplate,
    context: AssemblyContext
  ): Promise<string> {
    let content = template.template;

    // Get item contents grouped by role
    const itemsByRole: Record<string, string[]> = {};
    
    for (const item of selectedItems) {
      const itemData = await prisma.item.findUnique({
        where: { id: item.itemId },
      });
      
      if (itemData) {
        const role = item.role || 'content';
        if (!itemsByRole[role]) itemsByRole[role] = [];
        itemsByRole[role].push(itemData.content);
      }
    }

    // Replace template variables
    content = content.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      if (itemsByRole[variable]) {
        return itemsByRole[variable].join('\n\n');
      }
      
      // Handle special variables
      switch (variable) {
        case 'intent':
          return context.intent;
        case 'query':
          return context.query || '';
        case 'audience':
          return context.targetAudience || 'general audience';
        case 'domain':
          return context.domain || 'general';
        case 'useCase':
          return context.useCase || 'general purpose';
        default:
          return match; // Keep original if no replacement found
      }
    });

    return content;
  }

  /**
   * Generate structured context without template
   */
  private async generateStructuredContext(
    selectedItems: any[],
    context: AssemblyContext,
    options: ContextAssemblyOptions
  ): Promise<string> {
    let content = '';

    // Add header with intent
    content += `# Context for: ${context.intent}\n\n`;
    
    if (context.query) {
      content += `**Query:** ${context.query}\n\n`;
    }

    if (context.targetAudience) {
      content += `**Target Audience:** ${context.targetAudience}\n\n`;
    }

    // Group items by type for better organization
    const itemsByType: Record<string, any[]> = {};
    for (const item of selectedItems) {
      const itemData = await prisma.item.findUnique({
        where: { id: item.itemId },
      });
      
      if (itemData) {
        const type = itemData.type;
        if (!itemsByType[type]) itemsByType[type] = [];
        itemsByType[type].push({
          ...item,
          name: itemData.name,
          content: itemData.content,
        });
      }
    }

    // Add content by type in logical order
    const typeOrder = ['rule', 'agent', 'prompt', 'template', 'snippet', 'other'];
    
    for (const type of typeOrder) {
      if (itemsByType[type] && itemsByType[type].length > 0) {
        content += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;
        
        for (const item of itemsByType[type]) {
          content += `### ${item.name}\n\n`;
          content += `${item.content}\n\n`;
          content += `*Relevance: ${item.relevanceScore.toFixed(2)} - ${item.reason}*\n\n`;
        }
      }
    }

    return content;
  }

  /**
   * Calculate metadata for assembled context
   */
  private async calculateMetadata(
    content: string,
    selectedItems: any[],
    options: ContextAssemblyOptions
  ): Promise<{
    totalTokens: number;
    estimatedCost: number;
    qualityScore: number;
    confidence: number;
    strategy: string;
    targetModel?: string;
  }> {
    const totalTokens = Math.ceil(content.length / 4);
    
    let estimatedCost = 0;
    if (options.targetModel && MODEL_CONFIGS[options.targetModel]) {
      const config = MODEL_CONFIGS[options.targetModel];
      estimatedCost = (totalTokens * config.inputCostPer1k) / 1000;
    }

    const qualityScore = this.calculateQualityScore(selectedItems);
    const confidence = this.calculateConfidenceScore(selectedItems, options);

    return {
      totalTokens,
      estimatedCost,
      qualityScore,
      confidence,
      strategy: options.strategy,
      targetModel: options.targetModel,
    };
  }

  /**
   * Calculate quality score for selected items
   */
  private calculateQualityScore(selectedItems: any[]): number {
    if (selectedItems.length === 0) return 0;

    const avgRelevance = selectedItems.reduce((sum, item) => sum + item.relevanceScore, 0) / selectedItems.length;
    const diversityBonus = new Set(selectedItems.map(item => item.type || 'unknown')).size / 5; // Max 5 types
    
    return Math.min(avgRelevance + (diversityBonus * 0.1), 1.0);
  }

  /**
   * Calculate confidence score for assembly
   */
  private calculateConfidenceScore(selectedItems: any[], options: ContextAssemblyOptions): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for semantic strategy with good matches
    if (options.strategy === 'semantic' || options.strategy === 'hybrid') {
      const highRelevanceItems = selectedItems.filter(item => item.relevanceScore > 0.8);
      confidence += (highRelevanceItems.length / selectedItems.length) * 0.3;
    }

    // Higher confidence for template-based assembly
    if (options.templateId) {
      confidence += 0.2;
    }

    // Lower confidence if very few items found
    if (selectedItems.length < 3) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate suggestions for improvement
   */
  private async generateSuggestions(
    context: AssemblyContext,
    selectedItems: any[],
    options: ContextAssemblyOptions
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Check for missing item types
    const includedTypes = new Set(selectedItems.map(item => item.type));
    if (!includedTypes.has('rule') && context.domain) {
      suggestions.push('Consider adding domain-specific rules or guidelines');
    }
    if (!includedTypes.has('agent') && context.targetAudience) {
      suggestions.push('Consider adding an agent persona for better audience targeting');
    }

    // Token budget suggestions
    const totalTokens = selectedItems.reduce((sum, item) => sum + item.includedTokens, 0);
    if (options.maxTokens && totalTokens > options.maxTokens * 0.9) {
      suggestions.push('Context is near token limit - consider using a more concise template');
    }

    // Quality suggestions
    const avgRelevance = selectedItems.reduce((sum, item) => sum + item.relevanceScore, 0) / selectedItems.length;
    if (avgRelevance < 0.7) {
      suggestions.push('Low relevance scores - consider refining your intent or using semantic search');
    }

    return suggestions;
  }

  /**
   * Store generation for learning and analytics
   */
  private async storeGeneration(
    context: AssemblyContext,
    options: ContextAssemblyOptions,
    content: string,
    selectedItems: any[],
    template: ContextTemplate | undefined,
    metadata: any
  ): Promise<string> {
    try {
      const generation = await prisma.contextGeneration.create({
        data: {
          userId: this.userId,
          templateId: template?.id,
          intent: context.intent,
          query: context.query,
          assemblyStrategy: options.strategy,
          generatedContext: content,
          tokenCount: metadata.totalTokens,
          cost: metadata.estimatedCost,
          targetModel: options.targetModel,
          quality: metadata.qualityScore,
          confidence: metadata.confidence,
          metadata: JSON.stringify({
            context,
            options,
            selectedItemsCount: selectedItems.length,
          }),
        },
      });

      // Store individual item associations
      for (const item of selectedItems) {
        await prisma.contextGenerationItem.create({
          data: {
            generationId: generation.id,
            itemId: item.itemId,
            position: item.position,
            relevanceScore: item.relevanceScore,
            includedTokens: item.includedTokens,
            reason: item.reason,
          },
        });
      }

      return generation.id;
    } catch (error) {
      console.error('Error storing generation:', error);
      return 'error';
    }
  }

  /**
   * Get or suggest a template for the context
   */
  private async getTemplate(templateId: string): Promise<ContextTemplate | undefined> {
    try {
      const template = await prisma.contextTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) return undefined;

      return {
        id: template.id,
        name: template.name,
        description: template.description || undefined,
        template: template.template,
        variables: JSON.parse(template.variables),
        category: template.category || undefined,
        targetModel: template.targetModel || undefined,
        quality: template.quality || undefined,
      };
    } catch (error) {
      console.error('Error getting template:', error);
      return undefined;
    }
  }

  /**
   * Suggest template based on context and items
   */
  private async suggestTemplate(
    context: AssemblyContext,
    relevantItems: any[]
  ): Promise<ContextTemplate | undefined> {
    try {
      // Find templates that match the context
      const templates = await prisma.contextTemplate.findMany({
        where: {
          OR: [
            { userId: this.userId },
            { isPublic: true },
          ],
        },
        orderBy: { quality: 'desc' },
        take: 10,
      });

      // Score templates based on context fit
      const scoredTemplates = templates.map(template => {
        let score = 0;
        const templateLower = template.template.toLowerCase();
        const intentLower = context.intent.toLowerCase();

        // Check for intent keywords in template
        const intentWords = intentLower.split(' ');
        for (const word of intentWords) {
          if (word.length > 3 && templateLower.includes(word)) {
            score += 0.2;
          }
        }

        // Check for item type compatibility
        const itemTypes = new Set(relevantItems.map(item => item.type));
        if (templateLower.includes('{{system}}') && itemTypes.has('rule')) score += 0.3;
        if (templateLower.includes('{{examples}}') && itemTypes.has('snippet')) score += 0.3;
        if (templateLower.includes('{{context}}') && itemTypes.has('prompt')) score += 0.3;

        // Quality bonus
        score += (template.quality || 0.5) * 0.4;

        return { template, score };
      });

      const best = scoredTemplates.sort((a, b) => b.score - a.score)[0];
      
      if (best && best.score > 0.6) {
        return {
          id: best.template.id,
          name: best.template.name,
          description: best.template.description || undefined,
          template: best.template.template,
          variables: JSON.parse(best.template.variables),
          category: best.template.category || undefined,
          targetModel: best.template.targetModel || undefined,
          quality: best.template.quality || undefined,
        };
      }

      return undefined;
    } catch (error) {
      console.error('Error suggesting template:', error);
      return undefined;
    }
  }

  /**
   * Create a new context template
   */
  async createTemplate(
    name: string,
    template: string,
    options: {
      description?: string;
      category?: string;
      targetModel?: string;
      variables?: Record<string, any>;
      isPublic?: boolean;
    } = {}
  ): Promise<string> {
    try {
      const contextTemplate = await prisma.contextTemplate.create({
        data: {
          userId: this.userId,
          name,
          description: options.description,
          template,
          variables: JSON.stringify(options.variables || {}),
          targetModel: options.targetModel,
          category: options.category,
          isPublic: options.isPublic || false,
          quality: 0.7, // Default quality, will be updated based on usage
        },
      });

      return contextTemplate.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Get user's context templates
   */
  async getUserTemplates(): Promise<ContextTemplate[]> {
    try {
      const templates = await prisma.contextTemplate.findMany({
        where: {
          OR: [
            { userId: this.userId },
            { isPublic: true },
          ],
        },
        orderBy: { quality: 'desc' },
      });

      return templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || undefined,
        template: t.template,
        variables: JSON.parse(t.variables),
        category: t.category || undefined,
        targetModel: t.targetModel || undefined,
        quality: t.quality || undefined,
      }));
    } catch (error) {
      console.error('Error getting user templates:', error);
      return [];
    }
  }

  /**
   * Get assembly analytics
   */
  async getAssemblyAnalytics(days: number = 30): Promise<{
    totalGenerations: number;
    avgQuality: number;
    avgConfidence: number;
    avgTokens: number;
    avgCost: number;
    strategyBreakdown: Record<string, number>;
    topTemplates: Array<{ name: string; usage: number }>;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const generations = await prisma.contextGeneration.findMany({
        where: {
          userId: this.userId,
          createdAt: { gte: cutoffDate },
        },
        include: {
          template: { select: { name: true } },
        },
      });

      const strategyBreakdown: Record<string, number> = {};
      const templateUsage: Record<string, number> = {};
      
      let totalQuality = 0;
      let totalConfidence = 0;
      let totalTokens = 0;
      let totalCost = 0;

      for (const gen of generations) {
        strategyBreakdown[gen.assemblyStrategy] = (strategyBreakdown[gen.assemblyStrategy] || 0) + 1;
        
        if (gen.template) {
          templateUsage[gen.template.name] = (templateUsage[gen.template.name] || 0) + 1;
        }

        totalQuality += gen.quality || 0;
        totalConfidence += gen.confidence || 0;
        totalTokens += gen.tokenCount || 0;
        totalCost += gen.cost || 0;
      }

      const count = generations.length;
      const topTemplates = Object.entries(templateUsage)
        .map(([name, usage]) => ({ name, usage }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      return {
        totalGenerations: count,
        avgQuality: count > 0 ? totalQuality / count : 0,
        avgConfidence: count > 0 ? totalConfidence / count : 0,
        avgTokens: count > 0 ? totalTokens / count : 0,
        avgCost: count > 0 ? totalCost / count : 0,
        strategyBreakdown,
        topTemplates,
      };
    } catch (error) {
      console.error('Error getting assembly analytics:', error);
      throw error;
    }
  }
}

export default ContextAssemblyEngine;