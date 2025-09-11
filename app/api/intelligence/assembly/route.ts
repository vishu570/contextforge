import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

import ContextAssemblyEngine from '@/lib/context/assembly';

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
    const { 
      intent,
      query,
      targetAudience,
      useCase,
      domain,
      complexity = 'moderate',
      strategy = 'automatic',
      targetModel,
      maxTokens = 8000,
      maxCost,
      prioritizeQuality = false,
      includeRelated = true,
      diversityWeight = 0.3,
      relevanceThreshold = 0.7,
      templateId
    } = body;

    if (!intent) {
      return NextResponse.json(
        { error: 'Intent is required for context assembly' },
        { status: 400 }
      );
    }

    const assemblyEngine = new ContextAssemblyEngine(user.id);
    
    const context = {
      intent,
      query,
      targetAudience,
      useCase,
      domain,
      complexity,
    };

    const options = {
      strategy,
      targetModel,
      maxTokens,
      maxCost,
      prioritizeQuality,
      includeRelated,
      diversityWeight,
      relevanceThreshold,
      templateId,
    };

    const assembledContext = await assemblyEngine.assembleContext(context, options);

    return NextResponse.json({
      success: true,
      context: {
        content: assembledContext.content,
        metadata: assembledContext.metadata,
        items: assembledContext.items.map(item => ({
          itemId: item.itemId,
          position: item.position,
          relevanceScore: item.relevanceScore,
          includedTokens: item.includedTokens,
          reason: item.reason,
          role: item.role,
        })),
        template: assembledContext.template,
        suggestions: assembledContext.suggestions,
      },
    });
  } catch (error) {
    console.error('Error assembling context:', error);
    return NextResponse.json(
      { error: 'Failed to assemble context' },
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
    const action = url.searchParams.get('action');

    const assemblyEngine = new ContextAssemblyEngine(user.id);

    switch (action) {
      case 'templates':
        const templates = await assemblyEngine.getUserTemplates();
        return NextResponse.json({ templates });

      case 'analytics':
        const days = parseInt(url.searchParams.get('days') || '30');
        const analytics = await assemblyEngine.getAssemblyAnalytics(days);
        return NextResponse.json({ analytics });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error retrieving assembly data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve assembly data' },
      { status: 500 }
    );
  }
}