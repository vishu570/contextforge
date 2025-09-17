import { getUserFromToken } from "@/lib/auth"
import { getProgress, subscribeToProgress } from "@/lib/import/progress"

export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const importId = searchParams.get("importId")

  console.log(`SSE connection requested for importId: ${importId}`)

  if (!importId) {
    return NextResponse.json({ error: "Import ID required" }, { status: 400 })
  }

  // Get user from token with better error handling
  const token =
    request.cookies.get("auth-token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "")

  console.log(`SSE auth check - token exists: ${!!token}`)

  if (!token) {
    console.log("SSE: No auth token found")
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    )
  }

  try {
    const user = await getUserFromToken(token)
    if (!user) {
      console.log("SSE: Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
    console.log(`SSE: Authenticated user: ${user.id}`)
  } catch (error) {
    console.error("SSE: Auth error:", error)
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    )
  }

  // Create Server-Sent Events response
  const encoder = new TextEncoder()
  console.log(`Creating SSE stream for importId: ${importId}`)

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false
      let unsubscribe: (() => void) | null = null
      let heartbeatId: NodeJS.Timeout | null = null

      console.log(`SSE stream started for ${importId}`)

      const isControllerClosedError = (error: unknown) =>
        error instanceof Error &&
        error.message.toLowerCase().includes("invalid state")

      const cleanup = () => {
        if (isClosed) return
        isClosed = true
        if (unsubscribe) unsubscribe()
        if (heartbeatId) {
          clearInterval(heartbeatId)
          heartbeatId = null
        }
        try {
          controller.close()
        } catch (error) {
          if (!isControllerClosedError(error)) {
            console.error("SSE controller close failed:", error)
          }
        }
      }

      const send = (payload: unknown) => {
        if (isClosed) return
        const data = `data: ${JSON.stringify(payload)}\n\n`
        try {
          controller.enqueue(encoder.encode(data))
        } catch (error) {
          if (!isControllerClosedError(error)) {
            console.error("SSE controller enqueue failed:", error)
          }
          cleanup()
        }
      }

      // Send initial connection confirmation
      send({
        status: "connected",
        message: "Progress stream connected",
        importId,
        timestamp: new Date().toISOString(),
      })
      console.log(`SSE: Sent initial connection message for ${importId}`)

      const latestProgress = getProgress(importId)
      let initialComplete = false
      if (latestProgress) {
        console.log(
          `SSE sending cached progress for ${importId}:`,
          latestProgress
        )
        send(latestProgress)
        initialComplete =
          latestProgress.status === "completed" ||
          latestProgress.status === "failed"
      }

      unsubscribe = subscribeToProgress(importId, progress => {
        if (isClosed) return
        console.log(`SSE pushing live progress for ${importId}:`, progress)
        send(progress)

        if (progress.status === "completed" || progress.status === "failed") {
          console.log(
            `SSE closing stream for ${importId} with status ${progress.status}`
          )
          cleanup()
        }
      })

      if (!initialComplete) {
        // Heartbeat to keep the connection alive
        heartbeatId = setInterval(() => {
          if (isClosed) return
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`))
          } catch (error) {
            if (!isControllerClosedError(error)) {
              console.error("SSE heartbeat enqueue failed:", error)
            }
            cleanup()
          }
        }, 25000)
      } else {
        cleanup()
      }

      // Clean up on stream close
      return cleanup
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
