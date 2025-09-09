// Provider exports
export * from './types'
export { OpenAIProvider } from './openai'
export { AnthropicProvider } from './anthropic'
export { GeminiProvider } from './gemini'

// Provider registry
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GeminiProvider } from './gemini'
import { AIProvider, ProviderConfig } from './types'

export const PROVIDER_REGISTRY = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  gemini: GeminiProvider
} as const

export type ProviderName = keyof typeof PROVIDER_REGISTRY

export function createProvider(name: ProviderName, config: ProviderConfig): AIProvider {
  const ProviderClass = PROVIDER_REGISTRY[name]
  if (!ProviderClass) {
    throw new Error(`Unknown provider: ${name}`)
  }
  return new ProviderClass(config)
}