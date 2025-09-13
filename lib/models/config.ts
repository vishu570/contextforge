export interface ModelConfig {
  id: string
  name: string
  provider: "openai" | "anthropic" | "google" | "custom"
  cost: number
  maxTokens: number
  isDefault?: boolean
  capabilities?: string[]
}

export const getModelConfigs = (): ModelConfig[] => {
  return [
    {
      id: process.env.ANTHROPIC_DEFAULT_MODEL || "claude-sonnet-4-20250514",
      name: "Claude 4 Sonnet",
      provider: "anthropic",
      cost: parseFloat(process.env.CLAUDE_4_COST || "0.003"),
      maxTokens: parseInt(process.env.CLAUDE_4_MAX_TOKENS || "200000"),
      isDefault: true,
      capabilities: ["code", "analysis", "reasoning"],
    },
    {
      id: process.env.OPENAI_DEFAULT_MODEL || "gpt-5-mini-2025-08-07",
      name: "GPT-5",
      provider: "openai",
      cost: parseFloat(process.env.GPT_5_COST || "0.01"),
      maxTokens: parseInt(process.env.GPT_5_MAX_TOKENS || "128000"),
      capabilities: ["creative", "problem-solving", "general"],
    },
    {
      id: process.env.ANTHROPIC_FAST_MODEL || "claude-3-5-haiku-latest",
      name: "Claude 4 Haiku",
      provider: "anthropic",
      cost: parseFloat(process.env.CLAUDE_HAIKU_COST || "0.001"),
      maxTokens: parseInt(process.env.CLAUDE_HAIKU_MAX_TOKENS || "100000"),
      capabilities: ["fast", "cost-effective"],
    },
    {
      id: process.env.GOOGLE_DEFAULT_MODEL || "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      provider: "google",
      cost: parseFloat(process.env.GEMINI_2_COST || "0.0035"),
      maxTokens: parseInt(process.env.GEMINI_2_MAX_TOKENS || "128000"),
      capabilities: ["multimodal", "fast"],
    },
  ]
}

export const getDefaultModel = (): ModelConfig => {
  const models = getModelConfigs()
  return models.find((m) => m.isDefault) || models[0]
}

export const getModelById = (id: string): ModelConfig | undefined => {
  return getModelConfigs().find((m) => m.id === id)
}

export const getModelsByProvider = (provider: string): ModelConfig[] => {
  return getModelConfigs().filter((m) => m.provider === provider)
}
