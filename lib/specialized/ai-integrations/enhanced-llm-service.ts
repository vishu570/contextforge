import { prisma } from "@/lib/db"
import { getModelConfigs, ModelConfig } from "@/lib/models/config"
import { decryptApiKey } from "@/lib/utils"
import Anthropic from "@anthropic-ai/sdk"
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"

export interface CustomEndpoint {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  headers?: Record<string, string>
  modelMapping?: Record<string, string>
  provider: "custom"
  supportedFeatures: string[]
}

export interface EnhancedLLMConfig {
  provider: "openai" | "anthropic" | "google" | "custom"
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
  customEndpoint?: CustomEndpoint
  functions?: FunctionDefinition[]
  responseFormat?: "text" | "json" | "structured"
  streaming?: boolean
  timeout?: number
}

export interface FunctionDefinition {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<
      string,
      {
        type: string
        description?: string
        enum?: string[]
      }
    >
    required?: string[]
  }
  handler?: (args: any) => Promise<any>
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "function"
  content: string
  name?: string
  function_call?: {
    name: string
    arguments: string
  }
}

export interface GenerationResult {
  content: string
  finishReason: "stop" | "length" | "function_call" | "content_filter"
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  cost: number
  duration: number
  functionCalls?: Array<{
    name: string
    arguments: any
    result?: any
  }>
  metadata?: Record<string, any>
}

export interface StreamingResult {
  content: string
  isComplete: boolean
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  functionCall?: {
    name: string
    arguments: string
    isComplete: boolean
  }
}

export interface BatchRequest {
  id: string
  messages: ChatMessage[]
  config: EnhancedLLMConfig
  metadata?: Record<string, any>
}

export interface BatchResult {
  id: string
  result: GenerationResult
  error?: string
}

export interface ModelComparison {
  models: string[]
  prompt: string
  results: Array<{
    model: string
    result: GenerationResult
    rank: number
    score: number
  }>
  winner: string
  metrics: {
    avgCost: number
    avgDuration: number
    avgTokens: number
    qualityScores: Record<string, number>
  }
}

export interface CostEstimation {
  model: string
  estimatedTokens: number
  estimatedCost: number
  maxCost: number
  breakdown: {
    promptTokens: number
    maxCompletionTokens: number
    promptCost: number
    completionCost: number
  }
}

export class EnhancedLLMService {
  private openai?: OpenAI
  private anthropic?: Anthropic
  private genAI?: GoogleGenerativeAI
  private customEndpoints: Map<string, CustomEndpoint> = new Map()
  private userId?: string
  private models: ModelConfig[] = []

  constructor(userId?: string) {
    this.userId = userId
    this.models = getModelConfigs()
    this.loadCustomEndpoints()
  }

  private async loadCustomEndpoints() {
    // Load from localStorage or database
    const savedEndpoints = localStorage.getItem("contextforge-custom-endpoints")
    if (savedEndpoints) {
      const endpoints: CustomEndpoint[] = JSON.parse(savedEndpoints)
      endpoints.forEach((endpoint) => {
        this.customEndpoints.set(endpoint.id, endpoint)
      })
    }
  }

  public addCustomEndpoint(endpoint: CustomEndpoint) {
    this.customEndpoints.set(endpoint.id, endpoint)
    this.saveCustomEndpoints()
  }

  public removeCustomEndpoint(id: string) {
    this.customEndpoints.delete(id)
    this.saveCustomEndpoints()
  }

  private saveCustomEndpoints() {
    const endpoints = Array.from(this.customEndpoints.values())
    localStorage.setItem(
      "contextforge-custom-endpoints",
      JSON.stringify(endpoints)
    )
  }

