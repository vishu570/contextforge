import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/db'
import { getUserFromToken } from '../../../../../../lib/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter is required' },
        { status: 400 }
      )
    }

    // Get user from token
    const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const tokenPayload = await getUserFromToken(token)
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const user = tokenPayload

    // Find the job in optimization queue
    const queueJob = await prisma.optimizationQueue.findFirst({
      where: {
        id: jobId,
        userId: user.id
      }
    })

    if (!queueJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Calculate progress based on status and timing
    let progress = 0
    let result = undefined
    let error = undefined

    switch (queueJob.status) {
      case 'queued':
        progress = 0
        break
      case 'processing':
        // Estimate progress based on elapsed time
        const elapsed = Date.now() - (queueJob.startedAt?.getTime() || Date.now())
        const estimatedTotal = (queueJob.estimatedTime || 30) * 1000 // Convert to ms
        progress = Math.min(99, Math.floor((elapsed / estimatedTotal) * 100))
        break
      case 'completed':
        progress = 100
        // Try to find the completed optimization result
        const optimizationResult = await prisma.optimizationResult.findFirst({
          where: {
            itemId: queueJob.itemId,
            userId: user.id,
            optimizationType: queueJob.optimizationType
          },
          orderBy: { createdAt: 'desc' }
        })
        result = optimizationResult
        break
      case 'failed':
        progress = queueJob.startedAt ? 50 : 0 // Partial progress if started
        error = queueJob.lastError || 'Optimization failed'
        break
      case 'cancelled':
        progress = 0
        error = 'Job was cancelled'
        break
      default:
        progress = 0
    }

    // Response schema matching contracts/ai-optimization-api.yaml lines 74-91
    const response = {
      status: mapQueueStatusToApiStatus(queueJob.status),
      progress,
      ...(result && { result }),
      ...(error && { error })
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function mapQueueStatusToApiStatus(queueStatus: string): string {
  // Map queue status to API status enum [pending, processing, completed, failed]
  switch (queueStatus) {
    case 'queued':
      return 'pending'
    case 'processing':
      return 'processing'
    case 'completed':
      return 'completed'
    case 'failed':
    case 'cancelled':
      return 'failed'
    default:
      return 'pending'
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}