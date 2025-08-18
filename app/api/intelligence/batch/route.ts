import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmbeddingService } from '@/lib/embeddings';
import ContentAnalysisService from '@/lib/ai/content-analysis';
import { jobQueue, JobType } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      operation, 
      itemIds = [], 
      options = {} 
    } = body;

    if (!operation || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Operation and item IDs are required' },
        { status: 400 }
      );
    }

    // Get items to process
    const { prisma } = await import('@/lib/db');
    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        userId: session.user.id,
      },
      select: {
        id: true,
        content: true,
        name: true,
      },
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No valid items found' },
        { status: 404 }
      );
    }

    let jobIds: string[] = [];

    switch (operation) {
      case 'generate_embeddings':
        const embeddingService = new EmbeddingService(session.user.id);
        const batchSize = options.batchSize || 10;
        
        // Process in batches
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const jobId = await jobQueue.addJob(JobType.BATCH_IMPORT, {
            userId: session.user.id,
            operation: 'embeddings',
            items: batch.map(item => ({ id: item.id, content: item.content })),
            providerId: options.providerId,
          });
          jobIds.push(jobId);
        }
        break;

      case 'analyze_content':
        const analysisService = new ContentAnalysisService(session.user.id);
        
        for (const item of items) {
          const jobId = await jobQueue.addJob(JobType.QUALITY_ASSESSMENT, {
            userId: session.user.id,
            itemId: item.id,
            content: item.content,
          });
          jobIds.push(jobId);
        }
        break;

      case 'similarity_scoring':
        const jobId = await jobQueue.addJob(JobType.SIMILARITY_SCORING, {
          userId: session.user.id,
          itemIds: items.map(item => item.id),
          algorithm: options.algorithm || 'cosine',
          threshold: options.threshold || 0.7,
        });
        jobIds.push(jobId);
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported operation' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      jobIds,
      message: `Started batch ${operation} for ${items.length} items`,
    });
  } catch (error) {
    console.error('Error starting batch operation:', error);
    return NextResponse.json(
      { error: 'Failed to start batch operation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const jobIds = url.searchParams.get('jobIds')?.split(',') || [];

    if (jobIds.length === 0) {
      return NextResponse.json(
        { error: 'Job IDs are required' },
        { status: 400 }
      );
    }

    const jobStatuses = await Promise.all(
      jobIds.map(async (jobId) => {
        const job = await jobQueue.getJobStatus(jobId);
        return {
          jobId,
          status: job?.status || 'not_found',
          progress: await jobQueue.getJobProgress(jobId),
          error: job?.error,
          completedAt: job?.completedAt,
        };
      })
    );

    return NextResponse.json({
      jobs: jobStatuses,
    });
  } catch (error) {
    console.error('Error retrieving batch job status:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve job status' },
      { status: 500 }
    );
  }
}