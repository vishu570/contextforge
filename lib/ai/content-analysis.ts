import { prisma } from "@/lib/db"
import { EmbeddingService } from "@/lib/embeddings"
import { LLMService } from "@/lib/llm"

export interface ContentSummary {
  summary: string
  keyPoints: string[]
  entities: string[]
  concepts: string[]
  complexity: "simple" | "moderate" | "complex"
  readabilityScore: number
  sentimentScore: number
  language: string
  wordCount: number
  confidence: number
}

export interface QualityAssessment {
  overallScore: number
  clarity: number
  completeness: number
  accuracy: number
  relevance: number
  structure: number
  feedback: string[]
  suggestions: string[]
  strengths: string[]
  weaknesses: string[]
}

export interface AutoTags {
  tags: Array<{
    name: string
    confidence: number
    category: "topic" | "domain" | "complexity" | "format" | "purpose"
  }>
  suggestedCategories: string[]
  metadata: {
    processingTime: number
    method: string
  }
}

export interface ContentInsights {
  summary: ContentSummary
  quality: QualityAssessment
  tags: AutoTags
  recommendations: string[]
  relatedItems: Array<{
    itemId: string
    similarity: number
    relationship: string
  }>
}

export class ContentAnalysisService {
  private llmService: LLMService
  private embeddingService: EmbeddingService

  constructor(private userId: string) {
    this.llmService = new LLMService(userId)
    this.embeddingService = new EmbeddingService(userId)
  }

  /**
   * Perform comprehensive content analysis
   */
  async analyzeContent(
    itemId: string,
    content: string
  ): Promise<ContentInsights> {
    const startTime = Date.now()

    // Run analysis tasks in parallel for efficiency
    const [summary, quality, tags, relatedItems] = await Promise.all([
      this.generateSummary(content),
      this.assessQuality(content),
      this.generateAutoTags(content),
      this.findRelatedItems(itemId, content),
    ])

    // Generate recommendations based on analysis
    const recommendations = await this.generateRecommendations(
      summary,
      quality,
      tags
    )

    // Store results in database
    await this.storeAnalysisResults(itemId, summary, quality, tags)

    const processingTime = Date.now() - startTime

    return {
      summary,
      quality,
      tags: {
        ...tags,
        metadata: {
          ...tags.metadata,
          processingTime,
        },
      },
      recommendations,
      relatedItems,
    }
  }

  /**
   * Generate AI-powered content summary
   */
  async generateSummary(content: string): Promise<ContentSummary> {
    try {
      const prompt = `
Analyze the following content and provide a comprehensive summary with extracted insights.

Content to analyze:
${content}

Please provide a JSON response with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the main content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "entities": ["Entity 1", "Entity 2", "Entity 3"],
  "concepts": ["Concept 1", "Concept 2", "Concept 3"],
  "complexity": "simple|moderate|complex",
  "readabilityScore": 0.8,
  "sentimentScore": 0.1,
  "language": "en",
  "wordCount": ${content.split(/\s+/).length}
}

Guidelines:
- Summary should capture the essence and purpose
- Key points should be the most important takeaways
- Entities include people, places, technologies, tools mentioned
- Concepts include abstract ideas, methodologies, principles
- Complexity: simple (basic instructions), moderate (multi-step processes), complex (advanced technical content)
- Readability: 0-1 score (1 = very easy to read)
- Sentiment: -1 to 1 (-1 = negative, 0 = neutral, 1 = positive)
- Extract actual language from content`

      const response = await this.llmService.generateResponse(prompt, {
        model: process.env.OPENAI_DEFAULT_MODEL || "gpt-5-mini-2025-08-07",
        temperature: 0.3,
        maxTokens: 1000,
      })

      const parsed = JSON.parse(this.cleanJsonResponse(response))

      return {
        summary: parsed.summary || "No summary generated",
        keyPoints: parsed.keyPoints || [],
        entities: parsed.entities || [],
        concepts: parsed.concepts || [],
        complexity: parsed.complexity || "moderate",
        readabilityScore: parsed.readabilityScore || 0.5,
        sentimentScore: parsed.sentimentScore || 0,
        language: parsed.language || "en",
        wordCount: parsed.wordCount || content.split(/\s+/).length,
        confidence: 0.8, // Base confidence for AI analysis
      }
    } catch (error) {
      console.error("Error generating summary:", error)
      return this.generateFallbackSummary(content)
    }
  }