  private async initializeProviders(userId?: string) {
    const targetUserId = userId || this.userId
    if (!targetUserId) {
      throw new Error("User ID required to initialize LLM providers")
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: targetUserId },
    })

    for (const apiKey of apiKeys) {
      const decryptedKey = decryptApiKey(apiKey.encryptedKey)

      switch (apiKey.provider) {
        case "openai":
          this.openai = new OpenAI({
            apiKey: decryptedKey,
            timeout: 60000,
          })
          break
        case "anthropic":
          this.anthropic = new Anthropic({
            apiKey: decryptedKey,
            timeout: 60000,
          })
          break
        case "google":
          this.genAI = new GoogleGenerativeAI(decryptedKey)
          break
      }
    }
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    config: EnhancedLLMConfig
  ): Promise<GenerationResult> {
    await this.initializeProviders()

    const startTime = Date.now()
    const model = this.getModelConfig(config.model || "default")

    if (!model) {
      throw new Error(`Model ${config.model} not found`)
    }

    try {
      let result: GenerationResult

      if (config.provider === "custom" && config.customEndpoint) {
        result = await this.generateWithCustomEndpoint(
          messages,
          config,
          config.customEndpoint
        )
      } else {
        switch (config.provider) {
          case "openai":
            result = await this.generateWithOpenAI(messages, config, model)
            break
          case "anthropic":
            result = await this.generateWithAnthropic(messages, config, model)
            break
          case "google":
            result = await this.generateWithGoogle(messages, config, model)
            break
          default:
            throw new Error(`Unsupported provider: ${config.provider}`)
        }
      }

      result.duration = Date.now() - startTime
      result.cost = this.calculateCost(result.usage, model)
      result.model = model.id

      return result
    } catch (error) {
      throw new Error(
        `Generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  private async generateWithOpenAI(
    messages: ChatMessage[],
    config: EnhancedLLMConfig,
    model: ModelConfig
  ): Promise<GenerationResult> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized")
    }

    const openaiMessages = messages.map((msg) => ({
      role:
        msg.role === "system"
          ? "system"
          : msg.role === "user"
          ? "user"
          : "assistant",
      content: msg.content,
      ...(msg.name && { name: msg.name }),
      ...(msg.function_call && { function_call: msg.function_call }),
    }))

    const requestParams: any = {
      model: config.model || model.id,
      messages: openaiMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 1000,
      top_p: config.topP ?? 1,
      frequency_penalty: config.frequencyPenalty ?? 0,
      presence_penalty: config.presencePenalty ?? 0,
    }

    // Add functions if provided
    if (config.functions && config.functions.length > 0) {
      requestParams.functions = config.functions.map((fn) => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      }))
    }

    // Handle response format
    if (config.responseFormat === "json") {
      requestParams.response_format = { type: "json_object" }
    }

    const response = await this.openai.chat.completions.create(requestParams)
    const choice = response.choices[0]

    return {
      content: choice.message.content || "",
      finishReason:
        choice.finish_reason === "stop"
          ? "stop"
          : choice.finish_reason === "length"
          ? "length"
          : choice.finish_reason === "function_call"
          ? "function_call"
          : "stop",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
      cost: 0, // Will be calculated later
      duration: 0, // Will be set by caller
      functionCalls: choice.message.function_call
        ? [
            {
              name: choice.message.function_call.name,
              arguments: JSON.parse(choice.message.function_call.arguments),
            },
          ]
        : undefined,
    }
  }

  private async generateWithAnthropic(
    messages: ChatMessage[],
    config: EnhancedLLMConfig,
    model: ModelConfig
  ): Promise<GenerationResult> {
    if (!this.anthropic) {
      throw new Error("Anthropic client not initialized")
    }

    // Separate system message from other messages
    const systemMessage =
      messages.find((m) => m.role === "system")?.content ||
      config.systemPrompt ||
      ""
    const conversationMessages = messages.filter((m) => m.role !== "system")

    const anthropicMessages = conversationMessages.map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
      content: msg.content,
    }))

    const response = await this.anthropic.messages.create({
      model: config.model || model.id,
      messages: anthropicMessages,
      system: systemMessage,
      max_tokens: config.maxTokens ?? 1000,
      temperature: config.temperature ?? 0.7,
    })

    const usage = response.usage
    const content = response.content[0]

    return {
      content: content.type === "text" ? content.text : "",
      finishReason:
        response.stop_reason === "end_turn"
          ? "stop"
          : response.stop_reason === "max_tokens"
          ? "length"
          : "stop",
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      },
      model: response.model,
      cost: 0,
      duration: 0,
    }
  }

  private async generateWithGoogle(
    messages: ChatMessage[],
    config: EnhancedLLMConfig,
    model: ModelConfig
  ): Promise<GenerationResult> {
    if (!this.genAI) {
      throw new Error("Google AI client not initialized")
    }

    const geminiModel = this.genAI.getGenerativeModel({
      model: config.model || model.id,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 1000,
        topP: config.topP ?? 1,
      },
    })

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: msg.content }],
    }))

    const lastMessage = messages[messages.length - 1]

    const chat = geminiModel.startChat({ history })
    const result = await chat.sendMessage(lastMessage.content)

    const response = result.response
    const text = response.text()

    // Estimate token usage (Gemini doesn't provide exact counts)
    const estimatedPromptTokens = Math.ceil(messages.join(" ").length / 4)
    const estimatedCompletionTokens = Math.ceil(text.length / 4)

    return {
      content: text,
      finishReason: "stop",
      usage: {
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens,
        totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
      },
      model: config.model || model.id,
      cost: 0,
      duration: 0,
    }
  }

  private async generateWithCustomEndpoint(
    messages: ChatMessage[],
    config: EnhancedLLMConfig,
    endpoint: CustomEndpoint
  ): Promise<GenerationResult> {
    const headers = {
      "Content-Type": "application/json",
      ...(endpoint.headers || {}),
      ...(endpoint.apiKey && { Authorization: `Bearer ${endpoint.apiKey}` }),
    }

    const body = {
      model: config.model,
      messages: messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 1000,
      ...config,
    }

    const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeout || 60000),
    })

    if (!response.ok) {
      throw new Error(
        `Custom endpoint error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    const choice = data.choices?.[0]

    if (!choice) {
      throw new Error("Invalid response from custom endpoint")
    }

    return {
      content: choice.message?.content || "",
      finishReason:
        choice.finish_reason === "stop"
          ? "stop"
          : choice.finish_reason === "length"
          ? "length"
          : "stop",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model || config.model || "unknown",
      cost: 0,
      duration: 0,
    }
  }

  async *generateStreamingCompletion(
    messages: ChatMessage[],
    config: EnhancedLLMConfig
  ): AsyncGenerator<StreamingResult> {
    await this.initializeProviders()

    const model = this.getModelConfig(config.model || "default")
    if (!model) {
      throw new Error(`Model ${config.model} not found`)
    }

    if (config.provider === "openai" && this.openai) {
      yield* this.streamOpenAI(messages, config, model)
    } else if (config.provider === "anthropic" && this.anthropic) {
      yield* this.streamAnthropic(messages, config, model)
    } else {
      // Fall back to non-streaming
      const result = await this.generateChatCompletion(messages, config)
      yield {
        content: result.content,
        isComplete: true,
        usage: result.usage,
      }
    }
  }

  private async *streamOpenAI(
    messages: ChatMessage[],
    config: EnhancedLLMConfig,
    model: ModelConfig
  ): AsyncGenerator<StreamingResult> {
    if (!this.openai) return

    const stream = await this.openai.chat.completions.create({
      model: config.model || model.id,
      messages: messages.map((msg) => ({
        role: msg.role as any,
        content: msg.content,
      })),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 1000,
      stream: true,
    })

    let content = ""
    let functionCall: any = null

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta

      if (delta?.content) {
        content += delta.content
        yield {
          content,
          isComplete: false,
        }
      }

      if (delta?.function_call) {
        if (!functionCall) {
          functionCall = { name: "", arguments: "", isComplete: false }
        }

        if (delta.function_call.name) {
          functionCall.name += delta.function_call.name
        }

        if (delta.function_call.arguments) {
          functionCall.arguments += delta.function_call.arguments
        }

        yield {
          content,
          isComplete: false,
          functionCall,
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        yield {
          content,
          isComplete: true,
          functionCall: functionCall
            ? { ...functionCall, isComplete: true }
            : undefined,
          usage: {
            promptTokens: 0, // Will be updated with final chunk
            completionTokens: 0,
            totalTokens: 0,
          },
        }
        break
      }
    }
  }

  private async *streamAnthropic(
    messages: ChatMessage[],
    config: EnhancedLLMConfig,
    model: ModelConfig
  ): AsyncGenerator<StreamingResult> {
    // Anthropic streaming implementation would go here
    // For now, fall back to non-streaming
    const result = await this.generateWithAnthropic(messages, config, model)
    yield {
      content: result.content,
      isComplete: true,
      usage: result.usage,
    }
  }

  async batchGenerate(requests: BatchRequest[]): Promise<BatchResult[]> {
    const results = await Promise.allSettled(
      requests.map(async (request) => {
        try {
          const result = await this.generateChatCompletion(
            request.messages,
            request.config
          )
          return { id: request.id, result }
        } catch (error) {
          return {
            id: request.id,
            result: {} as GenerationResult,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }
      })
    )

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value
      } else {
        return {
          id: requests[index].id,
          result: {} as GenerationResult,
          error: result.reason,
        }
      }
    })
  }

  async compareModels(
    prompt: string,
    models: string[],
    config: Partial<EnhancedLLMConfig> = {}
  ): Promise<ModelComparison> {
    const messages: ChatMessage[] = [{ role: "user", content: prompt }]

    const requests: BatchRequest[] = models.map((modelId) => ({
      id: modelId,
      messages,
      config: {
        ...config,
        model: modelId,
        provider: this.getModelProvider(modelId),
      },
    }))

    const results = await this.batchGenerate(requests)

    // Calculate scores and rankings
    const scoredResults = results.map((result) => {
      if (result.error) {
        return {
          model: result.id,
          result: {} as GenerationResult,
          rank: models.length,
          score: 0,
        }
      }

      // Simple scoring based on response length, cost efficiency, and speed
      const lengthScore = Math.min(result.result.content.length / 1000, 1)
      const costScore = 1 - Math.min(result.result.cost / 0.1, 1)
      const speedScore = 1 - Math.min(result.result.duration / 10000, 1)

      const score = lengthScore * 0.4 + costScore * 0.3 + speedScore * 0.3

      return { model: result.id, result: result.result, rank: 0, score }
    })

    // Sort by score and assign ranks
    scoredResults.sort((a, b) => b.score - a.score)
    scoredResults.forEach((result, index) => {
      result.rank = index + 1
    })

    // Calculate metrics
    const validResults = scoredResults.filter((r) => r.result.usage)
    const avgCost =
      validResults.reduce((sum, r) => sum + r.result.cost, 0) /
      validResults.length
    const avgDuration =
      validResults.reduce((sum, r) => sum + r.result.duration, 0) /
      validResults.length
    const avgTokens =
      validResults.reduce((sum, r) => sum + r.result.usage.totalTokens, 0) /
      validResults.length

    return {
      models,
      prompt,
      results: scoredResults,
      winner: scoredResults[0]?.model || "",
      metrics: {
        avgCost,
        avgDuration,
        avgTokens,
        qualityScores: Object.fromEntries(
          scoredResults.map((r) => [r.model, r.score])
        ),
      },
    }
  }

  estimateCost(
    prompt: string,
    modelId: string,
    config: Partial<EnhancedLLMConfig> = {}
  ): CostEstimation {
    const model = this.getModelConfig(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    const promptTokens = this.estimateTokens(prompt)
    const maxCompletionTokens = config.maxTokens || 1000

    const promptCost = (promptTokens / 1000) * model.cost
    const completionCost = (maxCompletionTokens / 1000) * model.cost

    return {
      model: modelId,
      estimatedTokens: promptTokens + maxCompletionTokens,
      estimatedCost: promptCost + completionCost,
      maxCost: completionCost * 2, // Safety margin
      breakdown: {
        promptTokens,
        maxCompletionTokens,
        promptCost,
        completionCost,
      },
    }
  }

  private estimateTokens(text: string): number {
    // Simplified token estimation (4 chars ≈ 1 token for most models)
    return Math.ceil(text.length / 4)
  }

  private calculateCost(
    usage: { totalTokens: number },
    model: ModelConfig
  ): number {
    return (usage.totalTokens / 1000) * model.cost
  }

  private getModelConfig(modelId: string): ModelConfig | undefined {
    return (
      this.models.find((m) => m.id === modelId) ||
      this.models.find((m) => m.isDefault)
    )
  }

  private getModelProvider(
    modelId: string
  ): "openai" | "anthropic" | "google" | "custom" {
    const model = this.getModelConfig(modelId)
    return model?.provider || "openai"
  }

  // Function calling support
  async executeFunctionCall(
    functionCall: { name: string; arguments: any },
    availableFunctions: FunctionDefinition[]
  ): Promise<any> {
    const functionDef = availableFunctions.find(
      (f) => f.name === functionCall.name
    )
    if (!functionDef) {
      throw new Error(`Function ${functionCall.name} not found`)
    }

    if (functionDef.handler) {
      return await functionDef.handler(functionCall.arguments)
    } else {
      // Return a mock response for functions without handlers
      return {
        status: "success",
        message: `Function ${functionCall.name} executed`,
        arguments: functionCall.arguments,
      }
    }
  }

  // Helper methods for model management
  getAvailableModels(): ModelConfig[] {
    return this.models
  }

  getCustomEndpoints(): CustomEndpoint[] {
    return Array.from(this.customEndpoints.values())
  }

  async testEndpoint(endpoint: CustomEndpoint): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint.baseUrl}/models`, {
        method: "GET",
        headers: {
          ...(endpoint.headers || {}),
          ...(endpoint.apiKey && {
            Authorization: `Bearer ${endpoint.apiKey}`,
          }),
        },
        signal: AbortSignal.timeout(10000),
      })

      return response.ok
    } catch {
      return false
    }
  }
}
