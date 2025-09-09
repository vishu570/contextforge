import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserFromToken } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encryptApiKey, validateApiKey } from "@/lib/utils"
import { z } from "zod"

const createApiKeySchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "github"]),
  name: z.string().min(1).max(50),
  apiKey: z.string().min(1),
})

// GET /api/settings/api-keys - Fetch user's API keys
export async function GET() {
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

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        provider: true,
        lastUsedAt: true,
        createdAt: true,
        // Don't return encrypted keys
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ apiKeys })
  } catch (error) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/settings/api-keys - Create new API key
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validation = createApiKeySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { provider, name, apiKey } = validation.data

    // Validate API key format
    if (!validateApiKey(provider, apiKey)) {
      return NextResponse.json(
        { error: "Invalid API key format for this provider" },
        { status: 400 }
      )
    }

    // Check if API key for this provider already exists
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        userId: user.id,
        provider,
      },
    })

    // Encrypt the API key
    const encryptedKey = encryptApiKey(apiKey)

    let apiKeyResult;

    if (existingKey) {
      // Update existing key
      apiKeyResult = await prisma.apiKey.update({
        where: { id: existingKey.id },
        data: {
          name,
          encryptedKey,
        },
        select: {
          id: true,
          name: true,
          provider: true,
          lastUsedAt: true,
          createdAt: true,
        },
      })
    } else {
      // Create new key
      apiKeyResult = await prisma.apiKey.create({
        data: {
          userId: user.id,
          provider,
          name,
          encryptedKey,
        },
        select: {
          id: true,
          name: true,
          provider: true,
          lastUsedAt: true,
          createdAt: true,
        },
      })
    }

    return NextResponse.json({ apiKey: apiKeyResult }, { status: existingKey ? 200 : 201 })
  } catch (error) {
    console.error("Error creating API key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}