  /**
   * Assess content quality using AI
   */
  async assessQuality(content: string): Promise<QualityAssessment> {
    try {
      const prompt = `
Assess the quality of the following content across multiple dimensions.

Content to assess:
${content}

Please provide a JSON response with quality scores (0-1) and detailed feedback:
{
  "overallScore": 0.85,
  "clarity": 0.9,
  "completeness": 0.8,
  "accuracy": 0.85,
  "relevance": 0.9,
  "structure": 0.8,
  "feedback": ["Specific feedback point 1", "Specific feedback point 2"],
  "suggestions": ["Improvement suggestion 1", "Improvement suggestion 2"],
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"]
}

Quality dimensions:
- Clarity: How clear and understandable is the content?
- Completeness: Does it cover the topic thoroughly?
- Accuracy: Is the information correct and up-to-date?
- Relevance: Is the content relevant to its stated purpose?
- Structure: Is the content well-organized and formatted?

Provide specific, actionable feedback and suggestions.`

      const response = await this.llmService.generateResponse(prompt, {
        model: process.env.OPENAI_DEFAULT_MODEL || "gpt-5-mini-2025-08-07",
        temperature: 0.4,
        maxTokens: 1200,
      })

      const parsed = JSON.parse(this.cleanJsonResponse(response))

      return {
        overallScore: parsed.overallScore || 0.6,
        clarity: parsed.clarity || 0.6,
        completeness: parsed.completeness || 0.6,
        accuracy: parsed.accuracy || 0.6,
        relevance: parsed.relevance || 0.6,
        structure: parsed.structure || 0.6,
        feedback: parsed.feedback || [],
        suggestions: parsed.suggestions || [],
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
      }
    } catch (error) {
      console.error("Error assessing quality:", error)
      return this.generateFallbackQualityAssessment(content)
    }
  }

  /**
   * Generate automatic tags using AI
   */
  async generateAutoTags(content: string): Promise<AutoTags> {
    const startTime = Date.now()

    try {
      const prompt = `
Generate relevant tags for the following content to help with organization and discovery.

Content:
${content}

Please provide a JSON response with categorized tags:
{
  "tags": [
    {"name": "machine-learning", "confidence": 0.9, "category": "topic"},
    {"name": "python", "confidence": 0.8, "category": "domain"},
    {"name": "intermediate", "confidence": 0.7, "category": "complexity"},
    {"name": "tutorial", "confidence": 0.9, "category": "format"},
    {"name": "education", "confidence": 0.8, "category": "purpose"}
  ],
  "suggestedCategories": ["AI/ML", "Programming", "Education"]
}

Tag categories:
- topic: Main subject matter (e.g., "machine-learning", "web-development")
- domain: Technical domain or field (e.g., "python", "javascript", "design")
- complexity: Difficulty level (e.g., "beginner", "intermediate", "advanced")
- format: Content type (e.g., "tutorial", "reference", "example", "template")
- purpose: Intended use (e.g., "education", "production", "debugging")

Generate 5-15 relevant tags with high confidence scores (0.6+).
Suggest 2-5 broad categories for folder organization.`

      const response = await this.llmService.generateResponse(prompt, {
        model: process.env.OPENAI_DEFAULT_MODEL || "gpt-5-mini-2025-08-07",
        temperature: 0.4,
        maxTokens: 800,
      })

      const parsed = JSON.parse(this.cleanJsonResponse(response))
      const processingTime = Date.now() - startTime

      return {
        tags: parsed.tags || [],
        suggestedCategories: parsed.suggestedCategories || [],
        metadata: {
          processingTime,
          method: "ai-powered",
        },
      }
    } catch (error) {
      console.error("Error generating auto tags:", error)
      return this.generateFallbackTags(content, startTime)
    }
  }

  /**
   * Find related items using semantic similarity
   */
  async findRelatedItems(
    itemId: string,
    content: string
  ): Promise<
    Array<{
      itemId: string
      similarity: number
      relationship: string
    }>
  > {
    try {
      // Use semantic search to find similar items
      const searchResults = await this.embeddingService.semanticSearch(
        content.substring(0, 500), // Use first 500 chars for search
        this.userId,
        {
          limit: 10,
          threshold: 0.6,
        }
      )

      // Filter out the current item and analyze relationships
      const relatedItems = searchResults.results
        .filter((result) => result.itemId !== itemId)
        .map((result) => ({
          itemId: result.itemId,
          similarity: result.similarity,
          relationship: this.determineRelationship(result.similarity),
        }))

      return relatedItems.slice(0, 5) // Return top 5 related items
    } catch (error) {
      console.error("Error finding related items:", error)
      return []
    }
  }

  /**
   * Determine relationship type based on similarity score
   */
  private determineRelationship(similarity: number): string {
    if (similarity > 0.9) return "Very similar"
    if (similarity > 0.8) return "Highly related"
    if (similarity > 0.7) return "Related"
    if (similarity > 0.6) return "Somewhat related"
    return "Loosely related"
  }

