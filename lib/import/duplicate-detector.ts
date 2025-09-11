import { prisma } from "../db"
import { EmbeddingService } from "../embeddings"

export interface DuplicateMatch {
  existingItemId: string
  similarity: number
  duplicateType: "exact" | "semantic" | "structural"
  confidence: number
  shouldMerge: boolean
  canonicalId?: string
}

export interface DuplicateDetectionOptions {
  threshold: number // 0.8 = 80%
  enableSemanticCheck: boolean
  enableStructuralCheck: boolean
  enableExactCheck: boolean
  maxCandidates: number
}

export class ImportDuplicateDetector {
  private embeddingService: EmbeddingService

  constructor(userId: string) {
    this.embeddingService = new EmbeddingService(userId)
  }

  /**
   * Check if incoming content is a duplicate of existing items
   */
  async checkForDuplicates(
    content: string,
    name: string,
    userId: string,
    options: Partial<DuplicateDetectionOptions> = {}
  ): Promise<DuplicateMatch[]> {
    const config: DuplicateDetectionOptions = {
      threshold: 0.8, // 80% similarity threshold
      enableSemanticCheck: true,
      enableStructuralCheck: true,
      enableExactCheck: true,
      maxCandidates: 5,
      ...options,
    }

    const matches: DuplicateMatch[] = []

    try {
      // Step 1: Exact content match (fastest)
      if (config.enableExactCheck) {
        const exactMatches = await this.findExactDuplicates(content, userId)
        matches.push(...exactMatches)

        // If we found exact matches, no need for other checks
        if (exactMatches.length > 0) {
          return matches
        }
      }

      // Step 2: Structural similarity check
      if (config.enableStructuralCheck) {
        const structuralMatches = await this.findStructuralDuplicates(
          content,
          name,
          userId,
          config.threshold,
          config.maxCandidates
        )
        matches.push(...structuralMatches)
      }

      // Step 3: Semantic similarity check (most expensive)
      if (config.enableSemanticCheck) {
        const semanticMatches = await this.findSemanticDuplicates(
          content,
          userId,
          config.threshold,
          config.maxCandidates,
          matches.map((m) => m.existingItemId) // Exclude already found duplicates
        )
        matches.push(...semanticMatches)
      }

      // Sort by similarity score (highest first) and remove duplicates
      return this.deduplicateMatches(matches, config.maxCandidates)
    } catch (error) {
      console.error("Duplicate detection failed:", error)
      return []
    }
  }

  /**
   * Find exact content duplicates
   */
  private async findExactDuplicates(
    content: string,
    userId: string
  ): Promise<DuplicateMatch[]> {
    const normalizedContent = this.normalizeContent(content)

    const exactMatches = await prisma.item.findMany({
      where: {
        userId,
        content: normalizedContent,
      },
      select: {
        id: true,
        name: true,
        content: true,
        isCanonical: true,
        canonicalId: true,
      },
    })

    return exactMatches.map((item) => ({
      existingItemId: item.id,
      similarity: 1.0,
      duplicateType: "exact" as const,
      confidence: 1.0,
      shouldMerge: true,
      canonicalId: item.isCanonical ? item.id : item.canonicalId || item.id,
    }))
  }

  /**
   * Find structural duplicates using pattern matching
   */
  private async findStructuralDuplicates(
    content: string,
    name: string,
    userId: string,
    threshold: number,
    maxCandidates: number
  ): Promise<DuplicateMatch[]> {
    const contentStructure = this.extractStructure(content)

    // Get items with similar structure patterns
    const candidates = await prisma.item.findMany({
      where: {
        userId,
        // Look for items with similar content length (within 50% range)
        content: {
          contains: "", // All items, will filter by length
        },
      },
      select: {
        id: true,
        name: true,
        content: true,
        isCanonical: true,
        canonicalId: true,
      },
      take: maxCandidates * 5, // Get more candidates to filter
    })

    const matches: DuplicateMatch[] = []

    for (const candidate of candidates) {
      const candidateStructure = this.extractStructure(candidate.content)
      const similarity = this.calculateStructuralSimilarity(
        contentStructure,
        candidateStructure
      )

      if (similarity >= threshold) {
        matches.push({
          existingItemId: candidate.id,
          similarity,
          duplicateType: "structural",
          confidence: 0.8,
          shouldMerge: similarity > 0.9,
          canonicalId: candidate.isCanonical
            ? candidate.id
            : candidate.canonicalId || candidate.id,
        })
      }
    }

    return matches.slice(0, maxCandidates)
  }

