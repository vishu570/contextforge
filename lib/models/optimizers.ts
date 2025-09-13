import { prisma } from "@/lib/db"
import { LLMProvider, LLMService } from "@/lib/llm"

export interface ModelConfig {
  provider: LLMProvider
  model: string
  maxTokens: number
  inputCostPer1k: number
  outputCostPer1k: number
  contextWindow: number
  specialTokens?: {
    system?: number
    user?: number
    assistant?: number
  }
  formatPreferences?: {
    useXmlTags?: boolean
    preferMarkdown?: boolean
    supportsJson?: boolean
    roleBasedPrompting?: boolean
  }
}

export interface TokenCount {
  total: number
  content: number
  metadata: number
  overhead: number
}

export interface OptimizationStrategy {
  name: string
  description: string
  tokenSavings: number
  qualityImpact: number // 0-1, 1 being no impact
  applicability: number // 0-1, 1 being always applicable
}

export interface OptimizationResult {
  originalContent: string
  optimizedContent: string
  originalTokens: TokenCount
  optimizedTokens: TokenCount
  tokenSavings: number
  costSavings: number
  qualityScore: number
  strategiesApplied: OptimizationStrategy[]
  targetModel: string
  metadata: Record<string, any>
}

// Model configurations for different providers
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "openai-gpt4": {
    provider: "openai",
    model: process.env.OPENAI_DEFAULT_MODEL || "gpt-5-mini-2025-08-07",
    maxTokens: 4096,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.0075,
    contextWindow: 128000,
    specialTokens: { system: 3, user: 3, assistant: 3 },
    formatPreferences: {
      useXmlTags: false,
      preferMarkdown: true,
      supportsJson: true,
      roleBasedPrompting: true,
    },
  },
  "openai-gpt4o": {
    provider: "openai",
    model: "gpt-4o",
    maxTokens: 4096,
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.015,
    contextWindow: 128000,
    specialTokens: { system: 3, user: 3, assistant: 3 },
    formatPreferences: {
      useXmlTags: false,
      preferMarkdown: true,
      supportsJson: true,
      roleBasedPrompting: true,
    },
  },
  "openai-gpt4o-mini": {
    provider: "openai",
    model: "gpt-4o-mini",
    maxTokens: 16384,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    contextWindow: 128000,
    specialTokens: { system: 3, user: 3, assistant: 3 },
    formatPreferences: {
      useXmlTags: false,
      preferMarkdown: true,
      supportsJson: true,
      roleBasedPrompting: true,
    },
  },
  "anthropic-claude3-opus": {
    provider: "anthropic",
    model: "claude-opus-4-20250514",
    maxTokens: 4096,
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
    contextWindow: 200000,
    formatPreferences: {
      useXmlTags: true,
      preferMarkdown: true,
      supportsJson: true,
      roleBasedPrompting: true,
    },
  },
  "anthropic-claude3-sonnet": {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 4096,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    contextWindow: 200000,
    formatPreferences: {
      useXmlTags: true,
      preferMarkdown: true,
      supportsJson: true,
      roleBasedPrompting: true,
    },
  },
  "anthropic-claude3-haiku": {
    provider: "anthropic",
    model: "claude-3-5-haiku-latest",
    maxTokens: 4096,
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
    contextWindow: 200000,
    formatPreferences: {
      useXmlTags: true,
      preferMarkdown: true,
      supportsJson: true,
      roleBasedPrompting: true,
    },
  },
  "gemini-pro": {
    provider: "gemini",
    model: "gemini-pro",
    maxTokens: 8192,
    inputCostPer1k: 0.0005,
    outputCostPer1k: 0.0015,
    contextWindow: 30720,
    formatPreferences: {
      useXmlTags: false,
      preferMarkdown: true,
      supportsJson: true,
      roleBasedPrompting: false,
    },
  },
  "gemini-pro-1.5": {
    provider: "gemini",
    model: "gemini-1.5-pro",
    maxTokens: 8192,
    inputCostPer1k: 0.0035,
    outputCostPer1k: 0.0105,
    contextWindow: 1048576,
    formatPreferences: {
      useXmlTags: false,
      preferMarkdown: true,
      supportsJson: true,
      roleBasedPrompting: false,
    },
  },
}