  /**
   * Generate recommendations based on analysis results
   */
  private async generateRecommendations(
    summary: ContentSummary,
    quality: QualityAssessment,
    tags: AutoTags
  ): Promise<string[]> {
    const recommendations: string[] = []

    // Quality-based recommendations
    if (quality.overallScore < 0.7) {
      recommendations.push(
        "Consider improving content quality based on the assessment feedback"
      )
    }
    if (quality.clarity < 0.6) {
      recommendations.push(
        "Improve clarity by simplifying language and adding more explanations"
      )
    }
    if (quality.structure < 0.6) {
      recommendations.push(
        "Better organize content with clear headings and logical flow"
      )
    }

    // Complexity-based recommendations
    if (summary.complexity === "complex" && summary.readabilityScore < 0.5) {
      recommendations.push(
        "Consider breaking down complex content into smaller, digestible sections"
      )
    }

    // Tag-based recommendations
    const hasComplexityTag = tags.tags.some(
      (tag) => tag.category === "complexity"
    )
    if (!hasComplexityTag) {
      recommendations.push(
        "Add complexity level tags to help users find appropriate content"
      )
    }

    const hasPurposeTag = tags.tags.some((tag) => tag.category === "purpose")
    if (!hasPurposeTag) {
      recommendations.push("Add purpose tags to clarify the intended use case")
    }

    // Content-specific recommendations
    if (summary.wordCount < 50) {
      recommendations.push(
        "Consider expanding the content to provide more value and context"
      )
    }
    if (summary.wordCount > 2000) {
      recommendations.push(
        "Consider breaking long content into multiple focused pieces"
      )
    }

    return recommendations.slice(0, 5) // Limit to top 5 recommendations
  }

  /**
   * Store analysis results in database
   */
  private async storeAnalysisResults(
    itemId: string,
    summary: ContentSummary,
    quality: QualityAssessment,
    tags: AutoTags
  ): Promise<void> {
    try {
      // Store content summary
      await prisma.contentSummary.upsert({
        where: { itemId },
        update: {
          summary: summary.summary,
          keyPoints: JSON.stringify(summary.keyPoints),
          entities: JSON.stringify(summary.entities),
          concepts: JSON.stringify(summary.concepts),
          complexity: summary.complexity,
          readabilityScore: summary.readabilityScore,
          sentimentScore: summary.sentimentScore,
          language: summary.language,
          wordCount: summary.wordCount,
          confidence: summary.confidence,
          createdBy: "ai-content-analysis",
          updatedAt: new Date(),
        },
        create: {
          itemId,
          summary: summary.summary,
          keyPoints: JSON.stringify(summary.keyPoints),
          entities: JSON.stringify(summary.entities),
          concepts: JSON.stringify(summary.concepts),
          complexity: summary.complexity,
          readabilityScore: summary.readabilityScore,
          sentimentScore: summary.sentimentScore,
          language: summary.language,
          wordCount: summary.wordCount,
          confidence: summary.confidence,
          createdBy: "ai-content-analysis",
        },
      })

      // Create suggested tags if they don't exist
      for (const tag of tags.tags) {
        if (tag.confidence >= 0.7) {
          // Only create high-confidence tags
          await this.createTagIfNotExists(tag.name, tag.category)
          await this.associateTagWithItem(itemId, tag.name, tag.confidence)
        }
      }
    } catch (error) {
      console.error("Error storing analysis results:", error)
    }
  }

