import OpenAI from "openai"
import {
  AIProvider,
  CategorizationOptions,
  EmbeddingOptions,
  OptimizationOptions,
  OptimizationResult,
  OptimizationType,
  ProviderConfig,
  ProviderError,
} from "./types"

export class OpenAIProvider implements AIProvider {
  public readonly name = "openai"
  public readonly models = [
    "gpt-5-2025-08-07",
    "gpt-4o",
    "gpt-4o-mini",
    "text-embedding-3-small",
    "text-embedding-3-large",
  ]

  private client: OpenAI
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      maxRetries: config.retries || 3,
    })
  }

  async optimize(
    content: string,
    type: OptimizationType,
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const startTime = Date.now()

    try {
      const prompt = this.buildOptimizationPrompt(content, type, options)
      const model = options.model || "gpt-5-2025-08-07"

      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
      })

      const optimizedContent = response.choices[0]?.message?.content
      if (!optimizedContent) {
        throw new ProviderError("No content returned from OpenAI", this.name)
      }

      const processingTime = Date.now() - startTime
      const tokenUsage = response.usage
        ? {
            input: response.usage.prompt_tokens,
            output: response.usage.completion_tokens,
          }
        : undefined

      return {
        id: `openai-${Date.now()}`,
        itemId: "", // Will be set by caller
        optimizationType: type,
        originalVersion: content,
        optimizedVersion: optimizedContent,
        confidence: this.calculateConfidence(type, response),
        aiProvider: this.name,
        aiModel: model,
        processingTime,
        tokenUsage,
        costEstimate: this.calculateCost(model, tokenUsage),
        status: "optimized",
      }
    } catch (error) {
      throw new ProviderError(
        `OpenAI optimization failed: ${error.message}`,
        this.name,
        error.code,
        error.status
      )
    }
  }

  async categorize(
    content: string,
    options: CategorizationOptions = {}
  ): Promise<string[]> {
    try {
      const prompt = this.buildCategorizationPrompt(content, options)

      const response = await this.client.chat.completions.create({
        model: "gpt-5-2025-08-07",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      })

      const result = response.choices[0]?.message?.content
      if (!result) {
        throw new ProviderError(
          "No categorization result from OpenAI",
          this.name
        )
      }

      return this.parseCategories(result, options.maxSuggestions || 5)
    } catch (error) {
      throw new ProviderError(
        `OpenAI categorization failed: ${error.message}`,
        this.name,
        error.code,
        error.status
      )
    }
  }

  async embed(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    try {
      const model = options.model || "text-embedding-3-small"

      const response = await this.client.embeddings.create({
        model,
        input: text,
        dimensions: options.dimensions,
      })

      return response.data[0].embedding
    } catch (error) {
      throw new ProviderError(
        `OpenAI embedding failed: ${error.message}`,
        this.name,
        error.code,
        error.status
      )
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.models.list()
      return true
    } catch {
      return false
    }
  }

  private buildOptimizationPrompt(
    content: string,
    type: OptimizationType,
    options: OptimizationOptions
  ): string {
    const prompts = {
      content: `Optimize the following content for clarity, conciseness, and effectiveness while preserving its core meaning and intent:\n\n${content}`,
      structure: `Improve the structure and organization of the following content:\n\n${content}`,
      metadata: `Generate optimized metadata (title, description, keywords) for the following content:\n\n${content}`,
      categorization: `Suggest appropriate categories for the following content:\n\n${content}`,
    }

    return prompts[type]
  }

  private buildCategorizationPrompt(
    content: string,
    options: CategorizationOptions
  ): string {
    let prompt = `Analyze the following content and suggest ${
      options.maxSuggestions || 5
    } appropriate categories:\n\n${content}\n\n`

    if (options.existingCategories?.length) {
      prompt += `Consider these existing categories: ${options.existingCategories.join(
        ", "
      )}\n\n`
    }

    prompt += "Return only a JSON array of category names."
    return prompt
  }

  private parseCategories(result: string, maxSuggestions: number): string[] {
    try {
      const categories = JSON.parse(result)
      return Array.isArray(categories)
        ? categories.slice(0, maxSuggestions)
        : []
    } catch {
      // Fallback to simple parsing
      return result
        .split(",")
        .map((cat) => cat.trim().replace(/['"]/g, ""))
        .slice(0, maxSuggestions)
    }
  }

  private calculateConfidence(type: OptimizationType, response: any): number {
    // Simple confidence calculation based on response quality
    const finishReason = response.choices[0]?.finish_reason
    if (finishReason === "stop") return 0.9
    if (finishReason === "length") return 0.7
    return 0.5
  }

  private calculateCost(
    model: string,
    tokenUsage?: { input: number; output: number }
  ): number {
    if (!tokenUsage) return 0

    const pricing = {
      "gpt-5-2025-08-07": { input: 0.1 / 1000, output: 0.3 / 1000 },
      "gpt-4o": { input: 0.0025 / 1000, output: 0.01 / 1000 },
      "gpt-4o-mini": { input: 0.00015 / 1000, output: 0.0006 / 1000 },
    }

    const rates = pricing[model] || pricing["gpt-4o-mini"]
    return tokenUsage.input * rates.input + tokenUsage.output * rates.output
  }
}
