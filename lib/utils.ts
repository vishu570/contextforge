import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from "crypto"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Encryption utilities for API keys
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-change-in-production"
const ALGORITHM = "aes-256-cbc"

export function encryptApiKey(apiKey: string): string {
  try {
    const iv = crypto.randomBytes(16)
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
    const cipher = crypto.createCipher(ALGORITHM, key)
    
    let encrypted = cipher.update(apiKey, "utf8", "hex")
    encrypted += cipher.final("hex")
    
    return iv.toString("hex") + ":" + encrypted
  } catch (error) {
    console.error("Encryption error:", error)
    throw new Error("Failed to encrypt API key")
  }
}

export function decryptApiKey(encryptedApiKey: string): string {
  try {
    const parts = encryptedApiKey.split(":")
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted API key format")
    }
    
    const iv = Buffer.from(parts[0], "hex")
    const encrypted = parts[1]
    
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
    const decipher = crypto.createDecipher(ALGORITHM, key)
    
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")
    
    return decrypted
  } catch (error) {
    console.error("Decryption error:", error)
    throw new Error("Failed to decrypt API key")
  }
}

// API key validation utilities
export function validateApiKey(provider: string, apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) {
    return false
  }

  switch (provider) {
    case "openai":
      return apiKey.startsWith("sk-") && apiKey.length > 20
    case "anthropic":
      return apiKey.startsWith("sk-ant-") && apiKey.length > 20
    case "gemini":
      return apiKey.length > 20 // Google API keys vary in format
    case "github":
      return (apiKey.startsWith("ghp_") || apiKey.startsWith("github_pat_")) && apiKey.length > 20
    default:
      return false
  }
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return "****"
  }
  
  const start = apiKey.substring(0, 4)
  const end = apiKey.substring(apiKey.length - 4)
  return `${start}${"*".repeat(Math.max(8, apiKey.length - 8))}${end}`
}