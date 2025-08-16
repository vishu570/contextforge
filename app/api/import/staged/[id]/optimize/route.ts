import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LLMService } from '@/lib/llm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const itemId = resolvedParams.id;

    // Find the item
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        userId: user.id,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const llmService = new LLMService(user.id);
    const optimizations = [];

    // Check if any API keys are configured
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
    });

    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'No LLM API keys configured. Please add API keys in Settings.' },
        { status: 400 }
      );
    }

    // Generate optimizations for different models
    const targetModels = ['openai', 'anthropic', 'gemini'] as const;
    
    for (const targetModel of targetModels) {
      try {
        const optimization = await llmService.optimizeForModel(
          item.content,
          targetModel
        );
        
        // Store optimization in database
        const optimizationRecord = await prisma.optimization.create({
          data: {
            itemId: item.id,
            targetModel,
            optimizedContent: optimization.optimizedContent,
            confidence: optimization.confidence,
            status: 'suggested',
            metadata: JSON.stringify({
              suggestions: optimization.suggestions,
              generatedAt: new Date().toISOString(),
            }),
            createdBy: 'system',
          },
        });

        optimizations.push({
          id: optimizationRecord.id,
          targetModel,
          optimizedContent: optimization.optimizedContent,
          suggestions: optimization.suggestions,
          confidence: optimization.confidence,
        });
      } catch (error) {
        console.error(`Failed to optimize for ${targetModel}:`, error);
        // Continue with other models even if one fails
      }
    }

    if (optimizations.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any optimizations' },
        { status: 500 }
      );
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        itemId: item.id,
        action: 'optimize',
        entityType: 'item',
        metadata: JSON.stringify({
          optimizationsGenerated: optimizations.length,
          targetModels: optimizations.map(opt => opt.targetModel),
          generatedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      optimizations,
    });
  } catch (error) {
    console.error('Error generating optimizations:', error);
    return NextResponse.json(
      { error: 'Failed to generate optimizations' },
      { status: 500 }
    );
  }
}