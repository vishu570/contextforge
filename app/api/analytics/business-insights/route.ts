import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/analytics/business-insights - Get business insights and ROI data
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
      productivityData,
      roiData,
      efficiencyData,
      benchmarkData
    ] = await Promise.all([
      getProductivityMetrics(userId, startDate),
      getROIMetrics(userId, startDate),
      getEfficiencyMetrics(userId, startDate),
      getBenchmarkData()
    ]);

    // Calculate trends (simplified - in real implementation, compare with previous period)
    const trends = calculateTrends(productivityData, roiData, efficiencyData);

    // Calculate projections
    const projections = calculateProjections(roiData, productivityData, efficiencyData);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      timeRange,
      productivity: productivityData,
      roi: roiData,
      efficiency: efficiencyData,
      trends,
      projections,
      benchmarks: benchmarkData
    });
  } catch (error) {
    console.error('Business insights error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business insights' },
      { status: 500 }
    );
  }
}

async function getProductivityMetrics(userId: string, startDate: Date) {
  try {
    const [
      itemsCreated,
      optimizationsApplied,
      searchesPerformed,
      classificationsRun,
      timeToValueData
    ] = await Promise.all([
      // Items created
      prisma.item.count({
        where: {
          userId,
          createdAt: { gte: startDate }
        }
      }),

      // Optimizations applied
      prisma.modelOptimization.count({
        where: {
          item: { userId },
          createdAt: { gte: startDate },
          status: 'approved'
        }
      }),

      // Searches performed
      prisma.semanticSearch.count({
        where: {
          userId,
          createdAt: { gte: startDate }
        }
      }),

      // Classifications run (workflow queue)
      prisma.workflowQueue.count({
        where: {
          type: 'classification',
          createdAt: { gte: startDate },
          status: 'completed'
        }
      }),

      // Time to value calculation
      prisma.item.findMany({
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          optimizations: {
            select: {
              createdAt: true,
              status: true
            },
            where: {
              status: 'approved'
            },
            orderBy: { createdAt: 'asc' },
            take: 1
          }
        }
      })
    ]);

    // Calculate average time to value
    const timeToValueSamples = timeToValueData
      .filter(item => item.optimizations.length > 0)
      .map(item => 
        item.optimizations[0].createdAt.getTime() - item.createdAt.getTime()
      );

    const avgTimeToValue = timeToValueSamples.length > 0 
      ? timeToValueSamples.reduce((sum, time) => sum + time, 0) / timeToValueSamples.length 
      : 0;

    // Calculate productivity score (0-10 scale)
    const maxExpectedItems = 100; // Baseline expectation
    const maxExpectedOptimizations = 50;
    const maxExpectedSearches = 200;

    const productivityScore = Math.min(10, 
      (itemsCreated / maxExpectedItems) * 3 +
      (optimizationsApplied / maxExpectedOptimizations) * 3 +
      (searchesPerformed / maxExpectedSearches) * 2 +
      (classificationsRun / 25) * 2
    );

    return {
      itemsCreated,
      optimizationsApplied,
      classificationsRun,
      searchesPerformed,
      timeToValue: avgTimeToValue,
      productivityScore
    };
  } catch (error) {
    console.error('Error getting productivity metrics:', error);
    return {
      itemsCreated: 0,
      optimizationsApplied: 0,
      classificationsRun: 0,
      searchesPerformed: 0,
      timeToValue: 0,
      productivityScore: 0
    };
  }
}

async function getROIMetrics(userId: string, startDate: Date) {
  try {
    const [
      optimizationData,
      costData
    ] = await Promise.all([
      // Optimization savings
      prisma.modelOptimization.aggregate({
        where: {
          item: { userId },
          createdAt: { gte: startDate },
          status: 'approved',
          tokenSavings: { not: null },
          costEstimate: { not: null }
        },
        _sum: {
          tokenSavings: true,
          costEstimate: true
        },
        _avg: {
          costEstimate: true
        },
        _count: true
      }),

      // Additional cost analysis
      prisma.workflowQueue.count({
        where: {
          createdAt: { gte: startDate },
          status: 'completed'
        }
      })
    ]);

    const tokenSavings = optimizationData._sum.tokenSavings || 0;
    const costSavings = optimizationData._sum.costEstimate || 0;
    const optimizationsApproved = optimizationData._count;
    const avgSavingsPerOptimization = optimizationData._avg.costEstimate || 0;

    // Estimate total investment (simplified calculation)
    const estimatedInvestment = 100; // Base platform cost
    const additionalProcessingCost = costData * 0.01; // Estimated processing costs
    const totalInvestment = estimatedInvestment + additionalProcessingCost;

    // Calculate ROI percentage
    const roiPercentage = totalInvestment > 0 ? (costSavings / totalInvestment) * 100 : 0;

    // Calculate payback period in months
    const monthlySavings = costSavings; // Assuming savings are monthly
    const paybackPeriod = monthlySavings > 0 ? totalInvestment / monthlySavings : 0;

    return {
      tokenSavings,
      costSavings,
      optimizationsApproved,
      avgSavingsPerOptimization,
      roiPercentage,
      paybackPeriod
    };
  } catch (error) {
    console.error('Error getting ROI metrics:', error);
    return {
      tokenSavings: 0,
      costSavings: 0,
      optimizationsApproved: 0,
      avgSavingsPerOptimization: 0,
      roiPercentage: 0,
      paybackPeriod: 0
    };
  }
}

