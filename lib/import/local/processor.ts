import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '../../db'
import { parseContent } from '../../parsers'

export interface LocalImportOptions {
  filePaths: string[]
  preserveStructure?: boolean
  filters?: {
    fileExtensions?: string[]
    excludePaths?: string[]
  }
  autoCategorie?: boolean
  collectionId?: string
  userId: string
}

export interface LocalFile {
  path: string
  relativePath: string
  content: string
  stats: {
    size: number
    modified: Date
    isDirectory: boolean
  }
}

export class LocalImportProcessor {
  async processImport(options: LocalImportOptions): Promise<void> {
    const { userId, filePaths, preserveStructure = false, filters = {}, autoCategorie = true, collectionId } = options

    try {
      // Create import record
      const importRecord = await this.createImportRecord(userId, filePaths, options)

      // Update import status to processing
      await this.updateImportStatus(importRecord.id, 'processing')

      // Scan and collect all files
      const files = await this.scanFiles(filePaths, filters)
      
      // Update total file count
      await prisma.import.update({
        where: { id: importRecord.id },
        data: { totalFiles: files.length }
      })

      let processedCount = 0
      let failedCount = 0

      // Create collections based on folder structure if preserveStructure is true
      const collectionMap = new Map<string, string>()
      if (preserveStructure) {
        await this.createCollectionStructure(files, userId, collectionId, collectionMap)
      }

      // Process files
      for (const file of files) {
        try {
          const targetCollectionId = preserveStructure 
            ? collectionMap.get(path.dirname(file.relativePath)) || collectionId
            : collectionId

          await this.processFile(file, {
            userId,
            importId: importRecord.id,
            sourceId: importRecord.sourceId,
            collectionId: targetCollectionId,
            autoCategorie
          })
          processedCount++
        } catch (error) {
          console.error(`Failed to process file ${file.path}:`, error)
          failedCount++
        }

        // Update progress
        await prisma.import.update({
          where: { id: importRecord.id },
          data: {
            processedFiles: processedCount,
            failedFiles: failedCount
          }
        })
      }

      // Complete import
      await this.updateImportStatus(importRecord.id, 'completed', new Date())

    } catch (error) {
      console.error('Local import failed:', error)
      throw error
    }
  }

  private async createImportRecord(userId: string, filePaths: string[], options: LocalImportOptions) {
    // Create source record
    const source = await prisma.source.create({
      data: {
        type: 'file',
        filePath: filePaths.join(','),
        pathGlob: filePaths.length > 1 ? 'multiple' : filePaths[0]
      }
    })

    return prisma.import.create({
      data: {
        userId,
        sourceId: source.id,
        status: 'pending',
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 0,
        sourceType: filePaths.length > 1 ? 'local_folder' : 'local_file',
        sourceUrl: filePaths[0],
        importSettings: JSON.stringify({
          filePaths,
          preserveStructure: options.preserveStructure,
          filters: options.filters,
          autoCategorie: options.autoCategorie,
          collectionId: options.collectionId
        }),
        metadata: JSON.stringify({
          fileCount: filePaths.length,
          basePaths: filePaths
        })
      }
    })
  }

  private async scanFiles(
    filePaths: string[],
    filters: LocalImportOptions['filters'] = {}
  ): Promise<LocalFile[]> {
    const { fileExtensions = ['.md', '.txt', '.json', '.yml', '.yaml'], excludePaths = ['node_modules', '.git', '.DS_Store'] } = filters
    const allFiles: LocalFile[] = []
    const basePath = this.findCommonBasePath(filePaths)

    for (const filePath of filePaths) {
      await this.scanPath(filePath, basePath, allFiles, { fileExtensions, excludePaths })
    }

    return allFiles
  }

