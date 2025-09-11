import { Octokit } from "@octokit/rest"
import { prisma } from "../../db"
import { parseContent } from "../../parsers"

export interface GitHubImportOptions {
  url: string
  filters?: {
    fileExtensions?: string[]
    paths?: string[]
    excludePaths?: string[]
  }
  autoCategorie?: boolean
  collectionId?: string
  userId: string
}

export interface GitHubFile {
  path: string
  content: string
  sha: string
  type: string
  size: number
  url: string
}

export class GitHubImportProcessor {
  private octokit: Octokit
  private rateLimitDelay = 1000 // 1 second between requests

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token,
      request: {
        timeout: 30000,
      },
    })
  }

  async processImport(options: GitHubImportOptions): Promise<void> {
    const {
      userId,
      url,
      filters = {},
      autoCategorie = true,
      collectionId,
    } = options

    try {
      // Parse GitHub URL
      const repoInfo = this.parseGitHubUrl(url)
      if (!repoInfo) {
        throw new Error("Invalid GitHub URL")
      }

      // Get import record
      const importRecord = await this.getImportRecord(userId, url)
      if (!importRecord) {
        throw new Error("Import record not found")
      }

      // Update import status to processing
      await this.updateImportStatus(importRecord.id, "processing")

      // Get repository contents
      const files = await this.getRepositoryFiles(repoInfo, filters)

      // Update total file count
      await prisma.import.update({
        where: { id: importRecord.id },
        data: { totalFiles: files.length },
      })

      let processedCount = 0
      let failedCount = 0

      // Process files in batches to avoid rate limits
      const batchSize = 5
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize)

        await Promise.all(
          batch.map(async (file) => {
            try {
              await this.processFile(file, {
                userId,
                importId: importRecord.id,
                sourceId: importRecord.sourceId,
                collectionId,
                autoCategorie,
                repoUrl: url,
              })
              processedCount++
            } catch (error) {
              console.error(`Failed to process file ${file.path}:`, error)
              failedCount++
            }
          })
        )

        // Update progress
        await prisma.import.update({
          where: { id: importRecord.id },
          data: {
            processedFiles: processedCount,
            failedFiles: failedCount,
          },
        })

        // Rate limiting delay
        if (i + batchSize < files.length) {
          await this.delay(this.rateLimitDelay)
        }
      }

      // Complete import
      await this.updateImportStatus(importRecord.id, "completed", new Date())
    } catch (error) {
      console.error("GitHub import failed:", error)

      const importRecord = await this.getImportRecord(userId, url)
      if (importRecord) {
        await prisma.import.update({
          where: { id: importRecord.id },
          data: {
            status: "failed",
            errorLog: error instanceof Error ? error.message : "Unknown error",
            completedAt: new Date(),
          },
        })
      }
      throw error
    }
  }

  private parseGitHubUrl(
    url: string
  ): { owner: string; repo: string; path?: string; branch?: string } | null {
    try {
      const parsedUrl = new URL(url)
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean)

      if (pathParts.length < 2) return null

      const owner = pathParts[0]
      const repo = pathParts[1]

      // Handle tree/branch URLs
      let branch = "main"
      let path = ""

      if (pathParts.length > 3 && pathParts[2] === "tree") {
        branch = pathParts[3]
        path = pathParts.slice(4).join("/")
      } else if (pathParts.length > 3 && pathParts[2] === "blob") {
        branch = pathParts[3]
        path = pathParts.slice(4).join("/")
      }

      return { owner, repo, branch, path }
    } catch {
      return null
    }
  }

  private async getRepositoryFiles(
    repoInfo: { owner: string; repo: string; path?: string; branch?: string },
    filters: GitHubImportOptions["filters"] = {}
  ): Promise<GitHubFile[]> {
    const { owner, repo, branch = "main", path = "" } = repoInfo
    const {
      fileExtensions = [".md", ".txt", ".json", ".yml", ".yaml"],
      excludePaths = ["node_modules", ".git"],
    } = filters

    const allFiles: GitHubFile[] = []

    try {
      // Get repository tree recursively
      const response = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: "true",
      })

      for (const item of response.data.tree) {
        if (item.type !== "blob") continue
        if (!item.path) continue

        // Apply path filters
        if (path && !item.path.startsWith(path)) continue

        // Apply exclude filters
        if (excludePaths.some((exclude) => item.path!.includes(exclude)))
          continue

        // Apply file extension filters
        const hasValidExtension = fileExtensions.some((ext) =>
          item.path!.endsWith(ext)
        )
        if (!hasValidExtension) continue

        // Get file content
        const fileResponse = await this.octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: item.sha!,
        })

        const content = Buffer.from(
          fileResponse.data.content,
          "base64"
        ).toString("utf-8")

        allFiles.push({
          path: item.path,
          content,
          sha: item.sha!,
          type: this.getFileType(item.path),
          size: item.size || 0,
          url: `https://github.com/${owner}/${repo}/blob/${branch}/${item.path}`,
        })

        // Rate limiting
        await this.delay(100)
      }

      return allFiles
    } catch (error) {
      throw new Error(
        `Failed to fetch repository files: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  private async processFile(
    file: GitHubFile,
    context: {
      userId: string
      importId: string
      sourceId: string | null
      collectionId?: string
      autoCategorie: boolean
      repoUrl: string
    }
  ): Promise<void> {
    const { userId, importId, sourceId, collectionId, autoCategorie, repoUrl } =
      context

    // Parse content using existing parsers
    const parsedContent = await parseContent(file.content, file.path)

    // Determine item type based on file extension and content
    const itemType = this.determineItemType(file.path, parsedContent)

    // Create item
    const item = await prisma.item.create({
      data: {
        userId,
        type: itemType,
        name: this.extractFileName(file.path),
        content: parsedContent.content || file.content,
        format: this.getFileExtension(file.path),
        sourceId,
        sourceType: "github",
        sourceMetadata: JSON.stringify({
          path: file.path,
          url: file.url,
          sha: file.sha,
          size: file.size,
          repoUrl,
        }),
        metadata: JSON.stringify({
          importId,
          processed: new Date().toISOString(),
          ...parsedContent.metadata,
        }),
      },
    })

    // Add to collection if specified
    if (collectionId) {
      await prisma.itemCollection.create({
        data: {
          itemId: item.id,
          collectionId,
          position: 0, // Will be updated with proper ordering later
        },
      })
    }

    // Auto-categorize if enabled
    if (autoCategorie) {
      await this.autoCategozeItem(item.id, file.content, userId)
    }
  }

  private async autoCategozeItem(
    itemId: string,
    content: string,
    userId: string
  ): Promise<void> {
    try {
      // Import and initialize AI client for intelligent categorization
      const { aiClient } = await import("../../ai/client")
      await aiClient.initializeFromUser(userId)

      // Use AI for intelligent categorization with fallback to rule-based
      let suggestedCategories: string[] = []
      let confidence = 0.8
      let source = "ai_suggested"
      let aiProvider: string | undefined

      try {
        if (aiClient.getAvailableProviders().length > 0) {
          // Get existing categories to provide context
          const existingCategories = await prisma.category.findMany({
            where: { userId },
            select: { name: true },
          })

          suggestedCategories = await aiClient.categorize(content, {
            maxSuggestions: 5,
            existingCategories: existingCategories.map((c) => c.name),
          })

          aiProvider = aiClient.getAvailableProviders()[0]
          confidence = 0.85 // Higher confidence for AI suggestions
        } else {
          throw new Error("No AI providers available")
        }
      } catch (aiError) {
        console.warn(
          "AI categorization failed, falling back to rule-based:",
          aiError.message
        )
        // Fallback to rule-based categorization
        suggestedCategories = this.extractCategories(content)
        confidence = 0.6
        source = "imported"
        aiProvider = undefined
      }

      // Create or find categories and link to item
      for (const categoryName of suggestedCategories) {
        if (!categoryName || categoryName.trim().length === 0) continue

        // Find or create the category
        let category = await prisma.category.findFirst({
          where: { name: categoryName, userId },
        })

        if (!category) {
          category = await prisma.category.create({
            data: {
              name: categoryName,
              userId,
              description: `Auto-generated category from import`,
              metadata: JSON.stringify({ source: "auto_import" }),
            },
          })
        }

        // Create the item-category relationship
        await prisma.itemCategory.create({
          data: {
            userId,
            itemId,
            categoryId: category.id,
            confidence,
            source,
            aiProvider,
            reasoning:
              source === "ai_suggested"
                ? `AI-suggested category based on content analysis`
                : undefined,
            isApproved: false, // Requires user review
          },
        })
      }
    } catch (error) {
      console.error("Auto-categorization failed:", error)
    }
  }

  private extractCategories(content: string): string[] {
    const categories: string[] = []

    // Simple keyword-based categorization
    const keywords = {
      documentation: ["readme", "doc", "guide", "tutorial", "how to"],
      configuration: ["config", "settings", ".env", "docker", "yaml", "json"],
      code: ["function", "class", "import", "export", "const", "let", "var"],
      test: ["test", "spec", "jest", "mocha", "cypress"],
      api: ["endpoint", "route", "api", "rest", "graphql"],
      database: ["schema", "migration", "query", "sql", "database"],
    }

    const lowerContent = content.toLowerCase()

    for (const [category, terms] of Object.entries(keywords)) {
      if (terms.some((term) => lowerContent.includes(term))) {
        categories.push(category)
      }
    }

    return categories.slice(0, 3) // Limit to top 3 categories
  }

  private getFileType(filePath: string): string {
    const extension = this.getFileExtension(filePath)

    const typeMap: Record<string, string> = {
      ".md": "prompt",
      ".txt": "snippet",
      ".json": "template",
      ".yml": "template",
      ".yaml": "template",
      ".js": "snippet",
      ".ts": "snippet",
      ".py": "snippet",
      ".sh": "snippet",
    }

    return typeMap[extension] || "other"
  }

  private determineItemType(filePath: string, parsedContent: any): string {
    // Check for specific patterns in content to determine type
    const content = parsedContent.content || ""
    const lowerContent = content.toLowerCase()

    if (
      lowerContent.includes("prompt") ||
      lowerContent.includes("instruction")
    ) {
      return "prompt"
    }

    if (lowerContent.includes("agent") || lowerContent.includes("bot")) {
      return "agent"
    }

    if (filePath.includes("config") || filePath.includes("setting")) {
      return "rule"
    }

    // Default based on file extension
    return this.getFileType(filePath)
  }

  private extractFileName(filePath: string): string {
    const parts = filePath.split("/")
    const fileName = parts[parts.length - 1]
    return fileName.split(".")[0] // Remove extension
  }

  private getFileExtension(filePath: string): string {
    const parts = filePath.split(".")
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : ""
  }

  private async getImportRecord(userId: string, url: string) {
    return prisma.import.findFirst({
      where: {
        userId,
        sourceUrl: url,
        status: { in: ["pending", "processing"] },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  private async updateImportStatus(
    importId: string,
    status: string,
    completedAt?: Date
  ): Promise<void> {
    await prisma.import.update({
      where: { id: importId },
      data: {
        status,
        ...(completedAt && { completedAt }),
      },
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Export singleton for reuse
export const githubProcessor = new GitHubImportProcessor()
