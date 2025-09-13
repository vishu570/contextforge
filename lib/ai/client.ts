// AI Client Library - Multi-provider optimization interface
export * from "./providers"

import { prisma } from "../db"
import { decryptApiKey } from "../utils"
import {
  AIProvider,
  createProvider,
  OptimizationResult,
  OptimizationType,
  ProviderError,
  ProviderName,
} from "./providers"

export class AIClient {
  private providers: Map<string, AIProvider> = new Map()
  private retryAttempts = 3
  private retryDelay = 1000

  async initializeFromUser(userId: string): Promise<void> {
    const apiKeys = await prisma.apiKey.findMany({
      where: { 
        userId,
        // Only initialize AI providers, not source providers like GitHub
        provider: { in: ['openai', 'anthropic', 'gemini'] }
      },
      select: { provider: true, encryptedKey: true },
    })

    for (const apiKey of apiKeys) {
      try {
        const decryptedKey = decryptApiKey(apiKey.encryptedKey)
        const provider = createProvider(apiKey.provider as ProviderName, {
          apiKey: decryptedKey,
          timeout: 30000,
          retries: this.retryAttempts,
        })

        // Test provider health before adding
        if (await provider.isHealthy()) {
          this.providers.set(apiKey.provider, provider)
        }
      } catch (error) {
        console.warn(
          `Failed to initialize ${apiKey.provider} provider:`,
          error instanceof Error ? error.message : "Unknown error"
        )
      }
    }
  }

  async optimize(
    itemId: string,
    content: string,
    type: OptimizationType,
    preferredProvider?: string
  ): Promise<OptimizationResult> {
    const provider = this.selectProvider(preferredProvider)

    const result = await this.executeWithRetry(async () => {
      const optimization = await provider.optimize(content, type)
      optimization.itemId = itemId
      return optimization
    })

    // Store result in database
    await this.storeOptimizationResult(result)
    return result
  }

  async categorize(
    content: string,
    options?: { maxSuggestions?: number; existingCategories?: string[] },
    preferredProvider?: string
  ): Promise<string[]> {
    const provider = this.selectProvider(preferredProvider)

    return this.executeWithRetry(async () => {
      return provider.categorize(content, options)
    })
  }

  async embed(text: string, preferredProvider?: string): Promise<number[]> {
    const provider = this.selectProvider(preferredProvider)

    return this.executeWithRetry(async () => {
      return provider.embed(text)
    })
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  isProviderAvailable(providerName: string): boolean {
    return this.providers.has(providerName)
  }

  private selectProvider(preferredProvider?: string): AIProvider {
    // Use preferred provider if available
    if (preferredProvider && this.providers.has(preferredProvider)) {
      return this.providers.get(preferredProvider)!
    }

    // Fallback to first available provider
    const availableProviders = Array.from(this.providers.values())
    if (availableProviders.length === 0) {
      throw new ProviderError("No AI providers available", "client")
    }

    // Prefer OpenAI, then Anthropic, then Gemini
    const providerPriority = ["openai", "anthropic", "gemini"]
    for (const name of providerPriority) {
      if (this.providers.has(name)) {
        return this.providers.get(name)!
      }
    }

    return availableProviders[0]
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= this.retryAttempts) {
        throw error
      }

      // Exponential backoff
      const delay = this.retryDelay * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))

      return this.executeWithRetry(operation, attempt + 1)
    }
  }

  private async storeOptimizationResult(
    result: OptimizationResult
  ): Promise<void> {
    try {
      await prisma.optimizationResult.create({
        data: {
          id: result.id,
          userId: "", // Will be set by API handler
          itemId: result.itemId,
          optimizationType: result.optimizationType,
          originalVersion: result.originalVersion,
          optimizedVersion: result.optimizedVersion,
          confidence: result.confidence,
          aiProvider: result.aiProvider,
          aiModel: result.aiModel,
          processingTime: result.processingTime,
          tokenUsage: JSON.stringify(result.tokenUsage || {}),
          costEstimate: result.costEstimate,
          status: result.status,
          errorMessage: result.errorMessage,
          metadata: JSON.stringify(result.metadata || {}),
        },
      })
    } catch (error) {
      console.warn(
        "Failed to store optimization result:",
        error instanceof Error ? error.message : "Unknown error"
      )
    }
  }
}

// Singleton instance for reuse
export const aiClient = new AIClient()
