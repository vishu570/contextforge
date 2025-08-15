import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { decryptApiKey } from '@/lib/auth';

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ClassificationResult {
  type: 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'other';
  confidence: number;
  reasoning?: string;
}

export interface OptimizationResult {
  optimizedContent: string;
  suggestions: string[];
  confidence: number;
}

export interface ConversionResult {
  convertedContent: string;
  format: string;
  metadata?: Record<string, any>;
}

export class LLMService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private genAI?: GoogleGenerativeAI;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async initializeProviders() {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: this.userId },
    });

    for (const apiKey of apiKeys) {
      const decryptedKey = decryptApiKey(apiKey.encryptedKey);
      
      switch (apiKey.provider) {
        case 'openai':
          this.openai = new OpenAI({ apiKey: decryptedKey });
          break;
        case 'anthropic':
          this.anthropic = new Anthropic({ apiKey: decryptedKey });
          break;
        case 'gemini':
          this.genAI = new GoogleGenerativeAI(decryptedKey);
          break;
      }
    }
  }

  async classifyContent(content: string, config?: LLMConfig): Promise<ClassificationResult> {
    await this.initializeProviders();
    
    const prompt = `Analyze the following content and classify it into one of these categories:
- prompt: Instructions or prompts for AI models
- agent: Agent definitions or configurations
- rule: Rules, linting configs, or IDE settings
- template: Code templates or boilerplate
- snippet: Code snippets or examples
- other: Anything else

Content to classify:
${content}

Respond with a JSON object containing:
- type: the classification category
- confidence: a number between 0 and 1 indicating confidence
- reasoning: brief explanation of the classification`;

    const provider = config?.provider || this.getAvailableProvider();
    
    try {
      let result: string;
      
      switch (provider) {
        case 'openai':
          if (!this.openai) throw new Error('OpenAI not configured');
          const openaiResponse = await this.openai.chat.completions.create({
            model: config?.model || 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            temperature: config?.temperature || 0.3,
            max_tokens: config?.maxTokens || 500,
            response_format: { type: 'json_object' },
          });
          result = openaiResponse.choices[0].message.content || '{}';
          break;
          
        case 'anthropic':
          if (!this.anthropic) throw new Error('Anthropic not configured');
          const anthropicResponse = await this.anthropic.messages.create({
            model: config?.model || 'claude-3-opus-20240229',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: config?.maxTokens || 500,
            temperature: config?.temperature || 0.3,
          });
          result = anthropicResponse.content[0].type === 'text' 
            ? anthropicResponse.content[0].text 
            : '{}';
          break;
          
        case 'gemini':
          if (!this.genAI) throw new Error('Gemini not configured');
          const model = this.genAI.getGenerativeModel({ 
            model: config?.model || 'gemini-pro' 
          });
          const geminiResponse = await model.generateContent(prompt);
          result = geminiResponse.response.text();
          break;
          
        default:
          throw new Error('No LLM provider available');
      }
      
      // Parse the JSON response
      const parsed = JSON.parse(result);
      return {
        type: parsed.type || 'other',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('Classification error:', error);
      // Fallback to heuristic classification
      return this.heuristicClassification(content);
    }
  }

  async optimizeForModel(
    content: string, 
    targetModel: LLMProvider,
    config?: LLMConfig
  ): Promise<OptimizationResult> {
    await this.initializeProviders();
    
    const modelSpecificInstructions = {
      openai: 'Optimize for GPT-4/ChatGPT: focus on clear instructions, use system/user/assistant roles effectively',
      anthropic: 'Optimize for Claude: emphasize clarity, use XML tags for structure, be explicit about requirements',
      gemini: 'Optimize for Gemini: use clear formatting, provide examples, structure with markdown',
    };
    
    const prompt = `Optimize the following content for ${targetModel} models.
${modelSpecificInstructions[targetModel]}

Original content:
${content}

Provide:
1. The optimized version
2. A list of specific improvements made
3. Confidence score (0-1) for the optimization

Respond in JSON format with fields: optimizedContent, suggestions (array), confidence`;

    const provider = config?.provider || this.getAvailableProvider();
    
    try {
      let result: string;
      
      switch (provider) {
        case 'openai':
          if (!this.openai) throw new Error('OpenAI not configured');
          const openaiResponse = await this.openai.chat.completions.create({
            model: config?.model || 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            temperature: config?.temperature || 0.4,
            max_tokens: config?.maxTokens || 1500,
            response_format: { type: 'json_object' },
          });
          result = openaiResponse.choices[0].message.content || '{}';
          break;
          
        case 'anthropic':
          if (!this.anthropic) throw new Error('Anthropic not configured');
          const anthropicResponse = await this.anthropic.messages.create({
            model: config?.model || 'claude-3-opus-20240229',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: config?.maxTokens || 1500,
            temperature: config?.temperature || 0.4,
          });
          result = anthropicResponse.content[0].type === 'text' 
            ? anthropicResponse.content[0].text 
            : '{}';
          break;
          
        case 'gemini':
          if (!this.genAI) throw new Error('Gemini not configured');
          const model = this.genAI.getGenerativeModel({ 
            model: config?.model || 'gemini-pro' 
          });
          const geminiResponse = await model.generateContent(prompt);
          result = geminiResponse.response.text();
          break;
          
        default:
          throw new Error('No LLM provider available');
      }
      
      const parsed = JSON.parse(result);
      return {
        optimizedContent: parsed.optimizedContent || content,
        suggestions: parsed.suggestions || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error('Optimization error:', error);
      // Return original content if optimization fails
      return {
        optimizedContent: content,
        suggestions: ['Optimization failed - returning original content'],
        confidence: 0,
      };
    }
  }

  async convertFormat(
    content: string,
    fromFormat: string,
    toFormat: string,
    config?: LLMConfig
  ): Promise<ConversionResult> {
    await this.initializeProviders();
    
    const prompt = `Convert the following content from ${fromFormat} format to ${toFormat} format.
Maintain all semantic meaning and metadata.

Original content (${fromFormat}):
${content}

Provide the converted content in ${toFormat} format. If the target format supports metadata, include relevant metadata fields.

Respond in JSON format with fields: convertedContent, format, metadata (optional object)`;

    const provider = config?.provider || this.getAvailableProvider();
    
    try {
      let result: string;
      
      switch (provider) {
        case 'openai':
          if (!this.openai) throw new Error('OpenAI not configured');
          const openaiResponse = await this.openai.chat.completions.create({
            model: config?.model || 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            temperature: config?.temperature || 0.2,
            max_tokens: config?.maxTokens || 2000,
            response_format: { type: 'json_object' },
          });
          result = openaiResponse.choices[0].message.content || '{}';
          break;
          
        case 'anthropic':
          if (!this.anthropic) throw new Error('Anthropic not configured');
          const anthropicResponse = await this.anthropic.messages.create({
            model: config?.model || 'claude-3-opus-20240229',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: config?.maxTokens || 2000,
            temperature: config?.temperature || 0.2,
          });
          result = anthropicResponse.content[0].type === 'text' 
            ? anthropicResponse.content[0].text 
            : '{}';
          break;
          
        case 'gemini':
          if (!this.genAI) throw new Error('Gemini not configured');
          const model = this.genAI.getGenerativeModel({ 
            model: config?.model || 'gemini-pro' 
          });
          const geminiResponse = await model.generateContent(prompt);
          result = geminiResponse.response.text();
          break;
          
        default:
          throw new Error('No LLM provider available');
      }
      
      const parsed = JSON.parse(result);
      return {
        convertedContent: parsed.convertedContent || content,
        format: toFormat,
        metadata: parsed.metadata,
      };
    } catch (error) {
      console.error('Conversion error:', error);
      // Return original content if conversion fails
      return {
        convertedContent: content,
        format: fromFormat,
        metadata: { conversionError: true },
      };
    }
  }

  async detectDuplicates(items: Array<{ id: string; content: string }>): Promise<Array<{ id1: string; id2: string; similarity: number }>> {
    await this.initializeProviders();
    
    const duplicates: Array<{ id1: string; id2: string; similarity: number }> = [];
    
    // Use embeddings for similarity detection if available
    if (this.openai) {
      try {
        const embeddings = await Promise.all(
          items.map(async (item) => {
            const response = await this.openai!.embeddings.create({
              model: 'text-embedding-3-small',
              input: item.content,
            });
            return {
              id: item.id,
              embedding: response.data[0].embedding,
            };
          })
        );
        
        // Calculate cosine similarity between all pairs
        for (let i = 0; i < embeddings.length; i++) {
          for (let j = i + 1; j < embeddings.length; j++) {
            const similarity = this.cosineSimilarity(
              embeddings[i].embedding,
              embeddings[j].embedding
            );
            
            if (similarity > 0.85) { // Threshold for duplicate detection
              duplicates.push({
                id1: embeddings[i].id,
                id2: embeddings[j].id,
                similarity,
              });
            }
          }
        }
      } catch (error) {
        console.error('Embedding error:', error);
      }
    }
    
    return duplicates;
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private heuristicClassification(content: string): ClassificationResult {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('agent') || lowerContent.includes('assistant')) {
      return { type: 'agent', confidence: 0.6 };
    }
    if (lowerContent.includes('prompt') || lowerContent.includes('instruction')) {
      return { type: 'prompt', confidence: 0.6 };
    }
    if (lowerContent.includes('rule') || lowerContent.includes('eslint') || lowerContent.includes('config')) {
      return { type: 'rule', confidence: 0.6 };
    }
    if (lowerContent.includes('template') || lowerContent.includes('boilerplate')) {
      return { type: 'template', confidence: 0.6 };
    }
    if (lowerContent.includes('function') || lowerContent.includes('const') || lowerContent.includes('class')) {
      return { type: 'snippet', confidence: 0.5 };
    }
    
    return { type: 'other', confidence: 0.3 };
  }

  private getAvailableProvider(): LLMProvider {
    if (this.openai) return 'openai';
    if (this.anthropic) return 'anthropic';
    if (this.genAI) return 'gemini';
    throw new Error('No LLM provider configured');
  }
}