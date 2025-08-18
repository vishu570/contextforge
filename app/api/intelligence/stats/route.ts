import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmbeddingService } from '@/lib/embeddings';
import ContextAssemblyEngine from '@/lib/context/assembly';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    const embeddingService = new EmbeddingService(session.user.id);
    const assemblyEngine = new ContextAssemblyEngine(session.user.id);

    // Get embedding statistics
    const embeddingStats = await embeddingService.getEmbeddingStats(session.user.id);

    // Get assembly analytics
    const assemblyAnalytics = await assemblyEngine.getAssemblyAnalytics(days);

    // Get content analysis statistics
    const { prisma } = await import('@/lib/db');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const [
      totalItems,
      itemsWithEmbeddings,
      itemsWithSummaries,
      recentAnalyses,
      avgComplexity,
      avgReadability,
    ] = await Promise.all([
      prisma.item.count({
        where: { userId: session.user.id },
      }),
      prisma.itemEmbedding.count({
        where: {
          item: { userId: session.user.id },
        },
      }),
      prisma.contentSummary.count({
        where: {
          item: { userId: session.user.id },
        },
      }),
      prisma.contentSummary.count({
        where: {
          item: { userId: session.user.id },
          createdAt: { gte: cutoffDate },
        },
      }),
      prisma.contentSummary.aggregate({
        where: {
          item: { userId: session.user.id },
        },
        _avg: {
          readabilityScore: true,
        },
      }),
      prisma.contentSummary.groupBy({
        by: ['complexity'],
        where: {
          item: { userId: session.user.id },
        },
        _count: true,
      }),
    ]);

    const complexityDistribution = avgReadability.reduce((acc: Record<string, number>, item: any) => {
      acc[item.complexity] = item._count;
      return acc;
    }, {});

    // Get recent semantic searches
    const recentSearches = await prisma.semanticSearch.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: cutoffDate },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        query: true,
        resultCount: true,
        executionTime: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      overview: {
        totalItems,
        itemsWithEmbeddings,
        itemsWithSummaries,
        embeddingCoverage: totalItems > 0 ? (itemsWithEmbeddings / totalItems) * 100 : 0,
        summaryCoverage: totalItems > 0 ? (itemsWithSummaries / totalItems) * 100 : 0,
      },
      embeddings: {
        ...embeddingStats,
        coverage: totalItems > 0 ? (embeddingStats.totalEmbeddings / totalItems) * 100 : 0,
      },
      assembly: assemblyAnalytics,
      contentAnalysis: {
        recentAnalyses,
        avgReadability: avgComplexity._avg.readabilityScore || 0,
        complexityDistribution,
      },
      semanticSearch: {
        recentSearches,
        totalSearches: recentSearches.length,
        avgExecutionTime: recentSearches.length > 0 
          ? recentSearches.reduce((sum, search) => sum + (search.executionTime || 0), 0) / recentSearches.length
          : 0,
      },
      period: {
        days,
        startDate: cutoffDate,
        endDate: new Date(),
      },
    });
  } catch (error) {
    console.error('Error retrieving intelligence stats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve intelligence statistics' },
      { status: 500 }
    );
  }
}