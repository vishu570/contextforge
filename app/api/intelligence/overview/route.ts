import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import IntelligenceCoordinator from '@/lib/ai/intelligence-coordinator';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const coordinator = new IntelligenceCoordinator(session.user.id);
    const overview = await coordinator.getIntelligenceOverview();

    return NextResponse.json({
      success: true,
      overview,
      features: {
        semanticSearch: {
          description: 'AI-powered semantic search using vector embeddings',
          status: 'active',
          coverage: overview.health.embeddingCoverage,
        },
        contentAnalysis: {
          description: 'Automated content analysis with AI-generated summaries and tags',
          status: 'active',
          coverage: overview.health.analysisCoverage,
        },
        semanticClustering: {
          description: 'Intelligent content clustering using machine learning',
          status: 'active',
          clusters: overview.summary.activeClusters,
        },
        modelOptimization: {
          description: 'AI model-specific content optimization for cost and performance',
          status: 'active',
          optimizations: overview.summary.totalOptimizations,
        },
        contextAssembly: {
          description: 'Intelligent context assembly based on user intent',
          status: 'active',
          recentActivity: overview.recentActivity.length,
        },
        qualityAssessment: {
          description: 'AI-powered content quality assessment and improvement suggestions',
          status: 'active',
          averageQuality: overview.health.averageQuality,
        },
      },
      capabilities: {
        supportedModels: [
          'openai-gpt4',
          'openai-gpt4o',
          'openai-gpt4o-mini',
          'anthropic-claude3-opus',
          'anthropic-claude3-sonnet',
          'anthropic-claude3-haiku',
          'gemini-pro',
          'gemini-pro-1.5',
        ],
        embeddingProviders: [
          'openai-small',
          'openai-large',
          'openai-ada',
        ],
        clusteringAlgorithms: [
          'kmeans',
          'hierarchical',
          'dbscan',
        ],
        assemblyStrategies: [
          'automatic',
          'semantic',
          'manual',
          'hybrid',
        ],
      },
      quickActions: [
        {
          id: 'batch_embed',
          name: 'Generate Embeddings',
          description: 'Generate vector embeddings for semantic search',
          endpoint: '/api/intelligence/batch',
          requiredParams: ['itemIds', 'operation=generate_embeddings'],
        },
        {
          id: 'analyze_content',
          name: 'Analyze Content',
          description: 'Run AI analysis on content for insights and tags',
          endpoint: '/api/intelligence/batch',
          requiredParams: ['itemIds', 'operation=analyze_content'],
        },
        {
          id: 'cluster_items',
          name: 'Cluster Content',
          description: 'Discover content patterns through clustering',
          endpoint: '/api/intelligence/clustering',
          requiredParams: ['algorithm'],
        },
        {
          id: 'smart_assembly',
          name: 'Smart Context Assembly',
          description: 'Assemble intelligent context based on intent',
          endpoint: '/api/intelligence/assembly',
          requiredParams: ['intent'],
        },
        {
          id: 'optimize_content',
          name: 'Optimize for Models',
          description: 'Optimize content for specific AI models',
          endpoint: '/api/intelligence/optimization',
          requiredParams: ['content', 'targetModel'],
        },
      ],
    });
  } catch (error) {
    console.error('Error getting intelligence overview:', error);
    return NextResponse.json(
      { error: 'Failed to get intelligence overview' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, options = {} } = body;

    const coordinator = new IntelligenceCoordinator(session.user.id);

    switch (action) {
      case 'discover_and_organize':
        const result = await coordinator.discoverAndOrganize({
          includeUntagged: options.includeUntagged !== false,
          includeUnclustered: options.includeUnclustered !== false,
          suggestFolders: options.suggestFolders !== false,
          autoTag: options.autoTag !== false,
          clusteringAlgorithm: options.clusteringAlgorithm || 'kmeans',
        });

        return NextResponse.json({
          success: true,
          result,
          message: `Discovered ${result.clusters.length} clusters and generated ${result.newTags} new tags`,
        });

      case 'smart_assembly':
        if (!options.intent) {
          return NextResponse.json(
            { error: 'Intent is required for smart assembly' },
            { status: 400 }
          );
        }

        const assemblyResult = await coordinator.smartAssembly(options.intent, options);

        return NextResponse.json({
          success: true,
          result: assemblyResult,
          message: `Assembled context with ${assemblyResult.context.items.length} items`,
        });

      case 'health_check':
        const overview = await coordinator.getIntelligenceOverview();
        
        return NextResponse.json({
          success: true,
          health: overview.health,
          recommendations: overview.recommendations,
          message: `System health: ${overview.health.systemHealth}`,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing intelligence action:', error);
    return NextResponse.json(
      { error: 'Failed to process intelligence action' },
      { status: 500 }
    );
  }
}