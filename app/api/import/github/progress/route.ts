import { getUserFromToken } from "@/lib/auth"
import { getProgress, progressStore } from "@/lib/import/progress"
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
      let intervalId: NodeJS.Timeout | null = null
      let isClosed = false

      console.log(`SSE stream started for ${importId}`)

      const sendProgress = () => {
        if (isClosed) return

        const progress = getProgress(importId)
        console.log(`SSE checking progress for ${importId}:`, progress)

        // Debug: Check if we have any progress stored at all
        const allKeys = Array.from(progressStore.keys())
        console.log(`All stored progress keys (${allKeys.length}):`, allKeys)
        
        // Extra debugging - show what's actually in the store
        if (allKeys.length > 0) {
          allKeys.forEach(key => {
            console.log(`Progress for ${key}:`, getProgress(key))
          })
        }

        if (progress) {
          const data = `data: ${JSON.stringify(progress)}\n\n`
          console.log(`SSE sending data for ${importId}:`, data.trim())
          try {
            controller.enqueue(encoder.encode(data))
            console.log(`SSE data sent successfully for ${importId}`)
          } catch (error) {
            console.error("SSE controller error:", error)
            isClosed = true
            if (intervalId) clearInterval(intervalId)
            return
          }

          // If completed or failed, close the stream
          if (progress.status === "completed" || progress.status === "failed") {
            console.log(
              `SSE closing stream for ${importId} with status: ${progress.status}`
            )
            isClosed = true
            if (intervalId) clearInterval(intervalId)
            controller.close()
            return
          }
        } else {
          // Send heartbeat to keep connection alive, but also check if we should create a default progress
          console.log(`No progress found for ${importId}, sending heartbeat`)
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`))
          } catch (error) {
            console.error("SSE heartbeat error:", error)
            isClosed = true
            if (intervalId) clearInterval(intervalId)
            return
          }
        }
      }

      // Send initial connection confirmation
      try {
        const initialData = `data: ${JSON.stringify({
          status: "connected",
          message: "Progress stream connected",
          importId: importId,
          timestamp: new Date().toISOString(),
        })}\n\n`
        controller.enqueue(encoder.encode(initialData))
        console.log(`SSE: Sent initial connection message for ${importId}`)
      } catch (error) {
        console.error("SSE: Error sending initial message:", error)
      }

      // Send initial progress immediately
      sendProgress()

      // Set up interval for periodic updates
      intervalId = setInterval(sendProgress, 500)

      // Clean up on stream close
      return () => {
        isClosed = true
        if (intervalId) clearInterval(intervalId)
      }
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
