import { getUserFromToken } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
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
    const itemId = resolvedParams.id
    const action = resolvedParams.action

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Find the staged item
    const stagedItem = await prisma.stagedItem.findFirst({
      where: {
        id: itemId,
      },
      include: {
        import: true,
      },
    })

    if (!stagedItem) {
      return NextResponse.json(
        { error: "Staged item not found" },
        { status: 404 }
      )
    }

    // Verify the user owns this import
    if (stagedItem.import.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (action === "approve") {
      // Parse metadata to extract tags and other information
      const stagedMetadata = JSON.parse(stagedItem.metadata || "{}")
      const suggestedTags = stagedMetadata.suggested_tags || []

      // Create a real item in the main library
      const newItem = await prisma.item.create({
        data: {
          userId: user.id,
          type: stagedItem.type,
          name: stagedItem.name,
          content: stagedItem.content,
          format: stagedItem.format,
          sourceType: "github",
          sourceMetadata: stagedItem.metadata,
          metadata: JSON.stringify({
            importId: stagedItem.importId,
            originalPath: stagedItem.originalPath,
            size: stagedItem.size,
            reviewStatus: "approved",
            reviewedAt: new Date().toISOString(),
            aiClassification: stagedMetadata.classification,
          }),
        },
      })

      // Create tags for the item if we have suggested tags
      if (suggestedTags.length > 0) {
        for (const tagName of suggestedTags) {
          if (tagName && tagName.trim()) {
            try {
              // Find or create the category/tag
              let category = await prisma.category.findFirst({
                where: {
                  userId: user.id,
                  name: tagName.trim(),
                },
              })

              if (!category) {
                category = await prisma.category.create({
                  data: {
                    userId: user.id,
                    name: tagName.trim(),
                    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`, // Random color
                  },
                })
              }

              // Link the item to the category
              await prisma.itemCategory.create({
                data: {
                  userId: user.id,
                  itemId: newItem.id,
                  categoryId: category.id,
                  source: "ai_suggested",
                  confidence: 0.8,
                },
              })
            } catch (error) {
              console.warn(
                `Failed to create tag "${tagName}" for item ${newItem.id}:`,
                error
              )
            }
          }
        }
      }

      // Update staged item status
      await prisma.stagedItem.update({
        where: { id: itemId },
        data: { status: "approved" },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          itemId: newItem.id,
          action: "approve",
          entityType: "item",
          metadata: JSON.stringify({
            stagedItemId: itemId,
            reviewedAt: new Date().toISOString(),
          }),
        },
      })
    } else {
      // Reject: update staged item status
      await prisma.stagedItem.update({
        where: { id: itemId },
        data: { status: "rejected" },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "reject",
          entityType: "staged_item",
          entityId: itemId,
          metadata: JSON.stringify({
            reviewedAt: new Date().toISOString(),
          }),
        },
      })
    }

    return NextResponse.json({
      success: true,
      action,
      itemId,
    })
  } catch (error) {
    const resolvedParams = await params
    console.error(`Error ${resolvedParams.action}ing item:`, error)
    return NextResponse.json(
      { error: `Failed to ${resolvedParams.action} item` },
      { status: 500 }
    )
  }
}
