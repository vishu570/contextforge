import { prisma } from "@/lib/db"
import { LLMService } from "@/lib/llm"
import OpenAI from "openai"

export interface EmbeddingProvider {
  name: string
  model: string
  dimensions: number
  maxTokens: number
  costPerToken?: number
}

export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
  dimensions: number
  provider: string
  model: string
}

export interface SimilarityResult {
  itemId: string
  similarity: number
  distance?: number
}

export type SimilarityAlgorithm =
  | "cosine"
  | "euclidean"
  | "dot_product"
  | "manhattan"

// Supported embedding providers and models
export const EMBEDDING_PROVIDERS: Record<string, EmbeddingProvider> = {
  "openai-small": {
    name: "openai",
    model: "text-embedding-3-small",
    dimensions: 1536,
    maxTokens: 8191,
    costPerToken: 0.00002 / 1000, // $0.02 per 1M tokens
  },
  "openai-large": {
    name: "openai",
    model: "text-embedding-3-large",
    dimensions: 3072,
    maxTokens: 8191,
    costPerToken: 0.00013 / 1000, // $0.13 per 1M tokens
  },
  "openai-ada": {
    name: "openai",
    model: "text-embedding-ada-002",
    dimensions: 1536,
    maxTokens: 8191,
    costPerToken: 0.0001 / 1000, // $0.10 per 1M tokens
  },
}

export class EmbeddingService {
  private llmService: LLMService
  private defaultProvider: string

  constructor(userId?: string, defaultProvider: string = "openai-small") {
    this.llmService = new LLMService(userId)
    this.defaultProvider = defaultProvider
  }

