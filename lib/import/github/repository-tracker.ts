import { Octokit } from '@octokit/rest'
import { prisma } from '../../db'

export interface RepositoryState {
  owner: string
  name: string
  branch: string
  lastCommitSha: string
  lastCommitDate: Date
  totalFiles: number
  importedFiles: number
  lastSyncAt: Date
}

export interface FileChange {
  path: string
  status: 'added' | 'modified' | 'removed' | 'renamed'
  sha: string
  previousSha?: string
  newPath?: string // For renamed files
}

export interface IncrementalSyncResult {
  changedFiles: FileChange[]
  newFiles: FileChange[]
  modifiedFiles: FileChange[]
  removedFiles: FileChange[]
  renamedFiles: FileChange[]
  hasChanges: boolean
  lastCommitSha: string
  syncedAt: Date
}

export class GitHubRepositoryTracker {
  private octokit: Octokit
  
  constructor(githubToken: string) {
    this.octokit = new Octokit({
      auth: githubToken,
      request: {
        timeout: 30000
      }
    })
  }

  /**
   * Get or create repository tracking record
   */
  async getOrCreateRepositoryTracker(
    owner: string,
    name: string,
    branch: string = 'main',
    userId: string
  ): Promise<{ sourceId: string; lastCommitSha: string | null; isFirstSync: boolean }> {
    // Check if we already have a source record for this repository
    let source = await prisma.source.findFirst({
      where: {
        type: 'github',
        repoOwner: owner,
        repoName: name,
        branch
      }
    })

    let isFirstSync = false

    if (!source) {
      // Get current commit SHA from GitHub
      const currentCommitSha = await this.getCurrentCommitSha(owner, name, branch)
      
      // Create new source record
      source = await prisma.source.create({
        data: {
          type: 'github',
          url: `https://github.com/${owner}/${name}`,
          repoOwner: owner,
          repoName: name,
          branch,
          pathGlob: '**/*.md,**/*.json,**/*.yaml,**/*.yml,**/*.xml,**/*.prompt,**/*.agent,**/*.af,**/*.mdc',
          lastImportedAt: null,
          metadata: JSON.stringify({
            lastCommitSha: currentCommitSha,
            createdBy: userId,
            trackingEnabled: true
          })
        }
      })
      isFirstSync = true
    }

    const metadata = source.metadata ? JSON.parse(source.metadata) : {}
    const lastCommitSha = metadata.lastCommitSha || null

    return {
      sourceId: source.id,
      lastCommitSha,
      isFirstSync
    }
  }

  /**
   * Get current commit SHA for a branch
   */
  async getCurrentCommitSha(owner: string, name: string, branch: string = 'main'): Promise<string> {
    try {
      const response = await this.octokit.rest.repos.getBranch({
        owner,
        repo: name,
        branch
      })
      return response.data.commit.sha
    } catch (error) {
      throw new Error(`Failed to get current commit SHA: ${error.message}`)
    }
  }

  /**
   * Get file changes between two commits
   */
  async getFileChangesSince(
    owner: string,
    name: string,
    branch: string,
    sinceCommitSha: string,
    fileExtensions: string[] = ['.md', '.txt', '.json', '.yml', '.yaml', '.prompt', '.agent', '.af', '.mdc']
  ): Promise<IncrementalSyncResult> {
    try {
      const currentCommitSha = await this.getCurrentCommitSha(owner, name, branch)
      
      // If no changes (same commit), return empty result
      if (sinceCommitSha === currentCommitSha) {
        return {
          changedFiles: [],
          newFiles: [],
          modifiedFiles: [],
          removedFiles: [],
          renamedFiles: [],
          hasChanges: false,
          lastCommitSha: currentCommitSha,
          syncedAt: new Date()
        }
      }

      // Get comparison between commits
      const comparison = await this.octokit.rest.repos.compareCommitsWithBasehead({
        owner,
        repo: name,
        basehead: `${sinceCommitSha}...${currentCommitSha}`
      })

      const allChanges: FileChange[] = []
      
      // Process each changed file
      for (const file of comparison.data.files || []) {
        // Filter by file extensions
        const fileExt = '.' + file.filename.split('.').pop()?.toLowerCase()
        if (!fileExtensions.includes(fileExt)) continue

        const change: FileChange = {
          path: file.filename,
          status: file.status as FileChange['status'],
          sha: file.sha || '',
          previousSha: file.previous_filename ? undefined : file.sha
        }

        // Handle renamed files
        if (file.status === 'renamed' && file.previous_filename) {
          change.newPath = file.filename
          change.path = file.previous_filename
        }

        allChanges.push(change)
      }

      // Categorize changes
      const newFiles = allChanges.filter(f => f.status === 'added')
      const modifiedFiles = allChanges.filter(f => f.status === 'modified')
      const removedFiles = allChanges.filter(f => f.status === 'removed')
      const renamedFiles = allChanges.filter(f => f.status === 'renamed')

      return {
        changedFiles: allChanges,
        newFiles,
        modifiedFiles,
        removedFiles,
        renamedFiles,
        hasChanges: allChanges.length > 0,
        lastCommitSha: currentCommitSha,
        syncedAt: new Date()
      }
    } catch (error) {
      throw new Error(`Failed to get file changes: ${error.message}`)
    }
  }