export class ModelOptimizer {
  private llmService: LLMService

  constructor(userId?: string) {
    this.llmService = new LLMService(userId)
  }

  /**
   * Optimize content for a specific model
   */
  async optimizeForModel(
    content: string,
    targetModelId: string,
    options: {
      maxTokenBudget?: number
      prioritizeQuality?: boolean
      aggressiveOptimization?: boolean
      preserveFormatting?: boolean
    } = {}
  ): Promise<OptimizationResult> {
    const modelConfig = MODEL_CONFIGS[targetModelId]
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${targetModelId}`)
    }

    const originalTokens = await this.countTokens(content, modelConfig)
    const maxBudget =
      options.maxTokenBudget || Math.floor(modelConfig.contextWindow * 0.8)

    let optimizedContent = content
    const strategiesApplied: OptimizationStrategy[] = []

    // Apply optimization strategies based on model and options
    if (originalTokens.total > maxBudget || options.aggressiveOptimization) {
      // Strategy 1: Remove redundant whitespace and formatting
      if (!options.preserveFormatting) {
        const whitespaceResult =
          this.removeRedundantWhitespace(optimizedContent)
        if (whitespaceResult.tokenSavings > 0) {
          optimizedContent = whitespaceResult.content
          strategiesApplied.push({
            name: "whitespace-removal",
            description: "Removed redundant whitespace and formatting",
            tokenSavings: whitespaceResult.tokenSavings,
            qualityImpact: 0.95,
            applicability: 1.0,
          })
        }
      }

      // Strategy 2: Compress repetitive patterns
      const compressionResult =
        this.compressRepetitivePatterns(optimizedContent)
      if (compressionResult.tokenSavings > 0) {
        optimizedContent = compressionResult.content
        strategiesApplied.push({
          name: "pattern-compression",
          description: "Compressed repetitive patterns and phrases",
          tokenSavings: compressionResult.tokenSavings,
          qualityImpact: 0.9,
          applicability: 0.7,
        })
      }

      // Strategy 3: Apply model-specific formatting
      const formatResult = await this.applyModelSpecificFormatting(
        optimizedContent,
        modelConfig
      )
      if (formatResult.tokenSavings > 0) {
        optimizedContent = formatResult.content
        strategiesApplied.push({
          name: "model-formatting",
          description: "Applied model-specific formatting optimizations",
          tokenSavings: formatResult.tokenSavings,
          qualityImpact: 1.0,
          applicability: 0.8,
        })
      }

      // Strategy 4: Intelligent content trimming (if still over budget)
      const currentTokens = await this.countTokens(
        optimizedContent,
        modelConfig
      )
      if (currentTokens.total > maxBudget) {
        const trimResult = await this.intelligentContentTrimming(
          optimizedContent,
          maxBudget,
          modelConfig
        )
        optimizedContent = trimResult.content
        strategiesApplied.push({
          name: "intelligent-trimming",
          description: "Intelligently trimmed less important content",
          tokenSavings: trimResult.tokenSavings,
          qualityImpact: 0.8,
          applicability: 0.9,
        })
      }
    }

    const optimizedTokens = await this.countTokens(
      optimizedContent,
      modelConfig
    )
    const tokenSavings = originalTokens.total - optimizedTokens.total
    const costSavings = this.calculateCostSavings(
      originalTokens,
      optimizedTokens,
      modelConfig
    )
    const qualityScore = this.calculateQualityScore(strategiesApplied)

    return {
      originalContent: content,
      optimizedContent,
      originalTokens,
      optimizedTokens,
      tokenSavings,
      costSavings,
      qualityScore,
      strategiesApplied,
      targetModel: targetModelId,
      metadata: {
        modelConfig: modelConfig,
        optimization: options,
      },
    }
  }

  /**
   * Count tokens for specific model
   */
  async countTokens(
    content: string,
    modelConfig: ModelConfig
  ): Promise<TokenCount> {
    // Simple estimation - in production, you'd use the actual tokenizer
    // For now, using approximation: ~4 characters per token for most models
    const baseTokens = Math.ceil(content.length / 4)

    // Add overhead for model-specific tokens
    let overhead = 0
    if (modelConfig.specialTokens) {
      overhead += modelConfig.specialTokens.system || 0
      overhead += modelConfig.specialTokens.user || 0
      overhead += modelConfig.specialTokens.assistant || 0
    }

    return {
      total: baseTokens + overhead,
      content: baseTokens,
      metadata: 0,
      overhead,
    }
  }

  /**
   * Remove redundant whitespace and formatting
   */
  private removeRedundantWhitespace(content: string): {
    content: string
    tokenSavings: number
  } {
    const original = content

    // Remove multiple consecutive spaces
    let optimized = content.replace(/[ \t]+/g, " ")

    // Remove excessive newlines (keep max 2)
    optimized = optimized.replace(/\n{3,}/g, "\n\n")

    // Remove trailing whitespace
    optimized = optimized.replace(/[ \t]+$/gm, "")

    // Remove leading/trailing whitespace
    optimized = optimized.trim()

    const tokenSavings = Math.ceil((original.length - optimized.length) / 4)
    return { content: optimized, tokenSavings }
  }

  /**
   * Compress repetitive patterns
   */
  private compressRepetitivePatterns(content: string): {
    content: string
    tokenSavings: number
  } {
    const original = content
    let optimized = content

    // Find and compress repetitive phrases (3+ words repeated)
    const words = content.split(/\s+/)
    const phraseMap = new Map<string, number>()

    // Look for 3-5 word phrases that repeat
    for (let length = 3; length <= 5; length++) {
      for (let i = 0; i <= words.length - length; i++) {
        const phrase = words.slice(i, i + length).join(" ")
        phraseMap.set(phrase, (phraseMap.get(phrase) || 0) + 1)
      }
    }

    // Replace repeated phrases with abbreviated versions
    for (const [phrase, count] of phraseMap.entries()) {
      if (count >= 3 && phrase.length > 20) {
        // Create an abbreviation from first letters
        const abbrev = phrase
          .split(" ")
          .map((w) => w[0])
          .join("")
        optimized = optimized.replace(
          new RegExp(
            `\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "g"
          ),
          `${phrase} (${abbrev})`
        )
        // Replace subsequent occurrences with just the abbreviation
        optimized = optimized.replace(
          new RegExp(
            `\\b${phrase.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )} \\(${abbrev}\\)`,
            "g"
          ),
          phrase,
          1 // Only first occurrence gets the full form
        )
      }
    }

    const tokenSavings = Math.ceil((original.length - optimized.length) / 4)
    return { content: optimized, tokenSavings }
  }

  /**
   * Apply model-specific formatting optimizations
   */
  private async applyModelSpecificFormatting(
    content: string,
    modelConfig: ModelConfig
  ): Promise<{ content: string; tokenSavings: number }> {
    let optimized = content
    const original = content

    if (modelConfig.formatPreferences) {
      // Claude prefers XML tags for structure
      if (
        modelConfig.formatPreferences.useXmlTags &&
        modelConfig.provider === "anthropic"
      ) {
        // Convert markdown headers to XML tags
        optimized = optimized.replace(
          /^#{1,6}\s+(.+)$/gm,
          "<section>$1</section>"
        )

        // Convert bullet points to structured format
        optimized = optimized.replace(/^[-*+]\s+(.+)$/gm, "<item>$1</item>")
      }

      // OpenAI models prefer clear role separation
      if (
        modelConfig.formatPreferences.roleBasedPrompting &&
        modelConfig.provider === "openai"
      ) {
        // Ensure clear system/user/assistant separation
        if (!optimized.includes("System:") && !optimized.includes("User:")) {
          optimized = `System: ${optimized}`
        }
      }

      // Gemini prefers simple markdown without complex nesting
      if (modelConfig.provider === "gemini") {
        // Simplify nested markdown structures
        optimized = optimized.replace(/#{4,6}/g, "###")
        optimized = optimized.replace(/\*\*\*(.*?)\*\*\*/g, "**$1**") // Remove triple emphasis
      }
    }

    const tokenSavings = Math.ceil((original.length - optimized.length) / 4)
    return { content: optimized, tokenSavings }
  }

  /**
   * Intelligent content trimming using AI
   */
  private async intelligentContentTrimming(
    content: string,
    maxTokens: number,
    modelConfig: ModelConfig
  ): Promise<{ content: string; tokenSavings: number }> {
    try {
      const prompt = `
Intelligently trim the following content to fit within ${maxTokens} tokens while preserving the most important information.

Guidelines:
- Preserve the main ideas and key points
- Remove redundant examples or elaborations
- Keep essential context and instructions
- Maintain readability and coherence
- Target model: ${modelConfig.model}

Original content:
${content}

Provide the trimmed version that maintains quality while reducing token count:`

      const trimmedContent = await this.llmService.generateResponse(prompt, {
        model: process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini", // Use a cost-effective model for optimization
        maxTokens: Math.min(maxTokens, 4000),
        temperature: 0.3,
      })

      const tokenSavings = Math.ceil(
        (content.length - trimmedContent.length) / 4
      )
      return { content: trimmedContent, tokenSavings }
    } catch (error) {
      console.error("Error in intelligent trimming:", error)
      // Fallback to simple truncation
      const maxChars = maxTokens * 4
      const truncated = content.substring(0, maxChars)
      const tokenSavings = Math.ceil((content.length - truncated.length) / 4)
      return { content: truncated, tokenSavings }
    }
  }

  /**
   * Calculate cost savings
   */
  private calculateCostSavings(
    originalTokens: TokenCount,
    optimizedTokens: TokenCount,
    modelConfig: ModelConfig
  ): number {
    const originalCost =
      (originalTokens.total * modelConfig.inputCostPer1k) / 1000
    const optimizedCost =
      (optimizedTokens.total * modelConfig.inputCostPer1k) / 1000
    return originalCost - optimizedCost
  }

  /**
   * Calculate overall quality score based on applied strategies
   */
  private calculateQualityScore(strategies: OptimizationStrategy[]): number {
    if (strategies.length === 0) return 1.0

    let weightedQuality = 0
    let totalWeight = 0

    for (const strategy of strategies) {
      const weight = strategy.applicability * strategy.tokenSavings
      weightedQuality += strategy.qualityImpact * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? weightedQuality / totalWeight : 1.0
  }

  /**
   * Store optimization result in database
   */
  async storeOptimization(
    itemId: string,
    result: OptimizationResult
  ): Promise<void> {
    try {
      await prisma.modelOptimization.upsert({
        where: {
          itemId_targetModel: {
            itemId,
            targetModel: result.targetModel,
          },
        },
        update: {
          optimizedContent: result.optimizedContent,
          originalTokens: result.originalTokens.total,
          optimizedTokens: result.optimizedTokens.total,
          tokenSavings: result.tokenSavings,
          costEstimate: result.costSavings,
          qualityScore: result.qualityScore,
          strategy: result.strategiesApplied.map((s) => s.name).join(","),
          metadata: JSON.stringify({
            strategies: result.strategiesApplied,
            modelConfig: result.metadata.modelConfig,
          }),
          createdBy: "model-optimizer",
          reviewedAt: new Date(),
        },
        create: {
          itemId,
          targetModel: result.targetModel,
          optimizedContent: result.optimizedContent,
          originalTokens: result.originalTokens.total,
          optimizedTokens: result.optimizedTokens.total,
          tokenSavings: result.tokenSavings,
          costEstimate: result.costSavings,
          qualityScore: result.qualityScore,
          strategy: result.strategiesApplied.map((s) => s.name).join(","),
          metadata: JSON.stringify({
            strategies: result.strategiesApplied,
            modelConfig: result.metadata.modelConfig,
          }),
          createdBy: "model-optimizer",
        },
      })
    } catch (error) {
      console.error("Error storing optimization:", error)
      throw error
    }
  }

  /**
   * Get optimization for item and model
   */
  async getOptimization(
    itemId: string,
    targetModel: string
  ): Promise<OptimizationResult | null> {
    try {
      const optimization = await prisma.modelOptimization.findUnique({
        where: {
          itemId_targetModel: {
            itemId,
            targetModel,
          },
        },
      })

      if (!optimization) return null

      const metadata = JSON.parse(optimization.metadata)

      return {
        originalContent: "", // Not stored to save space
        optimizedContent: optimization.optimizedContent,
        originalTokens: {
          total: optimization.originalTokens || 0,
          content: optimization.originalTokens || 0,
          metadata: 0,
          overhead: 0,
        },
        optimizedTokens: {
          total: optimization.optimizedTokens || 0,
          content: optimization.optimizedTokens || 0,
          metadata: 0,
          overhead: 0,
        },
        tokenSavings: optimization.tokenSavings || 0,
        costSavings: optimization.costEstimate || 0,
        qualityScore: optimization.qualityScore || 1.0,
        strategiesApplied: metadata.strategies || [],
        targetModel: optimization.targetModel,
        metadata: metadata,
      }
    } catch (error) {
      console.error("Error getting optimization:", error)
      return null
    }
  }

  /**
   * Get cost estimates for different models
   */
  async getCostEstimates(
    content: string,
    models: string[]
  ): Promise<
    Record<string, { tokens: number; inputCost: number; outputCost: number }>
  > {
    const estimates: Record<
      string,
      { tokens: number; inputCost: number; outputCost: number }
    > = {}

    for (const modelId of models) {
      const modelConfig = MODEL_CONFIGS[modelId]
      if (modelConfig) {
        const tokens = await this.countTokens(content, modelConfig)
        estimates[modelId] = {
          tokens: tokens.total,
          inputCost: (tokens.total * modelConfig.inputCostPer1k) / 1000,
          outputCost: (tokens.total * modelConfig.outputCostPer1k) / 1000,
        }
      }
    }

    return estimates
  }

  /**
   * Get recommendations for model selection based on content
   */
  async getModelRecommendations(
    content: string,
    requirements: {
      maxCost?: number
      prioritizeQuality?: boolean
      requiresLargeContext?: boolean
    } = {}
  ): Promise<
    Array<{
      modelId: string
      score: number
      reasoning: string
      cost: number
      tokens: number
    }>
  > {
    const recommendations = []

    for (const [modelId, config] of Object.entries(MODEL_CONFIGS)) {
      const tokens = await this.countTokens(content, config)
      const cost = (tokens.total * config.inputCostPer1k) / 1000

      // Skip if over budget
      if (requirements.maxCost && cost > requirements.maxCost) {
        continue
      }

      // Skip if content doesn't fit in context window
      if (tokens.total > config.contextWindow) {
        continue
      }

      let score = 0
      let reasoning = ""

      // Quality scoring
      if (requirements.prioritizeQuality) {
        if (config.provider === "anthropic" && config.model.includes("opus")) {
          score += 0.4
          reasoning += "High-quality model. "
        } else if (
          config.provider === "openai" &&
          config.model.includes("gpt-4")
        ) {
          score += 0.35
          reasoning += "High-quality OpenAI model. "
        }
      }

      // Cost efficiency
      const costEfficiency = 1 - Math.min(cost / 0.1, 1) // Normalize to 0.1 as expensive
      score += costEfficiency * 0.3
      reasoning += `Cost-efficient (${cost.toFixed(4)}). `

      // Context window utilization
      const contextUtilization = tokens.total / config.contextWindow
      if (requirements.requiresLargeContext && contextUtilization < 0.8) {
        score += 0.2
        reasoning += "Suitable for large context. "
      } else if (
        !requirements.requiresLargeContext &&
        contextUtilization < 0.5
      ) {
        score += 0.1
        reasoning += "Good context fit. "
      }

      // Model-specific bonuses
      if (config.provider === "openai" && config.model.includes("4o-mini")) {
        score += 0.1
        reasoning += "Fast and efficient. "
      }

      recommendations.push({
        modelId,
        score,
        reasoning: reasoning.trim(),
        cost,
        tokens: tokens.total,
      })
    }

    return recommendations.sort((a, b) => b.score - a.score)
  }
}

export default ModelOptimizer
