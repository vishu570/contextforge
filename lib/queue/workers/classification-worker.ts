import { BaseWorker } from './base-worker';
import { JobType, JobResult, JobProgress } from '../types';
import { z } from 'zod';
import { prisma } from '../../db';
import { LLMService } from '../../llm';

const ClassificationJobDataSchema = z.object({
  userId: z.string(),
  itemId: z.string().optional(),
  content: z.string(),
  format: z.string(),
  targetModels: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

type ClassificationJobData = z.infer<typeof ClassificationJobDataSchema>;

export class ClassificationWorker extends BaseWorker<ClassificationJobData> {
  private llmService: LLMService;

  constructor() {
    super(JobType.CLASSIFICATION, 3); // Allow 3 concurrent classification jobs
    this.llmService = new LLMService();
  }

  async process(
    data: ClassificationJobData,
    progress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    // Validate input
    const validatedData = ClassificationJobDataSchema.parse(data);

    await progress({
      percentage: 10,
      message: 'Starting classification analysis...',
    });

    try {
      // Extract content characteristics
      const characteristics = await this.extractCharacteristics(validatedData.content, validatedData.format);
      
      await progress({
        percentage: 30,
        message: 'Analyzing content structure...',
      });

      // Classify content type and subtype
      const classification = await this.classifyContent(validatedData.content, characteristics);
      
      await progress({
        percentage: 60,
        message: 'Determining optimal models...',
      });

      // Determine target models if not specified
      const targetModels = validatedData.targetModels || await this.determineTargetModels(classification, characteristics);
      
      await progress({
        percentage: 80,
        message: 'Generating metadata...',
      });

      // Generate additional metadata
      const enhancedMetadata = await this.generateMetadata(validatedData.content, classification, characteristics);
      
      await progress({
        percentage: 90,
        message: 'Saving results...',
      });

      // Update item if itemId is provided
      if (validatedData.itemId) {
        await this.updateItemClassification(validatedData.itemId, classification, targetModels, enhancedMetadata);
      }

      await progress({
        percentage: 100,
        message: 'Classification completed successfully',
      });

      return {
        success: true,
        data: {
          classification,
          targetModels,
          characteristics,
          metadata: enhancedMetadata,
        },
      };
    } catch (error) {
      throw new Error(`Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractCharacteristics(content: string, format: string): Promise<any> {
    const characteristics = {
      length: content.length,
      wordCount: content.split(/\s+/).length,
      format,
      hasVariables: /\{\{.*?\}\}|\$\{.*?\}|\{.*?\}/.test(content),
      hasInstructions: /\b(you are|act as|your task|instructions?|follow|do not|must|should)\b/i.test(content),
      hasExamples: /\b(example|for instance|such as|e\.g\.|like)\b/i.test(content),
      hasConditionals: /\b(if|when|unless|otherwise|depending|based on)\b/i.test(content),
      hasPersonality: /\b(tone|style|personality|character|voice)\b/i.test(content),
      hasConstraints: /\b(limit|maximum|minimum|no more than|at least|exactly)\b/i.test(content),
    };

    return characteristics;
  }

  private async classifyContent(content: string, characteristics: any): Promise<any> {
    // Use LLM to classify the content
    const prompt = `Analyze the following content and classify it. Return a JSON object with 'type' and 'subType' fields.

Content characteristics:
- Length: ${characteristics.length} characters
- Has variables: ${characteristics.hasVariables}
- Has instructions: ${characteristics.hasInstructions}
- Has examples: ${characteristics.hasExamples}
- Has conditionals: ${characteristics.hasConditionals}
- Has personality traits: ${characteristics.hasPersonality}
- Has constraints: ${characteristics.hasConstraints}

Content to classify:
${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}

Possible types: prompt, agent, rule, template, snippet, documentation
Possible subTypes: system, user, assistant, instruction, example, validation, workflow, api, ui, data`;

    try {
      const response = await this.llmService.generateResponse(prompt, { 
        model: 'gpt-4o-mini',
        userId: validatedData.userId 
      });
      const classification = JSON.parse(response);
      
      return {
        type: classification.type || 'prompt',
        subType: classification.subType || null,
        confidence: classification.confidence || 0.8,
      };
    } catch (error) {
      // Fallback classification based on heuristics
      return this.heuristicClassification(content, characteristics);
    }
  }

  private heuristicClassification(content: string, characteristics: any): any {
    let type = 'prompt';
    let subType = null;
    let confidence = 0.6;

    // Rule-based classification
    if (characteristics.hasInstructions && characteristics.hasPersonality) {
      type = 'agent';
      confidence = 0.8;
    } else if (characteristics.hasConstraints && content.includes('rule')) {
      type = 'rule';
      confidence = 0.7;
    } else if (characteristics.hasVariables && content.includes('template')) {
      type = 'template';
      confidence = 0.7;
    } else if (characteristics.length < 200 && !characteristics.hasInstructions) {
      type = 'snippet';
      confidence = 0.6;
    }

    // Determine subtype
    if (content.toLowerCase().includes('system')) subType = 'system';
    else if (content.toLowerCase().includes('user')) subType = 'user';
    else if (content.toLowerCase().includes('assistant')) subType = 'assistant';

    return { type, subType, confidence };
  }

  private async determineTargetModels(classification: any, characteristics: any): Promise<string[]> {
    const models = ['openai', 'anthropic', 'gemini'];
    
    // Logic to determine best models based on content type and characteristics
    if (classification.type === 'agent' || characteristics.hasPersonality) {
      return ['anthropic', 'openai']; // Claude and GPT are good for character-based tasks
    } else if (characteristics.hasVariables || classification.type === 'template') {
      return ['openai', 'gemini']; // Good for structured content
    } else if (characteristics.length > 2000) {
      return ['anthropic']; // Claude handles long content well
    }
    
    return models; // Default to all models
  }

  private async generateMetadata(content: string, classification: any, characteristics: any): Promise<any> {
    return {
      classification,
      characteristics,
      suggestedTags: await this.suggestTags(content, classification),
      qualityScore: this.calculateQualityScore(characteristics),
      complexity: this.calculateComplexity(characteristics),
      generatedAt: new Date().toISOString(),
    };
  }

  private async suggestTags(content: string, classification: any): Promise<string[]> {
    const tags: string[] = [];
    
    // Add type-based tags
    tags.push(classification.type);
    if (classification.subType) tags.push(classification.subType);
    
    // Add content-based tags
    if (content.toLowerCase().includes('api')) tags.push('api');
    if (content.toLowerCase().includes('data')) tags.push('data');
    if (content.toLowerCase().includes('web')) tags.push('web');
    if (content.toLowerCase().includes('mobile')) tags.push('mobile');
    if (content.toLowerCase().includes('backend')) tags.push('backend');
    if (content.toLowerCase().includes('frontend')) tags.push('frontend');
    
    return tags.slice(0, 5); // Limit to 5 tags
  }

  private calculateQualityScore(characteristics: any): number {
    let score = 0.5; // Base score
    
    if (characteristics.hasInstructions) score += 0.2;
    if (characteristics.hasExamples) score += 0.15;
    if (characteristics.hasConstraints) score += 0.1;
    if (characteristics.hasVariables) score += 0.1;
    if (characteristics.wordCount > 50 && characteristics.wordCount < 500) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private calculateComplexity(characteristics: any): 'low' | 'medium' | 'high' {
    let complexityScore = 0;
    
    if (characteristics.hasVariables) complexityScore += 1;
    if (characteristics.hasConditionals) complexityScore += 1;
    if (characteristics.hasConstraints) complexityScore += 1;
    if (characteristics.hasPersonality) complexityScore += 1;
    if (characteristics.wordCount > 300) complexityScore += 1;
    
    if (complexityScore <= 1) return 'low';
    if (complexityScore <= 3) return 'medium';
    return 'high';
  }

  private async updateItemClassification(
    itemId: string,
    classification: any,
    targetModels: string[],
    metadata: any
  ): Promise<void> {
    await prisma.item.update({
      where: { id: itemId },
      data: {
        type: classification.type,
        subType: classification.subType,
        targetModels: targetModels.join(','),
        metadata: JSON.stringify(metadata),
      },
    });
  }
}