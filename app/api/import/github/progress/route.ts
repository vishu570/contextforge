import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { getProgress } from '@/lib/import/progress'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const importId = searchParams.get('importId')
  
  if (!importId) {
    return NextResponse.json({ error: 'Import ID required' }, { status: 400 })
  }

  // Get user from token
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Create Server-Sent Events response
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      const sendProgress = () => {
        const progress = getProgress(importId)
        console.log(`SSE sending progress for ${importId}:`, progress)
        if (progress) {
          const data = `data: ${JSON.stringify(progress)}\n\n`
          controller.enqueue(encoder.encode(data))
          
          // If completed or failed, close the stream
          if (progress.status === 'completed' || progress.status === 'failed') {
            controller.close()
            return
          }
        }
        
        // Continue polling every 500ms
        setTimeout(sendProgress, 500)
      }
      
      // Start sending progress
      sendProgress()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}