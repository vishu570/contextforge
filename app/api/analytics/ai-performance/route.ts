import { getUserFromToken } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"

// GET /api/analytics/ai-performance - Get AI performance analytics
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("range") || "30d"
    const userId = user.id

    const timeRangeMs = parseTimeRange(timeRange)
    const startDate = new Date(Date.now() - timeRangeMs)

    const [
      modelUsageData,
      processingMetrics,
      errorAnalysis,
      costAnalysis,
      qualityMetrics,
    ] = await Promise.all([
      getModelUsage(userId, startDate),
      getProcessingMetrics(userId, startDate),
      getErrorAnalysis(userId, startDate),
      getCostAnalysis(userId, startDate),
      getQualityMetrics(userId, startDate),
    ])

    // Calculate overall success rate
    const totalRequests = Object.values(modelUsageData).reduce(
      (sum, stats: any) => sum + stats.total,
      0
    )
    const totalCompleted = Object.values(modelUsageData).reduce(
      (sum, stats: any) => sum + stats.completed,
      0
    )
    const overallSuccessRate =
      totalRequests > 0 ? totalCompleted / totalRequests : 0

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      timeRange,
      modelUsage: modelUsageData,
      processingMetrics,
      errorAnalysis,
      costAnalysis,
      qualityMetrics,
      overallSuccessRate,
      summary: {
        totalRequests,
        totalCompleted,
        totalFailed: totalRequests - totalCompleted,
        avgSuccessRate: overallSuccessRate,
        totalCost: Object.values(costAnalysis).reduce(
          (sum: number, cost: any) => sum + cost.totalCost,
          0
        ),
      },
    })
  } catch (error) {
    console.error("AI performance analytics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch AI performance analytics" },
      { status: 500 }
    )
  }
}

async function getModelUsage(userId: string, startDate: Date) {
  try {
    // Get workflow queue statistics by type
    const queueStats = await prisma.workflowQueue.groupBy({
      by: ["type", "status"],
      where: {
        createdAt: { gte: startDate },
        // Filter for user-related jobs by checking payload
      },
      _count: true,
    })

    // Get model optimization data
    const optimizationStats = await prisma.modelOptimization.groupBy({
      by: ["targetModel", "status"],
      where: {
        item: { userId },
        createdAt: { gte: startDate },
      },
      _count: true,
    })

    // Combine queue and optimization stats
    const modelUsage: Record<string, any> = {}

    // Process optimization stats
    optimizationStats.forEach((stat: any) => {
      const model = stat.targetModel
      if (!modelUsage[model]) {
        modelUsage[model] = {
          total: 0,
          completed: 0,
          failed: 0,
          pending: 0,
          processing: 0,
        }
      }

      modelUsage[model][
        stat.status === "approved"
          ? "completed"
          : stat.status === "rejected"
          ? "failed"
          : "pending"
      ] += stat._count
      modelUsage[model].total += stat._count
    })

    // Process queue stats (generic processing)
    queueStats.forEach((stat: any) => {
      const type = stat.type
      if (!modelUsage[type]) {
        modelUsage[type] = {
          total: 0,
          completed: 0,
          failed: 0,
          pending: 0,
          processing: 0,
        }
      }

      modelUsage[type][stat.status] =
        (modelUsage[type][stat.status] || 0) + stat._count
      modelUsage[type].total += stat._count
    })

    return modelUsage
  } catch (error) {
    console.error("Error getting model usage:", error)
    return {}
  }
}

async function getProcessingMetrics(userId: string, startDate: Date) {
  try {
    // Get job processing times from workflow queue
    const jobs = await prisma.workflowQueue.findMany({
      where: {
        createdAt: { gte: startDate },
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        type: true,
        startedAt: true,
        completedAt: true,
      },
    })

    // Get optimization processing times
    const optimizations = await prisma.modelOptimization.findMany({
      where: {
        item: { userId },
        createdAt: { gte: startDate },
        reviewedAt: { not: null },
      },
      select: {
        targetModel: true,
        createdAt: true,
        reviewedAt: true,
      },
    })

    const processingMetrics: Record<
      string,
      { totalTime: number; count: number; avgTime: number }
    > = {}

    // Process job times
    jobs.forEach((job: any) => {
      if (job.startedAt && job.completedAt) {
        const processingTime =
          job.completedAt.getTime() - job.startedAt.getTime()

        if (!processingMetrics[job.type]) {
          processingMetrics[job.type] = { totalTime: 0, count: 0, avgTime: 0 }
        }

        processingMetrics[job.type].totalTime += processingTime
        processingMetrics[job.type].count++
      }
    })

    // Process optimization times
    optimizations.forEach((opt: any) => {
      if (opt.reviewedAt) {
        const processingTime =
          opt.reviewedAt.getTime() - opt.createdAt.getTime()

        if (!processingMetrics[opt.targetModel]) {
          processingMetrics[opt.targetModel] = {
            totalTime: 0,
            count: 0,
            avgTime: 0,
          }
        }

        processingMetrics[opt.targetModel].totalTime += processingTime
        processingMetrics[opt.targetModel].count++
      }
    })

    // Calculate averages
    Object.keys(processingMetrics).forEach((key) => {
      const metrics = processingMetrics[key]
      metrics.avgTime =
        metrics.count > 0 ? metrics.totalTime / metrics.count : 0
    })

    return processingMetrics
  } catch (error) {
    console.error("Error getting processing metrics:", error)
    return {}
  }
}

