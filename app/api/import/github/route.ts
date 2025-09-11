import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/db'
import { getUserFromToken } from '../../../../lib/auth'
import { GitHubProcessor } from '../../../../lib/import/github/realProcessor'
import { updateProgress } from '@/lib/import/progress'

// Request validation schema with backward compatibility
const githubImportRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  // New API format
  filters: z.object({
    fileExtensions: z.array(z.string()).optional().default(['.md', '.txt', '.json', '.yml', '.yaml']),
    paths: z.array(z.string()).optional(),
    excludePaths: z.array(z.string()).optional().default(['node_modules', '.git'])
  }).optional().default({
    fileExtensions: ['.md', '.txt', '.json', '.yml', '.yaml'],
    excludePaths: ['node_modules', '.git']
  }),
  autoCategorie: z.boolean().optional().default(true),
  collectionId: z.string().optional(),
  // Backward compatibility with old frontend format
  branch: z.string().optional().default('main'),
  pathGlob: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = githubImportRequestSchema.parse(body)
    
    // Handle backward compatibility for pathGlob -> filters conversion
    if (validatedData.pathGlob && !validatedData.filters?.fileExtensions?.length) {
      const extensions = validatedData.pathGlob
        .split(',')
        .map(p => p.trim().replace('**/*', '').replace('*', ''))
        .filter(ext => ext.startsWith('.'));
      
      validatedData.filters = {
        ...validatedData.filters,
        fileExtensions: extensions.length ? extensions : ['.md', '.txt', '.json', '.yml', '.yaml']
      };
    }

    // Validate GitHub URL
    const url = new URL(validatedData.url)
    if (!url.hostname.includes('github.com')) {
      return NextResponse.json(
        { error: 'URL must be a GitHub repository or file URL' },
        { status: 400 }
      )
    }

    // Get user from token
    const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const tokenPayload = await getUserFromToken(token)
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const user = tokenPayload

    // Validate collection exists if specified
    if (validatedData.collectionId) {
      const collection = await prisma.collection.findFirst({
        where: {
          id: validatedData.collectionId,
          userId: user.id
        }
      })

      if (!collection) {
        return NextResponse.json(
          { error: 'Collection not found' },
          { status: 404 }
        )
      }
    }

    // Parse GitHub URL to extract repo information
    const pathParts = url.pathname.split('/').filter(Boolean)
    if (pathParts.length < 2) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      )
    }

    const repoOwner = pathParts[0]
    const repoName = pathParts[1]

    // Get user's GitHub API key from database
    const githubApiKey = await prisma.apiKey.findFirst({
      where: {
        userId: user.id,
        provider: 'github'
      }
    })

    if (!githubApiKey) {
      return NextResponse.json(
        { error: 'GitHub API key not found. Please add a GitHub token in Settings.' },
        { status: 400 }
      )
    }

    // Decrypt the API key
    const { decryptApiKey } = await import('@/lib/utils')
    const decryptedToken = decryptApiKey(githubApiKey.encryptedKey)

    // Initialize GitHub processor and repository tracker with user's token
    const githubProcessor = new GitHubProcessor(decryptedToken)
    const { createRepositoryTracker } = await import('@/lib/import/github/repository-tracker')
    const repoTracker = createRepositoryTracker(decryptedToken)

    let importRecord: any = null
    let source: any = null

    try {
      // Get or create repository tracking record
      const trackingInfo = await repoTracker.getOrCreateRepositoryTracker(
        repoOwner,
        repoName,
        validatedData.branch || 'main',
        user.id
      )

      // Get the source record
      source = await prisma.source.findUnique({
        where: { id: trackingInfo.sourceId }
      })

      if (!source) {
        throw new Error('Failed to create or find source record')
      }

      // Check if this is an incremental sync
      const isIncrementalSync = !trackingInfo.isFirstSync && trackingInfo.lastCommitSha
      
      if (isIncrementalSync) {
        // Check for changes since last sync
        const changes = await repoTracker.getFileChangesSince(
          repoOwner,
          repoName,
          validatedData.branch || 'main',
          trackingInfo.lastCommitSha!,
          validatedData.filters?.fileExtensions
        )

        if (!changes.hasChanges) {
          // No changes detected, return early
          return NextResponse.json({
            importId: null,
            status: 'up_to_date',
            message: 'Repository is up to date, no changes detected',
            total: 0,
            imported: 0,
            failed: 0,
            stagedItems: 0,
            repository: `${repoOwner}/${repoName}`,
            branch: validatedData.branch,
            lastCommitSha: changes.lastCommitSha
          })
        }
      }

      importRecord = await prisma.import.create({
        data: {
          userId: user.id,
          sourceId: source.id,
          status: 'processing',
          totalFiles: 0,
          processedFiles: 0,
          failedFiles: 0,
          sourceType: 'github_repo',
          sourceUrl: validatedData.url,
          importSettings: JSON.stringify({
            filters: validatedData.filters,
            autoCategorie: validatedData.autoCategorie,
            collectionId: validatedData.collectionId
          }),
          metadata: JSON.stringify({
            repoOwner,
            repoName,
            branch: validatedData.branch
          })
        }
      })

      // Initialize progress tracking
      updateProgress(importRecord.id, {
        status: 'starting',
        progress: 0,
        message: `Starting import from ${repoOwner}/${repoName}`,
        totalFiles: 0,
        processedFiles: 0
      })

      // Import repository using real GitHub API with progress callback
      const importResult = await githubProcessor.importRepository({
        url: validatedData.url,
        branch: validatedData.branch,
        fileExtensions: validatedData.filters?.fileExtensions,
        excludePaths: validatedData.filters?.excludePaths,
      }, (progress) => {
        // Progress callback from GitHubProcessor
        updateProgress(importRecord.id, {
          status: 'processing',
          progress: Math.round((progress.processed / progress.total) * 100),
          message: progress.message,
          totalFiles: progress.total,
          processedFiles: progress.processed,
          currentFile: progress.currentFile
        })
      })

      console.log(`GitHub import result:`, {
        total: importResult.total,
        imported: importResult.imported,
        failed: importResult.failed,
        filesCount: importResult.files.length
      })

      // Update import record with final results
      await prisma.import.update({
        where: { id: importRecord.id },
        data: {
          status: 'completed',
          totalFiles: importResult.total,
          processedFiles: importResult.imported,
          failedFiles: importResult.failed,
          metadata: JSON.stringify({
            repoOwner,
            repoName,
            branch: validatedData.branch,
            errors: importResult.errors
          }),
          completedAt: new Date()
        }
      })

      // Update progress for staging phase
      updateProgress(importRecord.id, {
        status: 'processing',
        progress: 90,
        message: 'Creating staged items for review...',
        totalFiles: importResult.total,
        processedFiles: importResult.imported
      })

      // Create staged items for review with duplicate detection
      const stagedItems = []
      const { createDuplicateDetector } = await import('@/lib/import/duplicate-detector')
      const duplicateDetector = createDuplicateDetector(user.id)
      
      for (let i = 0; i < importResult.files.length; i++) {
        const file = importResult.files[i]
        try {
          // Check for duplicates before creating staged item
          const duplicateMatches = await duplicateDetector.checkForDuplicates(
            file.content,
            file.name,
            user.id,
            {
              threshold: 0.8, // 80% similarity threshold
              enableSemanticCheck: true,
              enableStructuralCheck: true,
              enableExactCheck: true,
              maxCandidates: 3
            }
          )

          const hasDuplicates = duplicateMatches.length > 0
          const highestSimilarity = hasDuplicates ? Math.max(...duplicateMatches.map(m => m.similarity)) : 0
          
          const stagedItem = await prisma.stagedItem.create({
            data: {
              importId: importRecord.id,
              name: file.name,
              originalPath: file.path,
              content: file.content,
              type: file.type as any,
              format: `.${file.name.split('.').pop()}` || '.txt',
              size: file.size,
              metadata: JSON.stringify({
                downloadUrl: file.downloadUrl,
                githubPath: file.path,
                repository: `${repoOwner}/${repoName}`,
                branch: validatedData.branch,
                // Add duplicate detection results
                duplicates: {
                  detected: hasDuplicates,
                  count: duplicateMatches.length,
                  highest_similarity: highestSimilarity,
                  matches: duplicateMatches.map(match => ({
                    item_id: match.existingItemId,
                    similarity: match.similarity,
                    type: match.duplicateType,
                    confidence: match.confidence,
                    should_merge: match.shouldMerge,
                    canonical_id: match.canonicalId
                  }))
                }
              }),
              status: hasDuplicates && highestSimilarity > 0.95 ? 'duplicate_detected' : 'pending'
            }
          })
          stagedItems.push(stagedItem)

          // Update progress during staging
          if (i % 10 === 0 || i === importResult.files.length - 1) {
            const stagingProgress = 90 + Math.round((i / importResult.files.length) * 10)
            updateProgress(importRecord.id, {
              progress: stagingProgress,
              message: `Staging items for review... (${i + 1}/${importResult.files.length})`
            })
          }
        } catch (error) {
          console.error(`Failed to create staged item for ${file.name}:`, error)
        }
      }

      console.log(`Created ${stagedItems.length} staged items for review`)

      // Update repository tracking with current commit SHA
      const currentCommitSha = await repoTracker.getCurrentCommitSha(
        repoOwner,
        repoName,
        validatedData.branch || 'main'
      )
      
      await repoTracker.updateRepositoryState(
        source.id,
        currentCommitSha,
        stagedItems.length
      )

      // Final progress update
      updateProgress(importRecord.id, {
        status: 'completed',
        progress: 100,
        message: `Import completed! ${stagedItems.length} items ready for review`,
        totalFiles: importResult.total,
        processedFiles: importResult.imported
      })

      // Return immediate success response with details
      return NextResponse.json({
        importId: importRecord.id,
        status: 'completed',
        total: importResult.total,
        imported: importResult.imported,
        failed: importResult.failed,
        stagedItems: stagedItems.length,
        errors: importResult.errors.length > 0 ? importResult.errors.slice(0, 5) : undefined,
        repository: `${repoOwner}/${repoName}`,
        branch: validatedData.branch,
        lastCommitSha: currentCommitSha,
        isTracked: true
      })

    } catch (githubError) {
      console.error('GitHub import error:', githubError)
      
      const errorMessage = githubError instanceof Error ? githubError.message : 'Failed to import from GitHub'
      
      // Update progress with error if we have an importRecord
      if (importRecord) {
        updateProgress(importRecord.id, {
          status: 'failed',
          progress: 0,
          message: `Import failed: ${errorMessage}`,
          errors: [errorMessage]
        })

        // Update import record with failure
        await prisma.import.update({
          where: { id: importRecord.id },
          data: {
            status: 'failed',
            errorLog: errorMessage,
            completedAt: new Date(),
            metadata: JSON.stringify({
              repoOwner,
              repoName,
              branch: validatedData.branch,
              error: errorMessage
            })
          }
        })

        return NextResponse.json(
          { 
            error: errorMessage,
            importId: importRecord.id
          },
          { status: 400 }
        )
      } else {
        // Create failed import record for tracking if no importRecord exists
        const failedImportRecord = await prisma.import.create({
          data: {
            userId: user.id,
            sourceId: null,
            status: 'failed',
            totalFiles: 0,
            processedFiles: 0,
            failedFiles: 0,
            sourceType: 'github_repo',
            sourceUrl: validatedData.url,
            errorLog: errorMessage,
            importSettings: JSON.stringify({
              filters: validatedData.filters,
              autoCategorie: validatedData.autoCategorie,
              collectionId: validatedData.collectionId
            }),
            metadata: JSON.stringify({
              repoOwner,
              repoName,
              error: errorMessage
            }),
            completedAt: new Date()
          }
        })

        updateProgress(failedImportRecord.id, {
          status: 'failed',
          progress: 0,
          message: `Import failed: ${errorMessage}`,
          errors: [errorMessage]
        })

        return NextResponse.json(
          { 
            error: errorMessage,
            importId: failedImportRecord.id
          },
          { status: 400 }
        )
      }
    }

  } catch (error) {
    console.error('Import API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    )
  }
}