import { getUserFromToken } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params
    const importId = resolvedParams.id

    // Get the import record
    const importRecord = await prisma.import.findFirst({
      where: {
        id: importId,
        userId: user.id,
      },
    })

    if (!importRecord) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 })
    }

    // Get staged items from the database
    const stagedItemsRaw = await prisma.stagedItem.findMany({
      where: {
        importId: importId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Convert to staged item format for the UI
    const stagedItems = stagedItemsRaw.map((item) => {
      const metadata = JSON.parse(item.metadata || "{}")

      const suggestedPathFromMetadata =
        metadata.suggestedPath ||
        metadata.suggested_path ||
        metadata.organization?.suggestedPath ||
        metadata.classification?.suggestedPath ||
        ''

      const normalizedSuggestedPath = suggestedPathFromMetadata
        ? `/${suggestedPathFromMetadata.replace(/^\/+/, '')}`
        : ''

      return {
        id: item.id,
        name: item.name,
        content: item.content,
        type: item.type as
          | "prompt"
          | "agent"
          | "rule"
          | "template"
          | "snippet"
          | "other",
        format: item.format,
        metadata: metadata,
        originalPath: item.originalPath,
        size: item.size,
        status: item.status as "pending" | "approved" | "rejected",
        // Use AI classification if available, otherwise fall back to basic classification
        classification: metadata.classification || {
          type: item.type,
          confidence: 0.8,
          reasoning: `Classified as ${item.type} based on content analysis`,
        },
        // Extract suggested tags from metadata
        tags: metadata.suggested_tags || [],
        // Handle duplicates from metadata
        duplicates:
          metadata.duplicates?.matches?.map((match: any) => ({
            id: match.item_id,
            name: `Item ${match.item_id}`,
            similarity: match.similarity,
            type: match.type === "exact" ? "identical" : "similar",
          })) || [],
        // Add empty arrays for optional properties that the UI expects
        optimizations: [],
        suggestedPath:
          normalizedSuggestedPath || `/${item.type.toLowerCase()}s`,
      }
    })

    return NextResponse.json({
      success: true,
      items: stagedItems,
    })
  } catch (error) {
    console.error("Error fetching staged items:", error)
    return NextResponse.json(
      { error: "Failed to fetch staged items" },
      { status: 500 }
    )
  }
}
