import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { z } from 'zod';
import { optimizationPipeline } from '@/lib/pipeline/optimization-pipeline';

const ProcessItemSchema = z.object({
  itemId: z.string(),
  forceReprocess: z.boolean().optional(),
  targetModels: z.array(z.string()).optional(),
  skipIfOptimized: z.boolean().optional(),
});

const ProcessBatchSchema = z.object({
  itemIds: z.array(z.string()),
  forceReprocess: z.boolean().optional(),
  targetModels: z.array(z.string()).optional(),
  skipIfOptimized: z.boolean().optional(),
});

const ProcessCollectionSchema = z.object({
  collectionId: z.string(),
  forceReprocess: z.boolean().optional(),
  targetModels: z.array(z.string()).optional(),
  skipIfOptimized: z.boolean().optional(),
});

// POST /api/pipeline/process - Process items through optimization pipeline
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value; if (!token) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); } const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'single';

    try {
      switch (mode) {
        case 'single': {
          const validatedData = ProcessItemSchema.parse(body);
          
          await optimizationPipeline.processItem(validatedData.itemId, {
            userId: user.id,
            itemId: validatedData.itemId,
            forceReprocess: validatedData.forceReprocess,
            targetModels: validatedData.targetModels,
            skipIfOptimized: validatedData.skipIfOptimized,
          });

          return NextResponse.json({
            success: true,
            message: 'Item processing started',
            itemId: validatedData.itemId,
          });
        }

        case 'batch': {
          const validatedData = ProcessBatchSchema.parse(body);
          
          // Start batch processing in background
          optimizationPipeline.processBatch(validatedData.itemIds, {
            userId: user.id,
            forceReprocess: validatedData.forceReprocess,
            targetModels: validatedData.targetModels,
            skipIfOptimized: validatedData.skipIfOptimized,
          }).catch(error => {
            console.error('Batch processing error:', error);
          });

          return NextResponse.json({
            success: true,
            message: `Batch processing started for ${validatedData.itemIds.length} items`,
            itemCount: validatedData.itemIds.length,
          });
        }

        case 'collection': {
          const validatedData = ProcessCollectionSchema.parse(body);
          
          // Get all items in collection
          const { prisma } = await import('@/lib/db');
          const items = await prisma.item.findMany({
            where: {
              collections: {
                some: {
                  collectionId: validatedData.collectionId,
                },
              },
              userId: user.id,
            },
            select: { id: true },
          });

          const itemIds = items.map(item => item.id);

          if (itemIds.length === 0) {
            return NextResponse.json({
              success: false,
              message: 'No items found in collection',
            });
          }

          // Start collection processing in background
          optimizationPipeline.processBatch(itemIds, {
            userId: user.id,
            forceReprocess: validatedData.forceReprocess,
            targetModels: validatedData.targetModels,
            skipIfOptimized: validatedData.skipIfOptimized,
          }).catch(error => {
            console.error('Collection processing error:', error);
          });

          return NextResponse.json({
            success: true,
            message: `Collection processing started for ${itemIds.length} items`,
            itemCount: itemIds.length,
            collectionId: validatedData.collectionId,
          });
        }

        default:
          return NextResponse.json(
            { error: 'Invalid processing mode' },
            { status: 400 }
          );
      }
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: validationError.issues },
          { status: 400 }
        );
      }
      throw validationError;
    }
  } catch (error) {
    console.error('Error processing items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}