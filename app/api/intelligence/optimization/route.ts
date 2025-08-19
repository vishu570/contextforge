import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

import ModelOptimizer from '@/lib/models/optimizers';

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
    const { 
      itemId,
      content, 
      targetModel, 
      maxTokenBudget,
      prioritizeQuality = false,
      aggressiveOptimization = false,
      preserveFormatting = true
    } = body;

    if (!content || !targetModel) {
      return NextResponse.json(
        { error: 'Content and target model are required' },
        { status: 400 }
      );
    }

    const optimizer = new ModelOptimizer(user.id);
    
    const result = await optimizer.optimizeForModel(content, targetModel, {
      maxTokenBudget,
      prioritizeQuality,
      aggressiveOptimization,
      preserveFormatting,
    });

    // Store optimization if itemId provided
    if (itemId) {
      await optimizer.storeOptimization(itemId, result);
    }

    return NextResponse.json({
      success: true,
      optimization: {
        optimizedContent: result.optimizedContent,
        originalTokens: result.originalTokens,
        optimizedTokens: result.optimizedTokens,
        tokenSavings: result.tokenSavings,
        costSavings: result.costSavings,
        qualityScore: result.qualityScore,
        strategiesApplied: result.strategiesApplied,
        targetModel: result.targetModel,
      },
    });
  } catch (error) {
    console.error('Error optimizing content:', error);
    return NextResponse.json(
      { error: 'Failed to optimize content' },
      { status: 500 }
    );
  }
}

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

    const url = new URL(request.url);
    const itemId = url.searchParams.get('itemId');
    const targetModel = url.searchParams.get('targetModel');

    if (!itemId || !targetModel) {
      return NextResponse.json(
        { error: 'Item ID and target model are required' },
        { status: 400 }
      );
    }

    const optimizer = new ModelOptimizer(user.id);
    const optimization = await optimizer.getOptimization(itemId, targetModel);

    if (!optimization) {
      return NextResponse.json(
        { error: 'Optimization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      optimization: {
        optimizedContent: optimization.optimizedContent,
        originalTokens: optimization.originalTokens,
        optimizedTokens: optimization.optimizedTokens,
        tokenSavings: optimization.tokenSavings,
        costSavings: optimization.costSavings,
        qualityScore: optimization.qualityScore,
        strategiesApplied: optimization.strategiesApplied,
        targetModel: optimization.targetModel,
      },
    });
  } catch (error) {
    console.error('Error retrieving optimization:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve optimization' },
      { status: 500 }
    );
  }
}