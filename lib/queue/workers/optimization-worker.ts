import { BaseWorker } from './base-worker';
import { JobType, JobResult, JobProgress } from '../types';
import { z } from 'zod';
import { prisma } from '../../db';
import { LLMService } from '../../llm';

const OptimizationJobDataSchema = z.object({
  userId: z.string(),
  itemId: z.string().optional(),
  content: z.string(),
  targetModel: z.string(),
  currentFormat: z.string(),
  metadata: z.record(z.any()).optional(),
});

type OptimizationJobData = z.infer<typeof OptimizationJobDataSchema>;

export class OptimizationWorker extends BaseWorker<OptimizationJobData> {
  private llmService: LLMService;

  constructor() {
    super(JobType.OPTIMIZATION, 2); // Allow 2 concurrent optimization jobs
    this.llmService = new LLMService();
  }

  async process(
    data: OptimizationJobData,
    progress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    const validatedData = OptimizationJobDataSchema.parse(data);

    await progress({
      percentage: 10,
      message: 'Analyzing content for optimization...',
    });

    try {
      // Analyze current content
      const analysis = await this.analyzeContent(validatedData.content, validatedData.targetModel);
      
      await progress({
        percentage: 30,
        message: 'Identifying optimization opportunities...',
      });

      // Identify optimization opportunities
      const opportunities = await this.identifyOptimizations(analysis, validatedData.targetModel);
      
      await progress({
        percentage: 50,
        message: 'Generating optimized content...',
      });

      // Generate optimized content
      const optimizedContent = await this.optimizeContent(
        validatedData.content,
        opportunities,
        validatedData.targetModel
      );
      
      await progress({
        percentage: 70,
        message: 'Calculating improvement metrics...',
      });

      // Calculate improvement metrics
      const metrics = await this.calculateMetrics(validatedData.content, optimizedContent);
      
      await progress({
        percentage: 90,
        message: 'Saving optimization...',
      });

      // Save optimization if itemId provided
      if (validatedData.itemId) {
        await this.saveOptimization(
          validatedData.itemId,
          validatedData.targetModel,
          optimizedContent,
          metrics,
          opportunities
        );
      }

      await progress({
        percentage: 100,
        message: 'Optimization completed successfully',
      });

      return {
        success: true,
        data: {
          originalContent: validatedData.content,
          optimizedContent,
          improvements: opportunities,
          metrics,
          targetModel: validatedData.targetModel,
        },
      };
    } catch (error) {
      throw new Error(`Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeContent(content: string, targetModel: string): Promise<any> {
    const analysis = {
      length: content.length,
      wordCount: content.split(/\s+/).length,
      sentenceCount: content.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
      paragraphCount: content.split(/\n\s*\n/).length,
      hasStructure: this.hasStructure(content),
      clarity: await this.assessClarity(content),
      specificity: this.assessSpecificity(content),
      modelCompatibility: this.assessModelCompatibility(content, targetModel),
    };

    return analysis;
  }

  private hasStructure(content: string): boolean {
    const structureIndicators = [
      /^\d+\./m, // Numbered lists
      /^[-*+]/m, // Bullet points
      /^#{1,6}/m, // Headers
      /^[A-Z][A-Z\s]+:/m, // Section headers
    ];

    return structureIndicators.some(pattern => pattern.test(content));
  }

  private async assessClarity(content: string): Promise<number> {
    // Simple clarity assessment based on readability metrics
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    
    // Penalize overly long sentences
    let clarityScore = 1.0;
    if (avgSentenceLength > 25) clarityScore -= 0.2;
    if (avgSentenceLength > 35) clarityScore -= 0.3;
    
    // Check for clear instructions
    const hasInstructions = /\b(please|should|must|will|need to|required|ensure)\b/i.test(content);
    if (hasInstructions) clarityScore += 0.1;
    
    return Math.max(0, Math.min(1, clarityScore));
  }

  private assessSpecificity(content: string): number {
    let specificityScore = 0.5; // Base score
    
    // Look for specific terms
    const specificIndicators = [
      /\b\d+(\.\d+)?\s*(percent|%|degrees?|minutes?|seconds?|items?|examples?)\b/i,
      /\b(exactly|precisely|specifically|in particular|for example)\b/i,
      /\b(step \d+|first|second|third|finally|lastly)\b/i,
    ];
    
    specificIndicators.forEach(pattern => {
      if (pattern.test(content)) specificityScore += 0.1;
    });
    
    return Math.min(1, specificityScore);
  }

  private assessModelCompatibility(content: string, targetModel: string): number {
    let compatibilityScore = 0.8; // Base score
    
    // Model-specific optimizations
    switch (targetModel.toLowerCase()) {
      case 'openai':
      case 'gpt':
        // GPT prefers clear system/user/assistant structure
        if (content.includes('system:') || content.includes('user:')) compatibilityScore += 0.1;
        break;
      
      case 'anthropic':
      case 'claude':
        // Claude works well with conversational, detailed prompts
        if (content.length > 200 && this.hasStructure(content)) compatibilityScore += 0.1;
        break;
      
      case 'gemini':
        // Gemini prefers structured, step-by-step instructions
        if (/step \d+/i.test(content) || this.hasStructure(content)) compatibilityScore += 0.1;
        break;
    }
    
    return Math.min(1, compatibilityScore);
  }

  private async identifyOptimizations(analysis: any, targetModel: string): Promise<string[]> {
    const opportunities: string[] = [];
    
    // Structure improvements
    if (!analysis.hasStructure && analysis.wordCount > 50) {
      opportunities.push('Add structure with headers or bullet points');
    }
    
    // Clarity improvements
    if (analysis.clarity < 0.7) {
      opportunities.push('Improve clarity by breaking down complex sentences');
    }
    
    // Specificity improvements
    if (analysis.specificity < 0.6) {
      opportunities.push('Add more specific instructions and examples');
    }
    
    // Model-specific optimizations
    switch (targetModel.toLowerCase()) {
      case 'openai':
      case 'gpt':
        if (!analysis.content?.includes('system:')) {
          opportunities.push('Add system message for better context');
        }
        break;
      
      case 'anthropic':
      case 'claude':
        if (analysis.length < 100) {
          opportunities.push('Expand content with more context for Claude');
        }
        break;
      
      case 'gemini':
        if (!analysis.hasStructure) {
          opportunities.push('Add step-by-step structure for Gemini');
        }
        break;
    }
    
    return opportunities;
  }

  private async optimizeContent(
    originalContent: string,
    opportunities: string[],
    targetModel: string
  ): Promise<string> {
    const optimizationPrompt = `Optimize the following content for ${targetModel}. 

Current issues to address:
${opportunities.map(opp => `- ${opp}`).join('\n')}

Original content:
${originalContent}

Please provide an optimized version that addresses these issues while maintaining the original intent and functionality. Focus on:
1. Clarity and readability
2. Model-specific best practices
3. Structured format where appropriate
4. Specific instructions and examples

Return only the optimized content without explanations.`;

    try {
      const optimizedContent = await this.llmService.generateResponse(optimizationPrompt, {
        model: 'gpt-4o',
        userId: validatedData.userId,
      });
      
      return optimizedContent.trim();
    } catch (error) {
      // Fallback: apply rule-based optimizations
      return this.applyRuleBasedOptimizations(originalContent, opportunities, targetModel);
    }
  }

  private applyRuleBasedOptimizations(
    content: string,
    opportunities: string[],
    targetModel: string
  ): string {
    let optimized = content;
    
    // Add structure if needed
    if (opportunities.some(opp => opp.includes('structure'))) {
      const sentences = optimized.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 3) {
        optimized = sentences.map((s, i) => `${i + 1}. ${s.trim()}.`).join('\n');
      }
    }
    
    // Add system message for OpenAI
    if (targetModel.toLowerCase().includes('openai') && !content.includes('system:')) {
      optimized = `System: You are a helpful AI assistant. Follow the instructions below carefully.\n\nUser: ${optimized}`;
    }
    
    return optimized;
  }

  private async calculateMetrics(original: string, optimized: string): Promise<any> {
    const originalAnalysis = await this.analyzeContent(original, '');
    const optimizedAnalysis = await this.analyzeContent(optimized, '');
    
    return {
      lengthChange: optimized.length - original.length,
      wordCountChange: optimizedAnalysis.wordCount - originalAnalysis.wordCount,
      clarityImprovement: optimizedAnalysis.clarity - originalAnalysis.clarity,
      specificityImprovement: optimizedAnalysis.specificity - originalAnalysis.specificity,
      structureAdded: optimizedAnalysis.hasStructure && !originalAnalysis.hasStructure,
      improvementScore: this.calculateImprovementScore(originalAnalysis, optimizedAnalysis),
    };
  }

  private calculateImprovementScore(original: any, optimized: any): number {
    let score = 0;
    
    if (optimized.clarity > original.clarity) score += 0.3;
    if (optimized.specificity > original.specificity) score += 0.3;
    if (optimized.hasStructure && !original.hasStructure) score += 0.2;
    if (optimized.modelCompatibility > original.modelCompatibility) score += 0.2;
    
    return Math.min(1, score);
  }

  private async saveOptimization(
    itemId: string,
    targetModel: string,
    optimizedContent: string,
    metrics: any,
    opportunities: string[]
  ): Promise<void> {
    await prisma.optimization.create({
      data: {
        itemId,
        targetModel,
        optimizedContent,
        confidence: metrics.improvementScore,
        status: 'suggested',
        metadata: JSON.stringify({
          metrics,
          opportunities,
          generatedAt: new Date().toISOString(),
        }),
        createdBy: 'optimization-worker',
      },
    });
  }
}