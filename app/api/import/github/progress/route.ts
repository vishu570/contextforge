import { getUserFromToken } from "@/lib/auth"
import { getProgress } from "@/lib/import/progress"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const importId = searchParams.get("importId")

  console.log(`SSE connection requested for importId: ${importId}`)

  if (!importId) {
    return NextResponse.json({ error: "Import ID required" }, { status: 400 })
  }

  // Get user from token
  const token =
    request.cookies.get("auth-token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    )
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  // Create Server-Sent Events response
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let intervalId: NodeJS.Timeout | null = null
      let isClosed = false

      const sendProgress = () => {
        if (isClosed) return

        const progress = getProgress(importId)
        console.log(`SSE checking progress for ${importId}:`, progress)

        // Debug: Check if we have any progress stored at all
        const { progressStore } = require("@/lib/import/progress")
        console.log(`All stored progress:`, Array.from(progressStore.keys()))

        if (progress) {
          const data = `data: ${JSON.stringify(progress)}\n\n`
          try {
            controller.enqueue(encoder.encode(data))
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
          // Send heartbeat to keep connection alive
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