  /**
   * Generate embedding for content
   */
  async generateEmbedding(
    content: string,
    providerId?: string
  ): Promise<EmbeddingResult> {
    const provider = EMBEDDING_PROVIDERS[providerId || this.defaultProvider]
    if (!provider) {
      throw new Error(`Unsupported embedding provider: ${providerId}`)
    }

    // Truncate content if it exceeds max tokens
    const truncatedContent = this.truncateContent(content, provider.maxTokens)

    try {
      let embedding: number[]
      let tokenCount: number

      switch (provider.name) {
        case "openai":
          const result = await this.generateOpenAIEmbedding(
            truncatedContent,
            provider.model
          )
          embedding = result.embedding
          tokenCount = result.tokenCount
          break
        default:
          throw new Error(`Embedding provider ${provider.name} not implemented`)
      }

      return {
        embedding,
        tokenCount,
        dimensions: provider.dimensions,
        provider: provider.name,
        model: provider.model,
      }
    } catch (error) {
      console.error("Error generating embedding:", error)
      throw error
    }
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateOpenAIEmbedding(
    content: string,
    model: string
  ): Promise<{ embedding: number[]; tokenCount: number }> {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const response = await openai.embeddings.create({
      model,
      input: content,
    })

    return {
      embedding: response.data[0].embedding,
      tokenCount: response.usage?.total_tokens || 0,
    }
  }

  /**
   * Store embedding in database
   */
  async storeEmbedding(
    itemId: string,
    embeddingResult: EmbeddingResult
  ): Promise<void> {
    try {
      await prisma.itemEmbedding.upsert({
        where: { itemId },
        update: {
          provider: embeddingResult.provider,
          model: embeddingResult.model,
          embedding: JSON.stringify(embeddingResult.embedding),
          dimensions: embeddingResult.dimensions,
          tokenCount: embeddingResult.tokenCount,
          updatedAt: new Date(),
        },
        create: {
          itemId,
          provider: embeddingResult.provider,
          model: embeddingResult.model,
          embedding: JSON.stringify(embeddingResult.embedding),
          dimensions: embeddingResult.dimensions,
          tokenCount: embeddingResult.tokenCount,
        },
      })
    } catch (error) {
      console.error("Error storing embedding:", error)
      throw error
    }
  }

  /**
   * Get embedding for item
   */
  async getEmbedding(itemId: string): Promise<number[] | null> {
    try {
      const embedding = await prisma.itemEmbedding.findUnique({
        where: { itemId },
      })

      if (!embedding) return null

      return JSON.parse(embedding.embedding)
    } catch (error) {
      console.error("Error retrieving embedding:", error)
      return null
    }
  }

  /**
   * Generate and store embedding for item
   */
  async embedItem(
    itemId: string,
    content: string,
    providerId?: string
  ): Promise<EmbeddingResult> {
    const embeddingResult = await this.generateEmbedding(content, providerId)
    await this.storeEmbedding(itemId, embeddingResult)
    return embeddingResult
  }

  /**
   * Find similar items using vector similarity
   */
  async findSimilarItems(
    targetEmbedding: number[],
    userId: string,
    options: {
      limit?: number
      threshold?: number
      algorithm?: SimilarityAlgorithm
      excludeItemIds?: string[]
    } = {}
  ): Promise<SimilarityResult[]> {
    const {
      limit = 10,
      threshold = 0.7,
      algorithm = "cosine",
      excludeItemIds = [],
    } = options

    try {
      // Get all embeddings for the user
      const embeddings = await prisma.itemEmbedding.findMany({
        where: {
          item: {
            userId,
          },
          itemId: {
            notIn: excludeItemIds,
          },
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      })

      const similarities: SimilarityResult[] = []

      for (const embedding of embeddings) {
        const embeddingVector = JSON.parse(embedding.embedding)
        const similarity = this.calculateSimilarity(
          targetEmbedding,
          embeddingVector,
          algorithm
        )

        if (similarity >= threshold) {
          similarities.push({
            itemId: embedding.itemId,
            similarity,
          })
        }
      }

      // Sort by similarity (descending) and limit results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
    } catch (error) {
      console.error("Error finding similar items:", error)
      throw error
    }
  }

  /**
   * Search for items by query using semantic similarity
   */
  async semanticSearch(
    query: string,
    userId: string,
    options: {
      limit?: number
      threshold?: number
      algorithm?: SimilarityAlgorithm
      providerId?: string
    } = {}
  ): Promise<{
    results: SimilarityResult[]
    queryEmbedding: number[]
    executionTime: number
  }> {
    const startTime = Date.now()

    try {
      // Generate embedding for the query
      const queryEmbeddingResult = await this.generateEmbedding(
        query,
        options.providerId
      )

      // Find similar items
      const results = await this.findSimilarItems(
        queryEmbeddingResult.embedding,
        userId,
        options
      )

      const executionTime = Date.now() - startTime

      // Store search for analytics
      await this.storeSemanticSearch(
        userId,
        query,
        queryEmbeddingResult.embedding,
        results,
        executionTime,
        options.algorithm || "cosine",
        options.threshold || 0.7
      )

      return {
        results,
        queryEmbedding: queryEmbeddingResult.embedding,
        executionTime,
      }
    } catch (error) {
      console.error("Error in semantic search:", error)
      throw error
    }
  }

  /**
   * Store semantic search for analytics
   */
  private async storeSemanticSearch(
    userId: string,
    query: string,
    queryEmbedding: number[],
    results: SimilarityResult[],
    executionTime: number,
    algorithm: string,
    threshold: number
  ): Promise<void> {
    try {
      await prisma.semanticSearch.create({
        data: {
          userId,
          query,
          queryEmbedding: JSON.stringify(queryEmbedding),
          results: JSON.stringify(results),
          resultCount: results.length,
          algorithm,
          threshold,
          executionTime,
        },
      })
    } catch (error) {
      console.error("Error storing semantic search:", error)
    }
  }

  /**
   * Calculate similarity between two vectors
   */
  calculateSimilarity(
    vec1: number[],
    vec2: number[],
    algorithm: SimilarityAlgorithm = "cosine"
  ): number {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same dimensions")
    }

    switch (algorithm) {
      case "cosine":
        return this.cosineSimilarity(vec1, vec2)
      case "euclidean":
        return 1 / (1 + this.euclideanDistance(vec1, vec2))
      case "dot_product":
        return this.dotProduct(vec1, vec2)
      case "manhattan":
        return 1 / (1 + this.manhattanDistance(vec1, vec2))
      default:
        throw new Error(`Unsupported similarity algorithm: ${algorithm}`)
    }
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }

  /**
   * Calculate Euclidean distance
   */
  private euclideanDistance(vec1: number[], vec2: number[]): number {
    let sum = 0
    for (let i = 0; i < vec1.length; i++) {
      sum += Math.pow(vec1[i] - vec2[i], 2)
    }
    return Math.sqrt(sum)
  }

  /**
   * Calculate dot product
   */
  private dotProduct(vec1: number[], vec2: number[]): number {
    let product = 0
    for (let i = 0; i < vec1.length; i++) {
      product += vec1[i] * vec2[i]
    }
    return product
  }

  /**
   * Calculate Manhattan distance
   */
  private manhattanDistance(vec1: number[], vec2: number[]): number {
    let sum = 0
    for (let i = 0; i < vec1.length; i++) {
      sum += Math.abs(vec1[i] - vec2[i])
    }
    return sum
  }

  /**
   * Truncate content to fit within token limit
   */
  private truncateContent(content: string, maxTokens: number): string {
    // Simple truncation - approximately 4 characters per token
    const maxChars = maxTokens * 4
    if (content.length <= maxChars) {
      return content
    }
    return content.substring(0, maxChars) + "..."
  }

  /**
   * Get embedding statistics for user
   */
  async getEmbeddingStats(userId: string): Promise<{
    totalEmbeddings: number
    byProvider: Record<string, number>
    averageDimensions: number
    totalTokens: number
  }> {
    try {
      const embeddings = await prisma.itemEmbedding.findMany({
        where: {
          item: {
            userId,
          },
        },
        select: {
          provider: true,
          dimensions: true,
          tokenCount: true,
        },
      })

      const byProvider: Record<string, number> = {}
      let totalDimensions = 0
      let totalTokens = 0

      for (const embedding of embeddings) {
        byProvider[embedding.provider] =
          (byProvider[embedding.provider] || 0) + 1
        totalDimensions += embedding.dimensions
        totalTokens += embedding.tokenCount || 0
      }

      return {
        totalEmbeddings: embeddings.length,
        byProvider,
        averageDimensions:
          embeddings.length > 0 ? totalDimensions / embeddings.length : 0,
        totalTokens,
      }
    } catch (error) {
      console.error("Error getting embedding stats:", error)
      throw error
    }
  }

  /**
   * Delete embeddings for item
   */
  async deleteEmbeddings(itemId: string): Promise<void> {
    try {
      await prisma.itemEmbedding.delete({
        where: { itemId },
      })
    } catch (error) {
      // Ignore if embedding doesn't exist
      if ((error as any).code !== "P2025") {
        console.error("Error deleting embeddings:", error)
        throw error
      }
    }
  }

  /**
   * Batch generate embeddings for multiple items
   */
  async batchEmbedItems(
    items: Array<{ id: string; content: string }>,
    providerId?: string,
    batchSize: number = 100
  ): Promise<void> {
    const batches = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }

    for (const batch of batches) {
      const promises = batch.map(async (item) => {
        try {
          await this.embedItem(item.id, item.content, providerId)
        } catch (error) {
          console.error(`Error embedding item ${item.id}:`, error)
        }
      })

      await Promise.all(promises)
    }
  }
}

export default EmbeddingService
