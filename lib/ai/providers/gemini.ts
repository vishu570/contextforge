import { GoogleGenerativeAI } from "@google/generative-ai"
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

export class GeminiProvider implements AIProvider {
  public readonly name = "gemini"
  public readonly models = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "text-embedding-004",
  ]

  private client: GoogleGenerativeAI
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
    this.client = new GoogleGenerativeAI(config.apiKey)
  }

  async optimize(
    content: string,
    type: OptimizationType,
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const startTime = Date.now()

    try {
      const prompt = this.buildOptimizationPrompt(content, type, options)
      const model = options.model || "gemini-2.0-flash-exp"

      const genModel = this.client.getGenerativeModel({
        model,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000,
        },
      })

      const result = await genModel.generateContent(prompt)
      const optimizedContent = result.response.text()

      if (!optimizedContent) {
        throw new ProviderError("No content returned from Gemini", this.name)
      }

      const processingTime = Date.now() - startTime
      const tokenUsage = result.response.usageMetadata
        ? {
            input: result.response.usageMetadata.promptTokenCount || 0,
            output: result.response.usageMetadata.candidatesTokenCount || 0,
          }
        : undefined

      return {
        id: `gemini-${Date.now()}`,
        itemId: "", // Will be set by caller
        optimizationType: type,
        originalVersion: content,
        optimizedVersion: optimizedContent,
        confidence: this.calculateConfidence(type, result),
        aiProvider: this.name,
        aiModel: model,
        processingTime,
        tokenUsage,
        costEstimate: this.calculateCost(model, tokenUsage),
        status: "optimized",
      }
    } catch (error) {
      throw new ProviderError(
        `Gemini optimization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        this.name,
        (error as any).code,
        (error as any).status
      )
    }
  }

  async categorize(
    content: string,
    options: CategorizationOptions = {}
  ): Promise<string[]> {
    try {
      const prompt = this.buildCategorizationPrompt(content, options)

      const genModel = this.client.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200,
        },
      })

      const result = await genModel.generateContent(prompt)
      const response = result.response.text()

      if (!response) {
        throw new ProviderError(
          "No categorization result from Gemini",
          this.name
        )
      }

      return this.parseCategories(response, options.maxSuggestions || 5)
    } catch (error) {
      throw new ProviderError(
        `Gemini categorization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        this.name,
        (error as any).code,
        (error as any).status
      )
    }
  }

  async embed(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    try {
      const model = options.model || "text-embedding-004"
      const genModel = this.client.getGenerativeModel({ model })

      const result = await genModel.embedContent(text)

      if (!result.embedding?.values) {
        throw new ProviderError("No embedding returned from Gemini", this.name)
      }

      return result.embedding.values
    } catch (error) {
      throw new ProviderError(
        `Gemini embedding failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        this.name,
        (error as any).code,
        (error as any).status
      )
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const genModel = this.client.getGenerativeModel({
        model: "gemini-1.5-flash",
      })
      await genModel.generateContent("Hello")
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

  private calculateConfidence(type: OptimizationType, result: any): number {
    // Simple confidence calculation based on safety ratings and completeness
    const candidate = result.response.candidates?.[0]
    if (candidate?.finishReason === "STOP") return 0.9
    if (candidate?.finishReason === "MAX_TOKENS") return 0.7
    return 0.5
  }

  private calculateCost(
    model: string,
    tokenUsage?: { input: number; output: number }
  ): number {
    if (!tokenUsage) return 0

    const pricing = {
      "gemini-2.0-flash-exp": { input: 0, output: 0 }, // Currently free in preview
      "gemini-1.5-pro": { input: 1.25 / 1000000, output: 5 / 1000000 },
      "gemini-1.5-flash": { input: 0.075 / 1000000, output: 0.3 / 1000000 },
    }

    const rates =
      pricing[model as keyof typeof pricing] || pricing["gemini-2.0-flash-exp"]
    return tokenUsage.input * rates.input + tokenUsage.output * rates.output
  }
}
