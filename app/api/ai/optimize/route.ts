import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/db'
import { aiClient } from '../../../../lib/ai/client'
import { OptimizationType } from '../../../../lib/ai/providers'
import { getUserFromToken } from '../../../../lib/auth'

// Request validation schema matching contracts/ai-optimization-api.yaml lines 16-37
const optimizeRequestSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  optimizationType: z.enum(['content', 'structure', 'metadata', 'categorization']),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'auto']).optional().default('auto'),
  preserveOriginal: z.boolean().optional().default(true)
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = optimizeRequestSchema.parse(body)

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

    // Verify item exists and belongs to user
    const item = await prisma.item.findFirst({
      where: {
        id: validatedData.itemId,
        userId: user.id
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Initialize AI client for user
    await aiClient.initializeFromUser(user.id)

    // Check if any providers are available
    const availableProviders = aiClient.getAvailableProviders()
    if (availableProviders.length === 0) {
      return NextResponse.json(
        { error: 'No AI providers configured. Please add API keys in settings.' },
        { status: 400 }
      )
    }

    const preferredProvider = validatedData.provider === 'auto' ? undefined : validatedData.provider

    // For small content, optimize immediately (200 response)
    // For larger content, queue for background processing (202 response)
    const contentLength = item.content.length
    const isLargeContent = contentLength > 5000

    if (isLargeContent) {
      // Queue optimization for background processing
      const queueEntry = await prisma.optimizationQueue.create({
        data: {
          userId: user.id,
          itemId: validatedData.itemId,
          optimizationType: validatedData.optimizationType,
          priority: 'medium',
          status: 'queued',
          aiProvider: preferredProvider,
          estimatedTime: Math.ceil(contentLength / 100), // Rough estimate: 1s per 100 chars
          scheduledFor: new Date()
        }
      })

      return NextResponse.json({
        jobId: queueEntry.id,
        status: 'queued',
        estimatedTime: queueEntry.estimatedTime
      }, { status: 202 })
    }

    // Optimize immediately for small content
    try {
      const result = await aiClient.optimize(
        validatedData.itemId,
        item.content,
        validatedData.optimizationType as OptimizationType,
        preferredProvider
      )

      // Update the result with user ID
      await prisma.optimizationResult.update({
        where: { id: result.id },
        data: { userId: user.id }
      })

      // Preserve original content if requested
      if (validatedData.preserveOriginal && !item.originalContent) {
        await prisma.item.update({
          where: { id: validatedData.itemId },
          data: {
            originalContent: item.content,
            optimizedContent: result.optimizedVersion,
            aiOptimizationStatus: 'optimized',
            confidence: result.confidence
          }
        })
      }

      return NextResponse.json(result, { status: 200 })
    } catch (error) {
      console.error('Optimization failed:', error)
      
      // Check for rate limiting
      if ((error as any)?.message?.includes('rate limit') || (error as any)?.statusCode === 429) {
        return NextResponse.json(
          { error: 'AI provider rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: `Optimization failed: ${(error as any)?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.issues.map(err => `${err.path.join('.')}: ${err.message}`)
      return NextResponse.json(
        { error: `Validation failed: ${fieldErrors.join(', ')}` },
        { status: 400 }
      )
    }

    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}