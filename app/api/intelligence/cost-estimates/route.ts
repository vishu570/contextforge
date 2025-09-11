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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, models = [] } = body;

    if (!content || !Array.isArray(models) || models.length === 0) {
      return NextResponse.json(
        { error: 'Content and models array are required' },
        { status: 400 }
      );
    }

    const optimizer = new ModelOptimizer(user.id);
    const estimates = await optimizer.getCostEstimates(content, models);

    return NextResponse.json({
      success: true,
      estimates,
    });
  } catch (error) {
    console.error('Error calculating cost estimates:', error);
    return NextResponse.json(
      { error: 'Failed to calculate cost estimates' },
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const content = url.searchParams.get('content');
    const maxCost = parseFloat(url.searchParams.get('maxCost') || '0');
    const prioritizeQuality = url.searchParams.get('prioritizeQuality') === 'true';
    const requiresLargeContext = url.searchParams.get('requiresLargeContext') === 'true';

    if (!content) {
      return NextResponse.json(
        { error: 'Content parameter is required' },
        { status: 400 }
      );
    }

    const optimizer = new ModelOptimizer(user.id);
    const recommendations = await optimizer.getModelRecommendations(content, {
      maxCost: maxCost > 0 ? maxCost : undefined,
      prioritizeQuality,
      requiresLargeContext,
    });

    return NextResponse.json({
      recommendations,
    });
  } catch (error) {
    console.error('Error getting model recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get model recommendations' },
      { status: 500 }
    );
  }
}