  private async scanPath(
    currentPath: string,
    basePath: string,
    files: LocalFile[],
    filters: { fileExtensions: string[]; excludePaths: string[] }
  ): Promise<void> {
    try {
      const stats = await fs.stat(currentPath)
      const relativePath = path.relative(basePath, currentPath)

      // Apply exclude filters
      if (filters.excludePaths.some(exclude => currentPath.includes(exclude))) {
        return
      }

      if (stats.isDirectory()) {
        // Recursively scan directory
        const entries = await fs.readdir(currentPath)
        for (const entry of entries) {
          const entryPath = path.join(currentPath, entry)
          await this.scanPath(entryPath, basePath, files, filters)
        }
      } else {
        // Check file extension filter
        const hasValidExtension = filters.fileExtensions.some(ext => currentPath.endsWith(ext))
        if (!hasValidExtension) return

        try {
          const content = await fs.readFile(currentPath, 'utf-8')
          files.push({
            path: currentPath,
            relativePath,
            content,
            stats: {
              size: stats.size,
              modified: stats.mtime,
              isDirectory: false
            }
          })
        } catch (error) {
          console.warn(`Could not read file ${currentPath}:`, error.message)
        }
      }
    } catch (error) {
      console.warn(`Could not access path ${currentPath}:`, error.message)
    }
  }

  private findCommonBasePath(filePaths: string[]): string {
    if (filePaths.length === 1) {
      const stats = fs.stat(filePaths[0])
      return path.dirname(filePaths[0])
    }

    // Find common directory path
    const pathParts = filePaths.map(p => path.resolve(p).split(path.sep))
    const minLength = Math.min(...pathParts.map(parts => parts.length))
    
    let commonPath = []
    for (let i = 0; i < minLength; i++) {
      const part = pathParts[0][i]
      if (pathParts.every(parts => parts[i] === part)) {
        commonPath.push(part)
      } else {
        break
      }
    }

    return commonPath.join(path.sep) || path.sep
  }

  private async createCollectionStructure(
    files: LocalFile[],
    userId: string,
    rootCollectionId: string | undefined,
    collectionMap: Map<string, string>
  ): Promise<void> {
    // Get unique directory paths
    const directories = new Set<string>()
    files.forEach(file => {
      const dir = path.dirname(file.relativePath)
      if (dir !== '.') {
        directories.add(dir)
      }
    })

    // Sort directories by depth to create parent directories first
    const sortedDirs = Array.from(directories).sort((a, b) => a.split(path.sep).length - b.split(path.sep).length)

    for (const dir of sortedDirs) {
      const dirParts = dir.split(path.sep)
      const dirName = dirParts[dirParts.length - 1]
      const parentDir = dirParts.length > 1 ? dirParts.slice(0, -1).join(path.sep) : null
      const parentId = parentDir ? collectionMap.get(parentDir) : rootCollectionId

      // Create collection for this directory
      const collection = await prisma.collection.create({
        data: {
          userId,
          name: dirName,
          description: `Imported from local directory: ${dir}`,
          parentId,
          path: dir,
          isFolder: true,
          categoryType: 'documentation' // Default category type
        }
      })

      collectionMap.set(dir, collection.id)
    }
  }

