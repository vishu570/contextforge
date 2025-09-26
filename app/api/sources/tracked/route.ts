import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { createRepositoryTracker } from '@/lib/import/github/repository-tracker';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's GitHub API key
    const githubApiKey = await prisma.apiKey.findFirst({
      where: {
        userId: user.id,
        provider: 'github',
      },
    });

    if (!githubApiKey) {
      return NextResponse.json({
        repositories: [],
        message: 'GitHub API key not found. Add a GitHub token in Settings to track repositories.',
      });
    }

    let repositories = [];
    try {
      // Decrypt the API key
      const { decryptApiKey } = await import('@/lib/utils');
      const decryptedToken = decryptApiKey(githubApiKey.encryptedKey);

      // Create repository tracker
      const repoTracker = createRepositoryTracker(decryptedToken);

      // Get tracked repositories for the user
      repositories = await repoTracker.getTrackedRepositories(user.id);
    } catch (decryptError) {
      console.error('Failed to decrypt GitHub API key:', decryptError);
      return NextResponse.json({
        repositories: [],
        message: 'GitHub API key is invalid or corrupted. Please update your GitHub token in Settings.',
        error: 'decryption_failed',
      });
    }

    return NextResponse.json({
      repositories,
      total: repositories.length,
    });
  } catch (error) {
    console.error('Failed to fetch tracked repositories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracked repositories' },
      { status: 500 }
    );
  }
}