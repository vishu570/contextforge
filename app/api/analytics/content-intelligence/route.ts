import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/analytics/content-intelligence - Get content intelligence analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '30d';
    const userId = session.user.id;
    
    const timeRangeMs = parseTimeRange(timeRange);
    const startDate = new Date(Date.now() - timeRangeMs);

    const [
      qualityMetrics,
      optimizationImpact,
      duplicateAnalysis,
      semanticInsights,
      contentEvolution
    ] = await Promise.all([
      getQualityMetrics(userId, startDate),
      getOptimizationImpact(userId, startDate),
      getDuplicateAnalysis(userId, startDate),
      getSemanticInsights(userId, startDate),
      getContentEvolution(userId, startDate)
    ]);

    // Generate AI recommendations
    const recommendations = generateRecommendations(
      qualityMetrics,
      optimizationImpact,
      duplicateAnalysis,
      semanticInsights
    );

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      timeRange,
      qualityMetrics,
      optimizationImpact,
      duplicateAnalysis,
      semanticInsights,
      contentEvolution,
      recommendations
    });
  } catch (error) {
    console.error('Content intelligence analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content intelligence analytics' },
      { status: 500 }
    );
  }
}

async function getQualityMetrics(userId: string, startDate: Date) {
  try {
    const [
      qualityData,
      qualityDistribution
    ] = await Promise.all([
      // Average quality metrics
      prisma.contentSummary.aggregate({
        where: {
          item: { userId },
          createdAt: { gte: startDate }
        },
        _avg: {
          readabilityScore: true,
          confidence: true
        },
        _count: true
      }),

      // Quality score distribution
      prisma.contentSummary.findMany({
        where: {
          item: { userId },
          createdAt: { gte: startDate },
          confidence: { not: null }
        },
        select: {
          confidence: true
        }
      })
    ]);

    // Calculate quality distribution ranges
    const scores = qualityDistribution.map(item => (item.confidence || 0) * 10);
    const distribution = [
      { range: '8-10', count: scores.filter(s => s >= 8).length },
      { range: '6-8', count: scores.filter(s => s >= 6 && s < 8).length },
      { range: '4-6', count: scores.filter(s => s >= 4 && s < 6).length },
      { range: '0-4', count: scores.filter(s => s < 4).length }
    ];

    // Simulate quality metrics (in a real implementation, these would be calculated from content analysis)
    const avgReadability = (qualityData._avg.readabilityScore || 0) * 10;
    const avgCoherence = avgReadability * 0.9; // Coherence typically correlates with readability
    const avgRelevance = (qualityData._avg.confidence || 0) * 10;
    const avgCompleteness = avgReadability * 0.95;

    // Calculate quality trend (simplified - compare with previous period)
    const qualityTrend = Math.random() * 10 - 2; // Mock trend data

    return {
      avgReadability,
      avgCoherence,
      avgRelevance,
      avgCompleteness,
      qualityTrend,
      qualityDistribution: distribution
    };
  } catch (error) {
    console.error('Error getting quality metrics:', error);
    return {
      avgReadability: 0,
      avgCoherence: 0,
      avgRelevance: 0,
      avgCompleteness: 0,
      qualityTrend: 0,
      qualityDistribution: []
    };
  }
}

