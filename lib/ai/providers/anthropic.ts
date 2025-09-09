import Anthropic from '@anthropic-ai/sdk'
import { AIProvider, OptimizationType, OptimizationResult, OptimizationOptions, CategorizationOptions, EmbeddingOptions, ProviderConfig, ProviderError } from './types'

export class AnthropicProvider implements AIProvider {
  public readonly name = 'anthropic'
  public readonly models = ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
  
  private client: Anthropic
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      maxRetries: config.retries || 3
    })
  }

  async optimize(content: string, type: OptimizationType, options: OptimizationOptions = {}): Promise<OptimizationResult> {
    const startTime = Date.now()
    
    try {
      const prompt = this.buildOptimizationPrompt(content, type, options)
      const model = options.model || 'claude-sonnet-4-20250514'
      
      const response = await this.client.messages.create({
        model,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        messages: [{ role: 'user', content: prompt }]
      })

      const optimizedContent = response.content[0]?.text
      if (!optimizedContent) {
        throw new ProviderError('No content returned from Anthropic', this.name)
      }

      const processingTime = Date.now() - startTime
      const tokenUsage = response.usage ? {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens
      } : undefined

      return {
        id: `anthropic-${Date.now()}`,
        itemId: '', // Will be set by caller
        optimizationType: type,
        originalVersion: content,
        optimizedVersion: optimizedContent,
        confidence: this.calculateConfidence(type, response),
        aiProvider: this.name,
        aiModel: model,
        processingTime,
        tokenUsage,
        costEstimate: this.calculateCost(model, tokenUsage),
        status: 'optimized'
      }
    } catch (error) {
      throw new ProviderError(
        `Anthropic optimization failed: ${error.message}`,
        this.name,
        error.error?.type,
        error.status
      )
    }
  }

  async categorize(content: string, options: CategorizationOptions = {}): Promise<string[]> {
    try {
      const prompt = this.buildCategorizationPrompt(content, options)
      
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })

      const result = response.content[0]?.text
      if (!result) {
        throw new ProviderError('No categorization result from Anthropic', this.name)
      }

      return this.parseCategories(result, options.maxSuggestions || 5)
    } catch (error) {
      throw new ProviderError(
        `Anthropic categorization failed: ${error.message}`,
        this.name,
        error.error?.type,
        error.status
      )
    }
  }

  async embed(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    // Anthropic doesn't provide embedding models, so we fall back to a simple hash-based approach
    // In a real implementation, you might use a different embedding service or return an error
    throw new ProviderError('Anthropic does not provide embedding models', this.name)
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check - try to create a minimal message
      await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      })
      return true
    } catch {
      return false
    }
  }

  private buildOptimizationPrompt(content: string, type: OptimizationType, options: OptimizationOptions): string {
    const prompts = {
      content: `Please optimize the following content for clarity, conciseness, and effectiveness while preserving its core meaning and intent:\n\n${content}`,
      structure: `Please improve the structure and organization of the following content:\n\n${content}`,
      metadata: `Please generate optimized metadata (title, description, keywords) for the following content:\n\n${content}`,
      categorization: `Please suggest appropriate categories for the following content:\n\n${content}`
    }
    
    return prompts[type]
  }

  private buildCategorizationPrompt(content: string, options: CategorizationOptions): string {
    let prompt = `Please analyze the following content and suggest ${options.maxSuggestions || 5} appropriate categories:\n\n${content}\n\n`
    
    if (options.existingCategories?.length) {
      prompt += `Consider these existing categories: ${options.existingCategories.join(', ')}\n\n`
    }
    
    prompt += 'Return only a JSON array of category names.'
    return prompt
  }

  private parseCategories(result: string, maxSuggestions: number): string[] {
    try {
      const categories = JSON.parse(result)
      return Array.isArray(categories) ? categories.slice(0, maxSuggestions) : []
    } catch {
      // Fallback to simple parsing
      return result
        .split(',')
        .map(cat => cat.trim().replace(/['"]/g, ''))
        .slice(0, maxSuggestions)
    }
  }

  private calculateConfidence(type: OptimizationType, response: any): number {
    // Simple confidence calculation based on response completeness
    const stopReason = response.stop_reason
    if (stopReason === 'end_turn') return 0.9
    if (stopReason === 'max_tokens') return 0.7
    return 0.5
  }

  private calculateCost(model: string, tokenUsage?: { input: number; output: number }): number {
    if (!tokenUsage) return 0
    
    const pricing = {
      'claude-sonnet-4-20250514': { input: 15 / 1000000, output: 75 / 1000000 },
      'claude-3-5-sonnet-20241022': { input: 3 / 1000000, output: 15 / 1000000 },
      'claude-3-5-haiku-20241022': { input: 1 / 1000000, output: 5 / 1000000 }
    }
    
    const rates = pricing[model] || pricing['claude-3-5-haiku-20241022']
    return (tokenUsage.input * rates.input) + (tokenUsage.output * rates.output)
  }
}