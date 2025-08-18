import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { optimizationPipeline } from '@/lib/pipeline/optimization-pipeline';

const DuplicateDetectionSchema = z.object({
  collectionId: z.string().optional(),
  threshold: z.number().min(0).max(1).optional(),
});

const SimilarityScoringSchema = z.object({
  sourceItemId: z.string(),
  targetItemIds: z.array(z.string()),
  algorithm: z.enum(['semantic', 'syntactic', 'hybrid']).optional(),
});

// POST /api/pipeline/duplicates - Run duplicate detection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'detect';

    try {
      switch (mode) {
        case 'detect': {
          const validatedData = DuplicateDetectionSchema.parse(body);
          
          await optimizationPipeline.runDuplicateDetection(
            session.user.id,
            validatedData.collectionId
          );

          return NextResponse.json({
            success: true,
            message: 'Duplicate detection started',
            collectionId: validatedData.collectionId,
          });
        }

        case 'similarity': {
          const validatedData = SimilarityScoringSchema.parse(body);
          
          await optimizationPipeline.runSimilarityScoring(
            validatedData.sourceItemId,
            validatedData.targetItemIds,
            session.user.id
          );

          return NextResponse.json({
            success: true,
            message: 'Similarity scoring started',
            sourceItemId: validatedData.sourceItemId,
            targetCount: validatedData.targetItemIds.length,
          });
        }

        default:
          return NextResponse.json(
            { error: 'Invalid mode' },
            { status: 400 }
          );
      }
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
  } catch (error) {
    console.error('Error running duplicate detection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}