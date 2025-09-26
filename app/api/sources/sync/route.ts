import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { createRepositoryTracker } from '@/lib/import/github/repository-tracker';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const syncRequestSchema = z.object({
  sourceId: z.string().min(1, 'Source ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = syncRequestSchema.parse(body);

    // Get the source record and verify ownership
    const source = await prisma.source.findFirst({
      where: {
        id: validatedData.sourceId,
        imports: {
          some: {
            userId: user.id,
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (!source.repoOwner || !source.repoName) {
      return NextResponse.json({ error: 'Invalid repository source' }, { status: 400 });
    }

    // Get user's GitHub API key
    const githubApiKey = await prisma.apiKey.findFirst({
      where: {
        userId: user.id,
        provider: 'github',
      },
    });

    if (!githubApiKey) {
      return NextResponse.json(
        { error: 'GitHub API key not found. Please add a GitHub token in Settings.' },
        { status: 400 }
      );
    }

    // Decrypt the API key
    const { decryptApiKey } = await import('@/lib/utils');
    const decryptedToken = decryptApiKey(githubApiKey.encryptedKey);

    // Create repository tracker
    const repoTracker = createRepositoryTracker(decryptedToken);

    // Check sync status
    const syncStatus = await repoTracker.getRepositorySyncStatus(validatedData.sourceId);

    if (syncStatus.isUpToDate) {
      return NextResponse.json({
        status: 'up_to_date',
        message: 'Repository is already up to date',
        syncStatus,
      });
    }

    // Trigger a new import for this repository
    const importUrl = `https://github.com/${source.repoOwner}/${source.repoName}`;

    // Create a new import job (similar to GitHub import route)
    const importRecord = await prisma.import.create({
      data: {
        userId: user.id,
        sourceId: source.id,
        status: 'processing',
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 0,
        sourceType: 'github_repo_sync',
        sourceUrl: importUrl,
        importSettings: JSON.stringify({
          filters: {
            fileExtensions: ['.md', '.txt', '.json', '.yml', '.yaml', '.prompt', '.agent', '.af', '.mdc'],
            excludePaths: ['node_modules', '.git'],
            excludeDocFiles: true,
          },
          autoCategorie: true,
          syncUpdate: true,
        }),
        metadata: JSON.stringify({
          repoOwner: source.repoOwner,
          repoName: source.repoName,
          branch: source.branch || 'main',
          syncTriggered: true,
        }),
      },
    });

    // Start background sync process (we'll return the import ID for progress tracking)
    return NextResponse.json({
      status: 'sync_started',
      importId: importRecord.id,
      message: `Sync started for ${source.repoOwner}/${source.repoName}`,
      repository: `${source.repoOwner}/${source.repoName}`,
      behindBy: syncStatus.behindBy,
    }, { status: 202 });

  } catch (error) {
    console.error('Sync API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}