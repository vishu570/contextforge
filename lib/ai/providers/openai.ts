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
    "gpt-5-mini-2025-08-07",
    "gpt-4o",
    "gpt-4o-mini",
    "text-embedding-3-small",
    "text-embedding-3-large",
  ]

  // Default models for different tasks
  public readonly defaultModels = {
    chat: "gpt-4o-mini", // More stable for chat tasks
    categorization: "gpt-4o-mini", // More reliable for categorization
    optimization: "gpt-4o", // Better for optimization tasks
    embedding: "text-embedding-3-small"
  }

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
      const model = options.model || this.defaultModels.optimization

      const completionOptions: any = {
        model,
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: options.maxTokens || 2000,
      }

      // GPT-5 models only support default temperature (1)
      if (!model.includes("gpt-5")) {
        completionOptions.temperature = options.temperature || 0.7
      }

      const response = await this.client.chat.completions.create(
        completionOptions
      )

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
        `OpenAI optimization failed: ${
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

      const model = options.model || this.defaultModels.categorization
      const completionOptions: any = {
        model,
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: model.includes("gpt-5") ? 400 : 200,
        temperature: model.includes("gpt-5") ? undefined : 0.3, // GPT-5 only supports default temp
      }

      const response = await this.client.chat.completions.create(completionOptions)

      const result = response.choices[0]?.message?.content?.trim()

      console.log(`OpenAI categorization response:`, {
        model,
        result,
        usage: response.usage,
        finishReason: response.choices[0]?.finish_reason,
      })

      if (!result) {
        console.warn("Empty categorization result from OpenAI")
        
        // If we used GPT-5 and got empty result, try with GPT-4o as fallback
        if (model.includes("gpt-5")) {
          console.log("Retrying categorization with GPT-4o fallback")
          try {
            const fallbackResponse = await this.client.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              max_completion_tokens: 200,
              temperature: 0.3,
            })

            const fallbackResult = fallbackResponse.choices[0]?.message?.content?.trim()
            if (fallbackResult) {
              const fallbackCategories = this.parseCategories(fallbackResult, options.maxSuggestions || 5)
              if (fallbackCategories && fallbackCategories.length > 0) {
                console.log("GPT-4o fallback successful:", fallbackCategories)
                return fallbackCategories
              }
            }
          } catch (fallbackError) {
            console.warn("GPT-4o fallback also failed:", fallbackError)
          }
        }
        
        // Final fallback to basic rule-based categorization
        console.warn("Using basic rule-based categorization")
        return this.extractBasicFallbackTags(
          content,
          options.maxSuggestions || 5,
          options.itemName
        )
      }

      const categories = this.parseCategories(
        result,
        options.maxSuggestions || 5
      )

      // If parsing failed or returned empty array, fallback to basic tags
      if (!categories || categories.length === 0) {
        console.warn(
          "Failed to parse categorization result, falling back to basic tags"
        )
        return this.extractBasicFallbackTags(
          content,
          options.maxSuggestions || 5,
          options.itemName
        )
      }

      return categories
    } catch (error) {
      console.error("OpenAI categorization error:", error)

      // Fallback to basic categorization instead of throwing
      console.warn("OpenAI categorization failed, falling back to basic tags")
      return this.extractBasicFallbackTags(
        content,
        options.maxSuggestions || 5,
        options.itemName
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
        `OpenAI embedding failed: ${
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
    const itemName = this.extractItemName(content)

    let prompt = `Analyze the following content and suggest ${
      options.maxSuggestions || 5
    } appropriate HIGH-LEVEL categories using exactly 2 words per tag.

SPECIAL FILE DETECTION:
- If filename is "CLAUDE.md" or content mentions "Claude Code", use tag "claude-config"
- If content is about hooks/automation, use tag "workflow-automation"
- If content defines AI agents/subagents, use tag "ai-agent"
- If content is a prompt template, use tag "prompt-template"

IMPORTANT RULES:
1. Tags must be EXACTLY 2 words connected with hyphen (e.g., "web-development", "data-science")
2. DO NOT use the item name "${itemName}" as a tag
3. DO NOT use generic single words like "tool", "utility", "helper", "code", "file"
4. Focus on HIGH-LEVEL categories that group similar items
5. Prefer broader categories over narrow specifics

Tag categories (use 2-word combinations):
- Development domains: "web-development", "mobile-development", "data-science", "machine-learning"
- Technology stacks: "frontend-development", "backend-development", "full-stack", "devops-automation"
- Specializations: "api-design", "database-design", "security-audit", "performance-optimization"
- Content types: "prompt-template", "ai-agent", "code-review", "system-config"

Content to analyze:
${content}

`

    if (options.existingCategories?.length) {
      prompt += `Consider reusing these existing categories when appropriate: ${options.existingCategories.join(
        ", "
      )}\n\n`
    }

    prompt += `IMPORTANT: Return ONLY a JSON array of exactly 2-word category names. Do not include any explanations or reasoning.

Examples of good tags: ["web-development", "ai-agent", "api-design", "claude-config", "prompt-template"]
Examples of poor tags: ["ai", "code", "file", "text", "document", "web-development-framework", "ai-agent-specialist"]

Your response must be ONLY the JSON array, starting with [ and ending with ]. No other text.`
    return prompt
  }

  private parseCategories(result: string, maxSuggestions: number): string[] {
    try {
      // Handle JSON array response
      const categories = JSON.parse(result)
      return Array.isArray(categories)
        ? categories
            .slice(0, maxSuggestions)
            .filter((cat) => cat && typeof cat === "string")
        : []
    } catch {
      // Fallback to simple parsing for non-JSON responses
      const parsed = result
        .split(/[,\n]/)
        .map((cat) => cat.trim().replace(/['"[\]]/g, ""))
        .filter((cat) => cat.length > 0 && !cat.match(/^\d+\.?\s*$/)) // Filter out numbers and empty strings
        .slice(0, maxSuggestions)

      return parsed.length > 0 ? parsed : []
    }
  }

  private extractBasicFallbackTags(
    content: string,
    maxSuggestions: number,
    itemName: string = ''
  ): string[] {
    const inferredItemName = itemName || this.extractItemName(content)
    const tags: Set<string> = new Set()
    const lowerContent = content.toLowerCase()

    // Functional categories (more specific than generic types)
    if (lowerContent.includes("analysis") || lowerContent.includes("analyze")) {
      tags.add("data-analysis")
    }
    if (lowerContent.includes("search") || lowerContent.includes("query")) {
      tags.add("search-optimization")
    }
    if (lowerContent.includes("review") || lowerContent.includes("audit")) {
      tags.add("code-review")
    }
    if (lowerContent.includes("research") || lowerContent.includes("investigate")) {
      tags.add("research")
    }
    if (lowerContent.includes("coordination") || lowerContent.includes("orchestr")) {
      tags.add("workflow-coordination")
    }
    
    // Technology domains
    if (lowerContent.includes("backend") || lowerContent.includes("server")) {
      tags.add("backend-development")
    }
    if (lowerContent.includes("frontend") || lowerContent.includes("client")) {
      tags.add("frontend-development")
    }
    if (lowerContent.includes("api") && !lowerContent.includes("therapy")) {
      tags.add("api-development")
    }
    if (lowerContent.includes("typescript") || lowerContent.includes("ts")) {
      tags.add("typescript")
    }
    if (lowerContent.includes("javascript") || lowerContent.includes("js")) {
      tags.add("javascript")
    }
    if (lowerContent.includes("python")) {
      tags.add("python")
    }
    if (lowerContent.includes("react")) {
      tags.add("react")
    }
    
    // Specific AI/Agent categories and Claude Code detection
    if (lowerContent.includes("claude code") || inferredItemName.includes("claude")) {
      tags.add("claude-config")
    }
    if (lowerContent.includes("subagent") || (lowerContent.includes("claude") && lowerContent.includes("agent"))) {
      tags.add("ai-agent")
    }
    if (lowerContent.includes("agent") && !lowerContent.includes("subagent")) {
      tags.add("ai-agent")
    }
    if (lowerContent.includes("hook") || lowerContent.includes("automation")) {
      tags.add("workflow-automation")
    }
    
    // Specialization areas
    if (lowerContent.includes("security")) {
      tags.add("security")
    }
    if (lowerContent.includes("performance")) {
      tags.add("performance-optimization")
    }
    if (lowerContent.includes("database") || lowerContent.includes("sql")) {
      tags.add("database")
    }

    const result = Array.from(tags).slice(0, maxSuggestions)

    // Ensure we always return at least one meaningful tag
    if (result.length === 0) {
      // Try to infer from common patterns
      if (lowerContent.includes("agent")) {
        result.push("ai-agent")
      } else if (lowerContent.includes("development")) {
        result.push("development")
      } else {
        result.push("general")
      }
    }

    return result
  }

  private extractItemName(content: string): string {
    // Try to extract item name from content - look for common patterns
    const lines = content.split('\n').slice(0, 10) // Check first 10 lines
    
    // Look for title patterns
    for (const line of lines) {
      const titleMatch = line.match(/^#+\s*(.+)$/) // Markdown headers
      if (titleMatch) {
        return titleMatch[1].trim().toLowerCase()
      }
      
      const nameMatch = line.match(/^name:\s*(.+)$/i) // YAML/frontmatter name
      if (nameMatch) {
        return nameMatch[1].trim().toLowerCase()
      }
    }
    
    return '' // Fallback if no name found
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
      "gpt-5-mini-2025-08-07": { input: 0.003 / 1000, output: 0.0075 / 1000 }, // Updated pricing for GPT-5 mini
      "gpt-4o": { input: 0.0025 / 1000, output: 0.01 / 1000 },
      "gpt-4o-mini": { input: 0.00015 / 1000, output: 0.0006 / 1000 },
    }

    const rates =
      pricing[model as keyof typeof pricing] || pricing["gpt-4o-mini"]
    return tokenUsage.input * rates.input + tokenUsage.output * rates.output
  }
}