  private async processFile(
    file: LocalFile,
    context: {
      userId: string
      importId: string
      sourceId: string | null
      collectionId?: string
      autoCategorie: boolean
    }
  ): Promise<void> {
    const { userId, importId, sourceId, collectionId, autoCategorie } = context

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
        sourceType: 'local',
        sourceMetadata: JSON.stringify({
          originalPath: file.path,
          relativePath: file.relativePath,
          size: file.stats.size,
          modified: file.stats.modified.toISOString()
        }),
        metadata: JSON.stringify({
          importId,
          processed: new Date().toISOString(),
          ...parsedContent.metadata
        })
      }
    })

    // Add to collection if specified
    if (collectionId) {
      await prisma.itemCollection.create({
        data: {
          itemId: item.id,
          collectionId,
          position: 0 // Will be updated with proper ordering later
        }
      })
    }

    // Auto-categorize if enabled
    if (autoCategorie) {
      await this.autoCategoizeItem(item.id, file.content, userId)
    }
  }

  private async autoCategoizeItem(itemId: string, content: string, userId: string): Promise<void> {
    try {
      // Simple rule-based categorization
      const categories = this.extractCategories(content)
      
      for (const categoryName of categories) {
        await prisma.itemCategory.create({
          data: {
            userId,
            itemId,
            categoryName,
            confidence: 0.8, // Rule-based confidence
            source: 'imported',
            isApproved: false
          }
        })
      }
    } catch (error) {
      console.error('Auto-categorization failed:', error)
    }
  }

  private extractCategories(content: string): string[] {
    const categories: string[] = []
    
    // Simple keyword-based categorization
    const keywords = {
      'documentation': ['readme', 'doc', 'guide', 'tutorial', 'how to', 'manual'],
      'configuration': ['config', 'settings', '.env', 'docker', 'yaml', 'json', 'ini'],
      'prompt': ['prompt', 'instruction', 'system:', 'user:', 'assistant:', 'role:'],
      'code': ['function', 'class', 'import', 'export', 'const', 'let', 'var', 'def ', 'public ', 'private '],
      'template': ['template', 'boilerplate', 'scaffold', 'starter', 'example'],
      'note': ['note', 'memo', 'reminder', 'todo', 'task', 'idea']
    }

    const lowerContent = content.toLowerCase()
    
    for (const [category, terms] of Object.entries(keywords)) {
      if (terms.some(term => lowerContent.includes(term))) {
        categories.push(category)
      }
    }

    return categories.slice(0, 3) // Limit to top 3 categories
  }

  private determineItemType(filePath: string, parsedContent: any): string {
    // Check for specific patterns in content to determine type
    const content = parsedContent.content || ''
    const lowerContent = content.toLowerCase()
    const fileName = path.basename(filePath).toLowerCase()

    // Check filename patterns first
    if (fileName.includes('prompt') || fileName.includes('instruction')) {
      return 'prompt'
    }
    
    if (fileName.includes('agent') || fileName.includes('bot')) {
      return 'agent'
    }

    if (fileName.includes('config') || fileName.includes('setting') || fileName.includes('rule')) {
      return 'rule'
    }

    if (fileName.includes('template') || fileName.includes('boilerplate')) {
      return 'template'
    }

    // Check content patterns
    if (lowerContent.includes('system:') || lowerContent.includes('user:') || lowerContent.includes('assistant:')) {
      return 'prompt'
    }
    
    if (lowerContent.includes('agent') && (lowerContent.includes('role') || lowerContent.includes('persona'))) {
      return 'agent'
    }

    // Default based on file extension
    return this.getFileType(filePath)
  }

  private getFileType(filePath: string): string {
    const extension = this.getFileExtension(filePath)
    
    const typeMap: Record<string, string> = {
      '.md': 'snippet',
      '.txt': 'snippet',
      '.json': 'template',
      '.yml': 'rule',
      '.yaml': 'rule',
      '.js': 'snippet',
      '.ts': 'snippet',
      '.py': 'snippet',
      '.sh': 'snippet',
      '.prompt': 'prompt',
      '.agent': 'agent'
    }

    return typeMap[extension] || 'other'
  }

  private extractFileName(filePath: string): string {
    const fileName = path.basename(filePath)
    const dotIndex = fileName.lastIndexOf('.')
    return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName
  }

  private getFileExtension(filePath: string): string {
    const extension = path.extname(filePath)
    return extension || ''
  }

  private async updateImportStatus(importId: string, status: string, completedAt?: Date): Promise<void> {
    await prisma.import.update({
      where: { id: importId },
      data: {
        status,
        ...(completedAt && { completedAt })
      }
    })
  }
}

// Export singleton for reuse
export const localProcessor = new LocalImportProcessor()