async function getErrorAnalysis(userId: string, startDate: Date) {
  try {
    // Get failed jobs
    const failedJobs = await prisma.workflowQueue.groupBy({
      by: ["type"],
      where: {
        createdAt: { gte: startDate },
        status: "failed",
      },
      _count: true,
    })

    // Get rejected optimizations
    const rejectedOptimizations = await prisma.modelOptimization.groupBy({
      by: ["targetModel"],
      where: {
        item: { userId },
        createdAt: { gte: startDate },
        status: "rejected",
      },
      _count: true,
    })

    const errorAnalysis: Record<string, number> = {}

    failedJobs.forEach((job: any) => {
      errorAnalysis[`${job.type}_failed`] = job._count
    })

    rejectedOptimizations.forEach((opt: any) => {
      errorAnalysis[`${opt.targetModel}_rejected`] = opt._count
    })

    return errorAnalysis
  } catch (error) {
    console.error("Error getting error analysis:", error)
    return {}
  }
}

async function getCostAnalysis(userId: string, startDate: Date) {
  try {
    // Get cost estimates from optimizations
    const optimizationCosts = await prisma.modelOptimization.groupBy({
      by: ["targetModel"],
      where: {
        item: { userId },
        createdAt: { gte: startDate },
        costEstimate: { not: null },
      },
      _sum: { costEstimate: true },
      _avg: { costEstimate: true },
      _count: true,
    })

    const costAnalysis: Record<string, any> = {}

    optimizationCosts.forEach((cost: any) => {
      costAnalysis[cost.targetModel] = {
        totalCost: cost._sum.costEstimate || 0,
        avgCost: cost._avg.costEstimate || 0,
        requestCount: cost._count,
      }
    })

    // Get actual costs from audit logs or usage metrics if available
    // This should be replaced with real cost tracking data

    return costAnalysis
  } catch (error) {
    console.error("Error getting cost analysis:", error)
    return {}
  }
}

async function getQualityMetrics(userId: string, startDate: Date) {
  try {
    // Get quality scores from optimizations
    const qualityScores = await prisma.modelOptimization.aggregate({
      where: {
        item: { userId },
        createdAt: { gte: startDate },
        qualityScore: { not: null },
      },
      _avg: { qualityScore: true },
      _count: true,
    })

    // Get content quality metrics
    const contentQuality = await prisma.contentSummary.aggregate({
      where: {
        item: { userId },
        createdAt: { gte: startDate },
      },
      _avg: {
        confidence: true,
        readabilityScore: true,
        sentimentScore: true,
      },
      _count: true,
    })

    return {
      optimizationQuality: {
        avgScore: qualityScores._avg.qualityScore || 0,
        count: qualityScores._count,
      },
      contentQuality: {
        avgConfidence: contentQuality._avg.confidence || 0,
        avgReadability: contentQuality._avg.readabilityScore || 0,
        avgSentiment: contentQuality._avg.sentimentScore || 0,
        count: contentQuality._count,
      },
    }
  } catch (error) {
    console.error("Error getting quality metrics:", error)
    return {
      optimizationQuality: { avgScore: 0, count: 0 },
      contentQuality: {
        avgConfidence: 0,
        avgReadability: 0,
        avgSentiment: 0,
        count: 0,
      },
    }
  }
}

function parseTimeRange(range: string): number {
  const unit = range.slice(-1)
  const value = parseInt(range.slice(0, -1))

  switch (unit) {
    case "h":
      return value * 60 * 60 * 1000
    case "d":
      return value * 24 * 60 * 60 * 1000
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000
    case "m":
      return value * 30 * 24 * 60 * 60 * 1000
    default:
      return 30 * 24 * 60 * 60 * 1000
  }
}