async function getOptimizationImpact(userId: string, startDate: Date) {
  try {
    const [
      optimizationData,
      optimizationsByModel,
      optimizationTrends
    ] = await Promise.all([
      // Overall optimization statistics
      prisma.modelOptimization.aggregate({
        where: {
          item: { userId },
          createdAt: { gte: startDate }
        },
        _count: true,
        _sum: {
          tokenSavings: true,
          costEstimate: true
        },
        _avg: {
          qualityScore: true
        }
      }),

      // Optimizations by target model
      prisma.modelOptimization.groupBy({
        by: ['targetModel'],
        where: {
          item: { userId },
          createdAt: { gte: startDate }
        },
        _count: true
      }),

      // Daily optimization trends
      prisma.modelOptimization.findMany({
        where: {
          item: { userId },
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          status: true,
          tokenSavings: true,
          costEstimate: true,
          qualityScore: true
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const approvedOptimizations = await prisma.modelOptimization.count({
      where: {
        item: { userId },
        createdAt: { gte: startDate },
        status: 'approved'
      }
    });

    // Group trends by day
    const trendsByDay = optimizationTrends.reduce((acc: Record<string, any>, opt) => {
      const day = opt.createdAt.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { date: day, optimizations: 0, savings: 0, quality: 0, count: 0 };
      }
      acc[day].optimizations++;
      acc[day].savings += opt.costEstimate || 0;
      acc[day].quality += opt.qualityScore || 0;
      acc[day].count++;
      return acc;
    }, {});

    const trends = Object.values(trendsByDay).map((day: any) => ({
      ...day,
      quality: day.count > 0 ? day.quality / day.count : 0
    }));

    return {
      totalOptimizations: optimizationData._count,
      approvedOptimizations,
      avgImprovement: optimizationData._avg.qualityScore || 0,
      tokenSavings: optimizationData._sum.tokenSavings || 0,
      costSavings: optimizationData._sum.costEstimate || 0,
      optimizationsByModel: optimizationsByModel.reduce((acc: Record<string, number>, item) => {
        acc[item.targetModel] = item._count;
        return acc;
      }, {}),
      optimizationTrends: trends
    };
  } catch (error) {
    console.error('Error getting optimization impact:', error);
    return {
      totalOptimizations: 0,
      approvedOptimizations: 0,
      avgImprovement: 0,
      tokenSavings: 0,
      costSavings: 0,
      optimizationsByModel: {},
      optimizationTrends: []
    };
  }
}

async function getDuplicateAnalysis(userId: string, startDate: Date) {
  try {
    const [
      totalItems,
      duplicateItems,
      duplicatesByType
    ] = await Promise.all([
      prisma.item.count({
        where: { userId, createdAt: { gte: startDate } }
      }),

      prisma.item.count({
        where: { 
          userId, 
          createdAt: { gte: startDate },
          isDuplicate: true 
        }
      }),

      prisma.item.groupBy({
        by: ['type'],
        where: {
          userId,
          createdAt: { gte: startDate },
          isDuplicate: true
        },
        _count: true
      })
    ]);

    const duplicateRate = totalItems > 0 ? duplicateItems / totalItems : 0;

    // Estimate deduplication savings (simplified calculation)
    const estimatedTokensPerDuplicate = 100; // Average tokens per duplicate
    const estimatedCostPerToken = 0.0001; // Simplified cost estimate
    const deduplicationSavings = duplicateItems * estimatedTokensPerDuplicate * estimatedCostPerToken;

    // Mock duplicate clusters (in a real implementation, these would come from semantic analysis)
    const duplicateClusters = Array.from({ length: Math.min(5, Math.floor(duplicateItems / 2)) }, (_, i) => ({
      id: `cluster_${i}`,
      size: Math.floor(Math.random() * 5) + 2,
      similarity: 0.8 + Math.random() * 0.19,
      examples: [
        `Example duplicate content ${i * 2 + 1}`,
        `Example duplicate content ${i * 2 + 2}`
      ]
    }));

    return {
      totalItems,
      duplicatesDetected: duplicateItems,
      duplicateRate,
      duplicatesByType: duplicatesByType.reduce((acc: Record<string, number>, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {}),
      deduplicationSavings,
      duplicateClusters
    };
  } catch (error) {
    console.error('Error getting duplicate analysis:', error);
    return {
      totalItems: 0,
      duplicatesDetected: 0,
      duplicateRate: 0,
      duplicatesByType: {},
      deduplicationSavings: 0,
      duplicateClusters: []
    };
  }
}

async function getSemanticInsights(userId: string, startDate: Date) {
  try {
    const [
      clusterData,
      contentCoverage
    ] = await Promise.all([
      // Semantic cluster information
      prisma.semanticCluster.findMany({
        include: {
          items: {
            include: {
              item: {
                select: {
                  userId: true,
                  type: true,
                  createdAt: true
                }
              }
            },
            where: {
              item: { 
                userId,
                createdAt: { gte: startDate }
              }
            }
          },
          _count: {
            select: { items: true }
          }
        },
        where: {
          items: {
            some: {
              item: { 
                userId,
                createdAt: { gte: startDate }
              }
            }
          }
        }
      }),

      // Calculate content coverage
      prisma.itemEmbedding.count({
        where: {
          item: { 
            userId,
            createdAt: { gte: startDate }
          }
        }
      })
    ]);

    const totalClusters = clusterData.length;
    const avgClusterSize = totalClusters > 0 
      ? clusterData.reduce((sum, cluster) => sum + cluster._count.items, 0) / totalClusters 
      : 0;

    // Calculate clustering quality (simplified metric)
    const clusteringQuality = totalClusters > 0 ? Math.min(1, avgClusterSize / 10) : 0;

    // Mock topic distribution
    const topicDistribution = [
      { topic: 'AI and Machine Learning', count: 45, percentage: 25 },
      { topic: 'Web Development', count: 38, percentage: 21 },
      { topic: 'Data Analysis', count: 32, percentage: 18 },
      { topic: 'Business Process', count: 28, percentage: 16 },
      { topic: 'Customer Support', count: 22, percentage: 12 },
      { topic: 'Marketing', count: 15, percentage: 8 }
    ];

    // Mock semantic gaps
    const semanticGaps = [
      {
        topic: 'Advanced AI Techniques',
        gap: 0.7,
        suggestions: [
          'Add content about neural network architectures',
          'Include examples of deep learning applications',
          'Create prompts for advanced AI use cases'
        ]
      },
      {
        topic: 'Security Best Practices',
        gap: 0.5,
        suggestions: [
          'Add security-focused prompts',
          'Include data privacy guidelines',
          'Create security audit templates'
        ]
      }
    ];

    const totalItemsWithEmbeddings = await prisma.item.count({
      where: { 
        userId,
        createdAt: { gte: startDate },
        embedding: { isNot: null }
      }
    });

    const totalItems = await prisma.item.count({
      where: { userId, createdAt: { gte: startDate } }
    });

    const coverage = totalItems > 0 ? contentCoverage / totalItems : 0;

    return {
      totalClusters,
      avgClusterSize,
      clusteringQuality,
      contentCoverage: coverage,
      semanticGaps,
      topicDistribution
    };
  } catch (error) {
    console.error('Error getting semantic insights:', error);
    return {
      totalClusters: 0,
      avgClusterSize: 0,
      clusteringQuality: 0,
      contentCoverage: 0,
      semanticGaps: [],
      topicDistribution: []
    };
  }
}

async function getContentEvolution(userId: string, startDate: Date) {
  try {
    const [
      creationTrend,
      typeEvolution,
      qualityEvolution
    ] = await Promise.all([
      // Daily content creation
      prisma.item.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        _count: true
      }),

      // Content type evolution
      prisma.item.groupBy({
        by: ['type', 'createdAt'],
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        _count: true
      }),

      // Quality evolution over time
      prisma.contentSummary.findMany({
        where: {
          item: { userId },
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          readabilityScore: true,
          confidence: true
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    // Process daily creation trends
    const creationByDay = creationTrend.reduce((acc: Record<string, any>, item) => {
      const day = item.createdAt.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { date: day, items: 0, quality: 0 };
      }
      acc[day].items += item._count;
      return acc;
    }, {});

    // Process type evolution
    const typeByDay = typeEvolution.reduce((acc: Record<string, any>, item) => {
      const day = item.createdAt.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { date: day, prompts: 0, agents: 0, rules: 0, templates: 0 };
      }
      acc[day][item.type] = (acc[day][item.type] || 0) + item._count;
      return acc;
    }, {});

    // Process quality evolution
    const qualityByDay = qualityEvolution.reduce((acc: Record<string, any>, item) => {
      const day = item.createdAt.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { 
          date: day, 
          readability: 0, 
          coherence: 0, 
          relevance: 0, 
          count: 0 
        };
      }
      acc[day].readability += (item.readabilityScore || 0) * 10;
      acc[day].coherence += (item.readabilityScore || 0) * 9; // Mock coherence
      acc[day].relevance += (item.confidence || 0) * 10;
      acc[day].count++;
      return acc;
    }, {});

    // Calculate averages for quality
    Object.keys(qualityByDay).forEach(day => {
      const data = qualityByDay[day];
      if (data.count > 0) {
        data.readability /= data.count;
        data.coherence /= data.count;
        data.relevance /= data.count;
      }
    });

    return {
      creationTrend: Object.values(creationByDay),
      typeEvolution: Object.values(typeByDay),
      qualityEvolution: Object.values(qualityByDay)
    };
  } catch (error) {
    console.error('Error getting content evolution:', error);
    return {
      creationTrend: [],
      typeEvolution: [],
      qualityEvolution: []
    };
  }
}

function generateRecommendations(
  qualityMetrics: any,
  optimizationImpact: any,
  duplicateAnalysis: any,
  semanticInsights: any
) {
  const recommendations = [];

  // Quality improvement recommendations
  const avgQuality = (qualityMetrics.avgReadability + qualityMetrics.avgCoherence + 
                     qualityMetrics.avgRelevance + qualityMetrics.avgCompleteness) / 4;
  
  if (avgQuality < 6) {
    recommendations.push({
      id: 'quality_improvement',
      type: 'quality',
      title: 'Improve Content Quality',
      description: 'Your average content quality score is below optimal. Focus on enhancing readability and coherence.',
      impact: 'high',
      effort: 'medium',
      priority: 9,
      actionItems: [
        'Review and revise content with low quality scores',
        'Use AI optimization tools for content enhancement',
        'Implement quality guidelines for new content creation'
      ]
    });
  }

  // Duplicate content recommendations
  if (duplicateAnalysis.duplicateRate > 0.1) {
    recommendations.push({
      id: 'duplicate_cleanup',
      type: 'duplication',
      title: 'Address Duplicate Content',
      description: `${(duplicateAnalysis.duplicateRate * 100).toFixed(1)}% of your content contains duplicates. Cleaning this up can improve efficiency.`,
      impact: 'medium',
      effort: 'low',
      priority: 7,
      actionItems: [
        'Review and merge similar content items',
        'Implement automated duplicate detection',
        'Create content creation guidelines to prevent duplicates'
      ]
    });
  }

  // Optimization recommendations
  if (optimizationImpact.totalOptimizations > 0 && 
      optimizationImpact.approvedOptimizations / optimizationImpact.totalOptimizations < 0.7) {
    recommendations.push({
      id: 'optimization_approval',
      type: 'optimization',
      title: 'Increase Optimization Adoption',
      description: 'Many optimization suggestions are not being approved. Review and apply beneficial optimizations.',
      impact: 'medium',
      effort: 'low',
      priority: 6,
      actionItems: [
        'Review pending optimization suggestions',
        'Create approval workflow for optimizations',
        'Train team on optimization benefits'
      ]
    });
  }

  // Semantic organization recommendations
  if (semanticInsights.clusteringQuality < 0.6) {
    recommendations.push({
      id: 'semantic_organization',
      type: 'organization',
      title: 'Improve Content Organization',
      description: 'Your content organization could be improved through better semantic clustering.',
      impact: 'medium',
      effort: 'medium',
      priority: 5,
      actionItems: [
        'Run semantic clustering analysis',
        'Reorganize content based on semantic relationships',
        'Create topic-based folder structures'
      ]
    });
  }

  // Coverage gap recommendations
  if (semanticInsights.contentCoverage < 0.8) {
    recommendations.push({
      id: 'content_coverage',
      type: 'optimization',
      title: 'Expand Content Coverage',
      description: 'There are gaps in your content coverage. Consider adding content in underrepresented areas.',
      impact: 'low',
      effort: 'high',
      priority: 4,
      actionItems: [
        'Identify content gaps through semantic analysis',
        'Create content for underrepresented topics',
        'Develop content strategy for complete coverage'
      ]
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}

function parseTimeRange(range: string): number {
  const unit = range.slice(-1);
  const value = parseInt(range.slice(0, -1));
  
  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
    default: return 30 * 24 * 60 * 60 * 1000;
  }
}