  /**
   * Create tag if it doesn't exist
   */
  private async createTagIfNotExists(
    tagName: string,
    category: string
  ): Promise<void> {
    try {
      await prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: {
          name: tagName,
          description: `Auto-generated ${category} tag`,
          color: this.getColorForCategory(category),
        },
      })
    } catch (error) {
      console.error("Error creating tag:", error)
    }
  }

  /**
   * Associate tag with item
   */
  private async associateTagWithItem(
    itemId: string,
    tagName: string,
    confidence: number
  ): Promise<void> {
    try {
      const tag = await prisma.tag.findUnique({
        where: { name: tagName },
      })

      if (tag) {
        await prisma.itemTag.upsert({
          where: {
            itemId_tagId: {
              itemId,
              tagId: tag.id,
            },
          },
          update: {},
          create: {
            itemId,
            tagId: tag.id,
          },
        })
      }
    } catch (error) {
      console.error("Error associating tag with item:", error)
    }
  }

  /**
   * Get color for tag category
   */
  private getColorForCategory(category: string): string {
    const colors: Record<string, string> = {
      topic: "#3B82F6", // Blue
      domain: "#10B981", // Green
      complexity: "#F59E0B", // Amber
      format: "#8B5CF6", // Purple
      purpose: "#EF4444", // Red
    }
    return colors[category] || "#6B7280" // Gray as default
  }

  /**
   * Clean JSON response from LLM
   */
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks if present
    let cleaned = response.replace(/```json\s*|\s*```/g, "")

    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim()

    // If response doesn't start with {, try to find the JSON part
    if (!cleaned.startsWith("{")) {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleaned = jsonMatch[0]
      }
    }

    return cleaned
  }

  /**
   * Generate fallback summary when AI fails
   */
  private generateFallbackSummary(content: string): ContentSummary {
    const words = content.split(/\s+/)
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0)

    return {
      summary:
        sentences[0]?.substring(0, 200) + "..." ||
        "Content summary not available",
      keyPoints: sentences.slice(0, 3).map((s) => s.trim()),
      entities: [],
      concepts: [],
      complexity:
        words.length > 500
          ? "complex"
          : words.length > 100
          ? "moderate"
          : "simple",
      readabilityScore: 0.5,
      sentimentScore: 0,
      language: "en",
      wordCount: words.length,
      confidence: 0.3,
    }
  }

  /**
   * Generate fallback quality assessment when AI fails
   */
  private generateFallbackQualityAssessment(
    content: string
  ): QualityAssessment {
    const words = content.split(/\s+/)
    const hasStructure = content.includes("\n") || content.includes("#")

    return {
      overallScore: 0.6,
      clarity: words.length > 20 ? 0.6 : 0.4,
      completeness: words.length > 100 ? 0.7 : 0.5,
      accuracy: 0.6, // Cannot assess without AI
      relevance: 0.6,
      structure: hasStructure ? 0.7 : 0.4,
      feedback: ["Automated assessment only - consider manual review"],
      suggestions: ["Add more structure and detail if needed"],
      strengths: ["Content is present"],
      weaknesses: ["Limited analysis available"],
    }
  }

  /**
   * Generate fallback tags when AI fails
   */
  private generateFallbackTags(content: string, startTime: number): AutoTags {
    const words = content.toLowerCase().split(/\s+/)
    const tags: AutoTags["tags"] = []

    // Simple keyword-based tagging
    const keywords = {
      python: { category: "domain" as const, confidence: 0.8 },
      javascript: { category: "domain" as const, confidence: 0.8 },
      react: { category: "domain" as const, confidence: 0.8 },
      api: { category: "topic" as const, confidence: 0.7 },
      database: { category: "topic" as const, confidence: 0.7 },
      tutorial: { category: "format" as const, confidence: 0.6 },
      example: { category: "format" as const, confidence: 0.6 },
    }

    for (const [keyword, info] of Object.entries(keywords)) {
      if (words.some((word) => word.includes(keyword))) {
        tags.push({
          name: keyword,
          confidence: info.confidence,
          category: info.category,
        })
      }
    }

    return {
      tags,
      suggestedCategories: ["General"],
      metadata: {
        processingTime: Date.now() - startTime,
        method: "keyword-based-fallback",
      },
    }
  }

  /**
   * Get content analysis for an item
   */
  async getContentAnalysis(itemId: string): Promise<ContentInsights | null> {
    try {
      const summary = await prisma.contentSummary.findUnique({
        where: { itemId },
      })

      if (!summary) return null

      // For now, return stored summary data
      // In a full implementation, you'd also retrieve quality and tags
      return {
        summary: {
          summary: summary.summary,
          keyPoints: JSON.parse(summary.keyPoints),
          entities: JSON.parse(summary.entities),
          concepts: JSON.parse(summary.concepts),
          complexity: summary.complexity as "simple" | "moderate" | "complex",
          readabilityScore: summary.readabilityScore || 0,
          sentimentScore: summary.sentimentScore || 0,
          language: summary.language || "en",
          wordCount: summary.wordCount || 0,
          confidence: summary.confidence || 0,
        },
        quality: {
          overallScore: 0.7, // Placeholder
          clarity: 0.7,
          completeness: 0.7,
          accuracy: 0.7,
          relevance: 0.7,
          structure: 0.7,
          feedback: [],
          suggestions: [],
          strengths: [],
          weaknesses: [],
        },
        tags: {
          tags: [],
          suggestedCategories: [],
          metadata: { processingTime: 0, method: "stored" },
        },
        recommendations: [],
        relatedItems: [],
      }
    } catch (error) {
      console.error("Error getting content analysis:", error)
      return null
    }
  }

  /**
   * Batch analyze multiple items
   */
  async batchAnalyzeContent(
    items: Array<{ id: string; content: string }>,
    batchSize: number = 5
  ): Promise<void> {
    const batches = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }

    for (const batch of batches) {
      const promises = batch.map(async (item) => {
        try {
          await this.analyzeContent(item.id, item.content)
        } catch (error) {
          console.error(`Error analyzing item ${item.id}:`, error)
        }
      })

      await Promise.all(promises)

      // Add delay between batches to avoid rate limiting
      if (batches.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }
}

export default ContentAnalysisService