  /**
   * Find semantic duplicates using embeddings
   */
  private async findSemanticDuplicates(
    content: string,
    userId: string,
    threshold: number,
    maxCandidates: number,
    excludeItemIds: string[] = []
  ): Promise<DuplicateMatch[]> {
    try {
      // Generate embedding for the new content
      const embeddingResult = await this.embeddingService.generateEmbedding(
        content
      )

      // Find similar items using semantic search
      const similarities = await this.embeddingService.findSimilarItems(
        embeddingResult.embedding,
        userId,
        {
          limit: maxCandidates * 2,
          threshold,
          algorithm: "cosine",
          excludeItemIds,
        }
      )

      // Get item details for the similar items
      const itemIds = similarities.map((s) => s.itemId)
      const items = await prisma.item.findMany({
        where: {
          id: { in: itemIds },
          userId,
        },
        select: {
          id: true,
          name: true,
          isCanonical: true,
          canonicalId: true,
        },
      })

      const itemLookup = new Map(items.map((item) => [item.id, item]))

      return similarities
        .map((sim) => {
          const item = itemLookup.get(sim.itemId)
          if (!item) return null

          return {
            existingItemId: sim.itemId,
            similarity: sim.similarity,
            duplicateType: "semantic" as const,
            confidence: 0.85,
            shouldMerge: sim.similarity > 0.9,
            canonicalId: item.isCanonical
              ? item.id
              : item.canonicalId || item.id,
          }
        })
        .filter((match): match is NonNullable<typeof match> => match !== null)
        .slice(0, maxCandidates)
    } catch (error) {
      console.warn("Semantic duplicate detection failed:", error)
      return []
    }
  }

  /**
   * Extract structural patterns from content
   */
  private extractStructure(content: string): {
    elements: string[]
    length: number
    wordCount: number
    lineCount: number
    hasCode: boolean
    hasLinks: boolean
    hasHeaders: boolean
  } {
    const elements: string[] = []
    const lines = content.split("\n")

    // Detect structural patterns
    if (/^\d+\./m.test(content)) elements.push("numbered_list")
    if (/^[-*+]\s/m.test(content)) elements.push("bullet_list")
    if (/^#{1,6}\s/m.test(content)) elements.push("headers")
    if (/\{\{.*?\}\}/g.test(content)) elements.push("variables")
    if (/```[\s\S]*?```/g.test(content)) elements.push("code_blocks")
    if (/\[.*?\]\(.*?\)/g.test(content)) elements.push("links")
    if (/^\s*\|.*\|\s*$/m.test(content)) elements.push("tables")
    if (/^>\s/m.test(content)) elements.push("quotes")

    return {
      elements,
      length: content.length,
      wordCount: content.split(/\s+/).length,
      lineCount: lines.length,
      hasCode: /```|`[^`]+`/.test(content),
      hasLinks: /\[.*?\]\(.*?\)/.test(content),
      hasHeaders: /^#{1,6}\s/.test(content),
    }
  }

  /**
   * Calculate structural similarity between two content structures
   */
  private calculateStructuralSimilarity(
    struct1: ReturnType<typeof this.extractStructure>,
    struct2: ReturnType<typeof this.extractStructure>
  ): number {
    // Element similarity
    const commonElements = struct1.elements.filter((e) =>
      struct2.elements.includes(e)
    ).length
    const totalElements = Math.max(
      struct1.elements.length,
      struct2.elements.length
    )
    const elementSimilarity =
      totalElements > 0 ? commonElements / totalElements : 0

    // Length similarity (normalized)
    const lengthSimilarity =
      1 -
      Math.abs(struct1.length - struct2.length) /
        Math.max(struct1.length, struct2.length)

    // Word count similarity
    const wordSimilarity =
      1 -
      Math.abs(struct1.wordCount - struct2.wordCount) /
        Math.max(struct1.wordCount, struct2.wordCount)

    // Line count similarity
    const lineSimilarity =
      1 -
      Math.abs(struct1.lineCount - struct2.lineCount) /
        Math.max(struct1.lineCount, struct2.lineCount)

    // Feature similarity
    let featureSimilarity = 0
    let featureCount = 0

    if (struct1.hasCode === struct2.hasCode) featureSimilarity += 1
    featureCount++

    if (struct1.hasLinks === struct2.hasLinks) featureSimilarity += 1
    featureCount++

    if (struct1.hasHeaders === struct2.hasHeaders) featureSimilarity += 1
    featureCount++

    featureSimilarity = featureCount > 0 ? featureSimilarity / featureCount : 0

    // Weighted combination
    return (
      elementSimilarity * 0.3 +
      lengthSimilarity * 0.2 +
      wordSimilarity * 0.2 +
      lineSimilarity * 0.15 +
      featureSimilarity * 0.15
    )
  }

  /**
   * Normalize content for exact matching
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "")
      .trim()
  }

  /**
   * Remove duplicate matches and sort by similarity
   */
  private deduplicateMatches(
    matches: DuplicateMatch[],
    maxCandidates: number
  ): DuplicateMatch[] {
    const seen = new Set<string>()
    const uniqueMatches = matches.filter((match) => {
      if (seen.has(match.existingItemId)) return false
      seen.add(match.existingItemId)
      return true
    })

    return uniqueMatches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxCandidates)
  }

  /**
   * Get duplicate detection summary for import review
   */
  async getDuplicateSummary(
    stagedItemId: string,
    userId: string
  ): Promise<{
    hasDuplicates: boolean
    duplicateCount: number
    highestSimilarity: number
    recommendedAction: "import" | "merge" | "skip" | "review"
    matches: DuplicateMatch[]
  }> {
    // This would be called after duplicate detection to provide summary
    // For now, return a basic structure
    return {
      hasDuplicates: false,
      duplicateCount: 0,
      highestSimilarity: 0,
      recommendedAction: "import",
      matches: [],
    }
  }
}

export const createDuplicateDetector = (userId: string) =>
  new ImportDuplicateDetector(userId)
