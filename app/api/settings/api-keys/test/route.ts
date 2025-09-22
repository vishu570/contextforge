import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserFromToken } from "@/lib/auth"
import { validateApiKey } from "@/lib/utils"
import { z } from "zod"

const testApiKeySchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "github"]),
  apiKey: z.string().min(1),
})

// Test API key by making a simple request to the provider's API
async function testOpenAIKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      return { success: true, message: "OpenAI API key is valid and working" }
    } else {
      const error = await response.json()
      return { 
        success: false, 
        message: error.error?.message || "Invalid OpenAI API key"
      }
    }
  } catch (error) {
    return { 
      success: false, 
      message: "Failed to connect to OpenAI API"
    }
  }
}

async function testAnthropicKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_DEFAULT_MODEL || "claude-sonnet-4-0",
        max_tokens: 1,
        messages: [{ role: "user", content: "test" }],
      }),
    })

    if (response.ok || response.status === 400) {
      // 400 is expected for minimal test request
      return { success: true, message: "Anthropic API key is valid and working" }
    } else if (response.status === 401) {
      return { success: false, message: "Invalid Anthropic API key" }
    } else {
      return { success: false, message: "Failed to validate Anthropic API key" }
    }
  } catch (error) {
    return { 
      success: false, 
      message: "Failed to connect to Anthropic API"
    }
  }
}

async function testGeminiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      return { success: true, message: "Google Gemini API key is valid and working" }
    } else {
      const error = await response.json()
      return { 
        success: false, 
        message: error.error?.message || "Invalid Google Gemini API key"
      }
    }
  } catch (error) {
    return { 
      success: false, 
      message: "Failed to connect to Google Gemini API"
    }
  }
}

async function testGitHubKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `token ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "ContextForge-App",
      },
    })

    if (response.ok) {
      const user = await response.json()
      return { 
        success: true, 
        message: `GitHub token is valid (authenticated as ${user.login})`
      }
    } else if (response.status === 401) {
      return { success: false, message: "Invalid GitHub token" }
    } else {
      return { success: false, message: "Failed to validate GitHub token" }
    }
  } catch (error) {
    return { 
      success: false, 
      message: "Failed to connect to GitHub API"
    }
  }
}

// POST /api/settings/api-keys/test - Test an API key
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
    const validation = testApiKeySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { provider, apiKey } = validation.data

    // First, validate the API key format
    if (!validateApiKey(provider, apiKey)) {
      return NextResponse.json(
        { error: "Invalid API key format for this provider" },
        { status: 400 }
      )
    }

    // Test the API key with the appropriate provider
    let result: { success: boolean; message: string }

    switch (provider) {
      case "openai":
        result = await testOpenAIKey(apiKey)
        break
      case "anthropic":
        result = await testAnthropicKey(apiKey)
        break
      case "gemini":
        result = await testGeminiKey(apiKey)
        break
      case "github":
        result = await testGitHubKey(apiKey)
        break
      default:
        return NextResponse.json(
          { error: "Unsupported provider" },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error testing API key:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}