  /**
   * Update repository tracking after successful sync
   */
  async updateRepositoryState(
    sourceId: string,
    commitSha: string,
    importedFileCount: number
  ): Promise<void> {
    try {
      // Get current metadata
      const source = await prisma.source.findUnique({
        where: { id: sourceId }
      })

      if (!source) {
        throw new Error('Source not found')
      }

      const metadata = source.metadata ? JSON.parse(source.metadata) : {}
      
      // Update metadata with sync information
      const updatedMetadata = {
        ...metadata,
        lastCommitSha: commitSha,
        lastSyncAt: new Date().toISOString(),
        importedFileCount,
        syncHistory: [
          ...(metadata.syncHistory || []).slice(-10), // Keep last 10 syncs
          {
            commitSha,
            syncedAt: new Date().toISOString(),
            filesImported: importedFileCount
          }
        ]
      }

      // Update source record
      await prisma.source.update({
        where: { id: sourceId },
        data: {
          lastImportedAt: new Date(),
          metadata: JSON.stringify(updatedMetadata)
        }
      })
    } catch (error) {
      console.error('Failed to update repository state:', error)
      throw error
    }
  }

  /**
   * Get repository sync status
   */
  async getRepositorySyncStatus(
    sourceId: string
  ): Promise<{
    isUpToDate: boolean
    lastSyncAt: Date | null
    lastCommitSha: string | null
    currentCommitSha: string | null
    behindBy: number
    pendingChanges: boolean
  }> {
    try {
      const source = await prisma.source.findUnique({
        where: { id: sourceId }
      })

      if (!source) {
        throw new Error('Source not found')
      }

      const metadata = source.metadata ? JSON.parse(source.metadata) : {}
      const lastCommitSha = metadata.lastCommitSha

      if (!lastCommitSha) {
        return {
          isUpToDate: false,
          lastSyncAt: null,
          lastCommitSha: null,
          currentCommitSha: null,
          behindBy: 0,
          pendingChanges: true
        }
      }

      const currentCommitSha = await this.getCurrentCommitSha(
        source.repoOwner!,
        source.repoName!,
        source.branch || 'main'
      )

      const isUpToDate = lastCommitSha === currentCommitSha
      
      let behindBy = 0
      if (!isUpToDate) {
        // Get commit count between last sync and current
        const comparison = await this.octokit.rest.repos.compareCommitsWithBasehead({
          owner: source.repoOwner!,
          repo: source.repoName!,
          basehead: `${lastCommitSha}...${currentCommitSha}`
        })
        behindBy = comparison.data.ahead_by || 0
      }

      return {
        isUpToDate,
        lastSyncAt: metadata.lastSyncAt ? new Date(metadata.lastSyncAt) : source.lastImportedAt,
        lastCommitSha,
        currentCommitSha,
        behindBy,
        pendingChanges: !isUpToDate
      }
    } catch (error) {
      console.error('Failed to get repository sync status:', error)
      throw error
    }
  }

  /**
   * Check if repository has changes since last sync
   */
  async hasRepositoryChanged(
    owner: string,
    name: string,
    branch: string,
    lastCommitSha: string
  ): Promise<boolean> {
    try {
      const currentCommitSha = await this.getCurrentCommitSha(owner, name, branch)
      return currentCommitSha !== lastCommitSha
    } catch (error) {
      console.warn('Failed to check repository changes:', error)
      return false // Assume no changes on error
    }
  }

  /**
   * Get list of tracked repositories for a user
   */
  async getTrackedRepositories(userId: string): Promise<Array<{
    sourceId: string
    owner: string
    name: string
    branch: string
    url: string
    lastSyncAt: Date | null
    isUpToDate: boolean
    behindBy: number
  }>> {
    try {
      const sources = await prisma.source.findMany({
        where: {
          type: 'github',
          imports: {
            some: {
              userId
            }
          }
        },
        include: {
          imports: {
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      const repositories = []
      
      for (const source of sources) {
        if (!source.repoOwner || !source.repoName) continue
        
        try {
          const syncStatus = await this.getRepositorySyncStatus(source.id)
          
          repositories.push({
            sourceId: source.id,
            owner: source.repoOwner,
            name: source.repoName,
            branch: source.branch || 'main',
            url: source.url || `https://github.com/${source.repoOwner}/${source.repoName}`,
            lastSyncAt: syncStatus.lastSyncAt,
            isUpToDate: syncStatus.isUpToDate,
            behindBy: syncStatus.behindBy
          })
        } catch (error) {
          console.warn(`Failed to get sync status for ${source.repoOwner}/${source.repoName}:`, error)
          // Include repository with unknown status
          repositories.push({
            sourceId: source.id,
            owner: source.repoOwner,
            name: source.repoName,
            branch: source.branch || 'main',
            url: source.url || `https://github.com/${source.repoOwner}/${source.repoName}`,
            lastSyncAt: source.lastImportedAt,
            isUpToDate: false,
            behindBy: 0
          })
        }
      }

      return repositories
    } catch (error) {
      console.error('Failed to get tracked repositories:', error)
      throw error
    }
  }

  /**
   * Delete repository tracking
   */
  async deleteRepositoryTracking(sourceId: string): Promise<void> {
    try {
      await prisma.source.delete({
        where: { id: sourceId }
      })
    } catch (error) {
      console.error('Failed to delete repository tracking:', error)
      throw error
    }
  }
}

export const createRepositoryTracker = (githubToken: string) => new GitHubRepositoryTracker(githubToken)