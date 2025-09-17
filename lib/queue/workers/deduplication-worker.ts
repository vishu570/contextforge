// @ts-nocheck
import { z } from "zod"
import { prisma } from "../../db"
import { LLMService } from "../../llm"
import { JobProgress, JobResult, JobType } from "../types"
import { BaseWorker } from "./base-worker"

const DeduplicationJobDataSchema = z.object({
  userId: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      name: z.string(),
    })
  ),
  threshold: z.number().min(0).max(1).default(0.8),
  metadata: z.record(z.any()).optional(),
})

type DeduplicationJobData = z.infer<typeof DeduplicationJobDataSchema>

interface SimilarityResult {
  itemId1: string
  itemId2: string
  similarity: number
  type: "exact" | "semantic" | "structural"
  confidence: number
}

export class DeduplicationWorker extends BaseWorker<DeduplicationJobData> {
  private llmService: LLMService

  constructor() {
    super(JobType.DEDUPLICATION, 1) // Single concurrent job for deduplication
    this.llmService = new LLMService()
  }

  async process(
    data: DeduplicationJobData,
    progress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    const validatedData = DeduplicationJobDataSchema.parse(data)

    await progress({
      percentage: 10,
      message: "Starting deduplication analysis...",
    })

    try {
      const items = validatedData.items
      const duplicateGroups: Array<{
        canonical: string
        duplicates: string[]
        similarity: number
      }> = []
      const similarities: SimilarityResult[] = []

      // Step 1: Exact matching
      await progress({
        percentage: 20,
        message: "Checking for exact duplicates...",
      })

      const exactDuplicates = this.findExactDuplicates(items)
      similarities.push(...exactDuplicates)

      // Step 2: Structural similarity
      await progress({
        percentage: 40,
        message: "Analyzing structural similarities...",
      })

      const structuralSimilarities = await this.findStructuralSimilarities(
        items
      )
      similarities.push(...structuralSimilarities)

      // Step 3: Semantic similarity
      await progress({
        percentage: 60,
        message: "Computing semantic similarities...",
      })

      const semanticSimilarities = await this.findSemanticSimilarities(
        items,
        validatedData.threshold
      )
      similarities.push(...semanticSimilarities)

      // Step 4: Group duplicates
      await progress({
        percentage: 80,
        message: "Grouping duplicates...",
      })

      const groups = this.groupDuplicates(
        items,
        similarities,
        validatedData.threshold
      )

      // Step 5: Update database
      await progress({
        percentage: 90,
        message: "Updating duplicate relationships...",
      })

      await this.updateDuplicateRelationships(groups)

      await progress({
        percentage: 100,
        message: "Deduplication completed successfully",
      })

      return {
        success: true,
        data: {
          totalItems: items.length,
          duplicateGroups: groups.length,
          totalDuplicates: groups.reduce(
            (sum, group) => sum + group.duplicates.length,
            0
          ),
          similarities: similarities.length,
          groups,
        },
      }
    } catch (error) {
      throw new Error(
        `Deduplication failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  private findExactDuplicates(
    items: Array<{ id: string; content: string; name: string }>
  ): SimilarityResult[] {
    const results: SimilarityResult[] = []
    const contentMap = new Map<string, string[]>()

    // Group items by normalized content
    items.forEach((item) => {
      const normalizedContent = this.normalizeContent(item.content)
      if (!contentMap.has(normalizedContent)) {
        contentMap.set(normalizedContent, [])
      }
      contentMap.get(normalizedContent)!.push(item.id)
    })

    // Find groups with multiple items (exact duplicates)
    contentMap.forEach((itemIds) => {
      if (itemIds.length > 1) {
        for (let i = 0; i < itemIds.length - 1; i++) {
          for (let j = i + 1; j < itemIds.length; j++) {
            results.push({
              itemId1: itemIds[i],
              itemId2: itemIds[j],
              similarity: 1.0,
              type: "exact",
              confidence: 1.0,
            })
          }
        }
      }
    })

    return results
  }

  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "")
      .trim()
  }

  private async findStructuralSimilarities(
    items: Array<{ id: string; content: string; name: string }>
  ): Promise<SimilarityResult[]> {
    const results: SimilarityResult[] = []

    for (let i = 0; i < items.length - 1; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const similarity = this.calculateStructuralSimilarity(
          items[i].content,
          items[j].content
        )

        if (similarity > 0.7) {
          // High structural similarity threshold
          results.push({
            itemId1: items[i].id,
            itemId2: items[j].id,
            similarity,
            type: "structural",
            confidence: 0.8,
          })
        }
      }
    }

    return results
  }

  private calculateStructuralSimilarity(
    content1: string,
    content2: string
  ): number {
    const structure1 = this.extractStructure(content1)
    const structure2 = this.extractStructure(content2)

    // Compare structural elements
    let commonElements = 0
    let totalElements = Math.max(
      structure1.elements.length,
      structure2.elements.length
    )

    if (totalElements === 0) return 0

    // Count common structural patterns
    structure1.elements.forEach((element) => {
      if (structure2.elements.includes(element)) {
        commonElements++
      }
    })

    const elementSimilarity = commonElements / totalElements

    // Compare lengths (normalized)
    const lengthSimilarity =
      1 -
      Math.abs(structure1.length - structure2.length) /
        Math.max(structure1.length, structure2.length)

    // Combined similarity
    return elementSimilarity * 0.7 + lengthSimilarity * 0.3
  }

  private extractStructure(content: string): {
    elements: string[]
    length: number
  } {
    const elements: string[] = []

    // Check for various structural elements
    if (/^\d+\./m.test(content)) elements.push("numbered_list")
    if (/^[-*+]/m.test(content)) elements.push("bullet_list")
    if (/^#{1,6}/m.test(content)) elements.push("headers")
    if (/\{\{.*?\}\}/g.test(content)) elements.push("variables")
    if (/```[\s\S]*?```/g.test(content)) elements.push("code_blocks")
    if (/\[.*?\]\(.*?\)/g.test(content)) elements.push("links")
    if (/^\s*\|.*\|\s*$/m.test(content)) elements.push("tables")

    return {
      elements,
      length: content.length,
    }
  }

  private async findSemanticSimilarities(
    items: Array<{ id: string; content: string; name: string }>,
    threshold: number
  ): Promise<SimilarityResult[]> {
    const results: SimilarityResult[] = []

    // For performance, we'll use a simpler approach for now
    // In production, you might want to use embedding models
    for (let i = 0; i < items.length - 1; i++) {
      for (let j = i + 1; j < items.length; j++) {
        try {
          const similarity = await this.calculateSemanticSimilarity(
            items[i],
            items[j]
          )

          if (similarity > threshold) {
            results.push({
              itemId1: items[i].id,
              itemId2: items[j].id,
              similarity,
              type: "semantic",
              confidence: 0.7,
            })
          }
        } catch (error) {
          console.warn(
            `Failed to calculate semantic similarity between ${items[i].id} and ${items[j].id}:`,
            error
          )
        }
      }
    }

    return results
  }

  private async calculateSemanticSimilarity(
    item1: { id: string; content: string; name: string },
    item2: { id: string; content: string; name: string }
  ): Promise<number> {
    // Simple approach using LLM to compare semantic similarity
    const prompt = `Compare the semantic similarity of these two content pieces on a scale of 0.0 to 1.0.
Return only a number between 0.0 and 1.0.

Content 1:
${item1.content.substring(0, 500)}

Content 2:
${item2.content.substring(0, 500)}

Consider:
- Similar intent or purpose
- Overlapping concepts
- Similar functionality
- Related domains

Return only the similarity score as a decimal:`

    try {
      const response = await this.llmService.generateResponse(prompt, {
        model: process.env.OPENAI_DEFAULT_MODEL || "gpt-5-mini-2025-08-07",
        maxTokens: 10,
        userId: item1.id, // This is a bit of a hack - we don't have userId in the items
      })

      const similarity = parseFloat(response.trim())
      return isNaN(similarity) ? 0 : Math.max(0, Math.min(1, similarity))
    } catch (error) {
      // Fallback to simple text similarity
      return this.calculateTextSimilarity(item1.content, item2.content)
    }
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter((word) => words2.has(word)))
    const union = new Set([...words1, ...words2])

    return union.size > 0 ? intersection.size / union.size : 0
  }

  private groupDuplicates(
    items: Array<{ id: string; content: string; name: string }>,
    similarities: SimilarityResult[],
    threshold: number
  ): Array<{ canonical: string; duplicates: string[]; similarity: number }> {
    const groups: Array<{
      canonical: string
      duplicates: string[]
      similarity: number
    }> = []
    const processed = new Set<string>()

    // Sort similarities by score (highest first)
    const sortedSimilarities = similarities
      .filter((s) => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)

    sortedSimilarities.forEach((similarity) => {
      if (
        !processed.has(similarity.itemId1) &&
        !processed.has(similarity.itemId2)
      ) {
        // Create new group
        const canonical = this.selectCanonical(
          items.find((i) => i.id === similarity.itemId1)!,
          items.find((i) => i.id === similarity.itemId2)!
        )

        const duplicate =
          canonical.id === similarity.itemId1
            ? similarity.itemId2
            : similarity.itemId1

        groups.push({
          canonical: canonical.id,
          duplicates: [duplicate],
          similarity: similarity.similarity,
        })

        processed.add(similarity.itemId1)
        processed.add(similarity.itemId2)
      } else if (
        processed.has(similarity.itemId1) &&
        !processed.has(similarity.itemId2)
      ) {
        // Add to existing group where itemId1 is already processed
        const existingGroup = groups.find(
          (g) =>
            g.canonical === similarity.itemId1 ||
            g.duplicates.includes(similarity.itemId1)
        )
        if (
          existingGroup &&
          !existingGroup.duplicates.includes(similarity.itemId2)
        ) {
          existingGroup.duplicates.push(similarity.itemId2)
          processed.add(similarity.itemId2)
        }
      } else if (
        !processed.has(similarity.itemId1) &&
        processed.has(similarity.itemId2)
      ) {
        // Add to existing group where itemId2 is already processed
        const existingGroup = groups.find(
          (g) =>
            g.canonical === similarity.itemId2 ||
            g.duplicates.includes(similarity.itemId2)
        )
        if (
          existingGroup &&
          !existingGroup.duplicates.includes(similarity.itemId1)
        ) {
          existingGroup.duplicates.push(similarity.itemId1)
          processed.add(similarity.itemId1)
        }
      }
    })

    return groups
  }

  private selectCanonical(
    item1: { id: string; content: string; name: string },
    item2: { id: string; content: string; name: string }
  ): { id: string; content: string; name: string } {
    // Prefer longer, more detailed content
    if (item1.content.length > item2.content.length * 1.2) return item1
    if (item2.content.length > item1.content.length * 1.2) return item2

    // Prefer better names
    if (item1.name.length > item2.name.length) return item1
    if (item2.name.length > item1.name.length) return item2

    // Default to first item
    return item1
  }

  private async updateDuplicateRelationships(
    groups: Array<{
      canonical: string
      duplicates: string[]
      similarity: number
    }>
  ): Promise<void> {
    for (const group of groups) {
      // Mark canonical item
      await prisma.item.update({
        where: { id: group.canonical },
        data: { isCanonical: true },
      })

      // Mark duplicates and link to canonical
      for (const duplicateId of group.duplicates) {
        await prisma.item.update({
          where: { id: duplicateId },
          data: {
            isDuplicate: true,
            canonicalId: group.canonical,
          },
        })
      }
    }
  }
}