async function getEfficiencyMetrics(userId: string, startDate: Date) {
  try {
    const [
      totalJobs,
      completedJobs,
      failedJobs,
      qualityData,
      automationData
    ] = await Promise.all([
      // Total jobs
      prisma.workflowQueue.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),

      // Completed jobs
      prisma.workflowQueue.count({
        where: {
          createdAt: { gte: startDate },
          status: 'completed'
        }
      }),

      // Failed jobs
      prisma.workflowQueue.count({
        where: {
          createdAt: { gte: startDate },
          status: 'failed'
        }
      }),

      // Quality metrics
      prisma.contentSummary.aggregate({
        where: {
          item: { userId },
          createdAt: { gte: startDate }
        },
        _avg: {
          confidence: true,
          readabilityScore: true
        },
        _count: true
      }),

      // Automation metrics (items processed automatically)
      prisma.auditLog.count({
        where: {
          userId,
          createdAt: { gte: startDate },
          action: { in: ['optimize', 'classify', 'auto_process'] }
        }
      })
    ]);

    // Calculate efficiency metrics
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    const errorRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;
    const errorReduction = Math.max(0, 100 - errorRate); // Simplified error reduction calculation

    // Calculate automation rate
    const totalOperations = automationData + (totalJobs * 0.5); // Estimate manual operations
    const automationRate = totalOperations > 0 ? (automationData / totalOperations) * 100 : 0;

    // Processing time improvement (estimated)
    const processingTimeImprovement = Math.min(90, automationRate * 0.8); // Automation improves processing time

    // Quality improvement
    const qualityImprovement = (qualityData._avg.confidence || 0) * 100;

    // User satisfaction (estimated based on success rate and quality)
    const userSatisfaction = (successRate + qualityImprovement) / 2;

    return {
      automationRate,
      errorReduction,
      processingTimeImprovement,
      qualityImprovement,
      userSatisfaction
    };
  } catch (error) {
    console.error('Error getting efficiency metrics:', error);
    return {
      automationRate: 0,
      errorReduction: 0,
      processingTimeImprovement: 0,
      qualityImprovement: 0,
      userSatisfaction: 0
    };
  }
}

function getBenchmarkData() {
  // Industry benchmarks (static data for demonstration)
  return {
    industryAvgROI: 150, // 150% ROI
    industryAvgProductivity: 6.5, // 6.5/10 productivity score
    industryAvgQuality: 75, // 75% quality score
    performanceRanking: 15 // Top 15% performance
  };
}

function calculateTrends(productivity: any, roi: any, efficiency: any) {
  // Simplified trend calculation (in real implementation, compare with previous period)
  // For demo, generate reasonable trends based on current metrics
  
  const productivityTrend = productivity.productivityScore > 7 ? 12 : 
                           productivity.productivityScore > 5 ? 5 : -2;
  
  const costTrend = roi.roiPercentage > 100 ? 8 : 
                   roi.roiPercentage > 50 ? 3 : -1;
  
  const qualityTrend = efficiency.qualityImprovement > 80 ? 10 : 
                      efficiency.qualityImprovement > 60 ? 4 : 0;
  
  const usageTrend = productivity.itemsCreated > 50 ? 15 : 
                    productivity.itemsCreated > 20 ? 7 : 2;

  return {
    productivityTrend,
    costTrend,
    qualityTrend,
    usageTrend
  };
}

function calculateProjections(roi: any, productivity: any, efficiency: any) {
  // Calculate future projections based on current metrics
  const currentMonthlySavings = roi.costSavings;
  const growthRate = Math.min(1.5, efficiency.automationRate / 50); // Max 50% monthly growth
  
  const monthlySavings = currentMonthlySavings * growthRate;
  const annualSavings = monthlySavings * 12;
  
  // Efficiency gains projection
  const currentEfficiency = (efficiency.automationRate + efficiency.qualityImprovement) / 2;
  const efficiencyGains = Math.min(95, currentEfficiency * 1.2); // Max 95% efficiency
  
  // Scalability index (0-10 scale)
  const scalabilityIndex = Math.min(10,
    (efficiency.automationRate / 10) * 0.3 +
    (productivity.productivityScore) * 0.4 +
    (roi.roiPercentage / 20) * 0.3
  );

  return {
    monthlySavings,
    annualSavings,
    efficiencyGains,
    scalabilityIndex
  };
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