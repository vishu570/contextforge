import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserFromToken } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encryptApiKey, validateApiKey } from "@/lib/utils"
import { z } from "zod"

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  apiKey: z.string().min(1).optional(),
})

// PUT /api/settings/api-keys/[id] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if API key exists and belongs to user
    const existingApiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingApiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updateApiKeySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { name, apiKey } = validation.data

    // Prepare update data
    const updateData: any = {}

    if (name) {
      updateData.name = name
    }

    if (apiKey) {
      // Validate API key format
      if (!validateApiKey(existingApiKey.provider, apiKey)) {
        return NextResponse.json(
          { error: "Invalid API key format for this provider" },
          { status: 400 }
        )
      }

      // Encrypt the new API key
      updateData.encryptedKey = encryptApiKey(apiKey)
    }

    // Update the API key
    const updatedApiKey = await prisma.apiKey.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        provider: true,
        lastUsedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ apiKey: updatedApiKey })
  } catch (error) {
    console.error("Error updating API key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/api-keys/[id] - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if API key exists and belongs to user
    const existingApiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingApiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      )
    }

    // Delete the API key
    await prisma.apiKey.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}