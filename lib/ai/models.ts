/**
 * Centralized AI model configuration
 * All model references should come from environment variables
 */

export interface ModelConfig {
  model: string;
  maxTokens: number;
  costPer1K: number;
  provider: 'openai' | 'anthropic' | 'google';
}

export interface ModelSelection {
  openai: {
    default: string;
    fast: string;
  };
  anthropic: {
    default: string;
    fast: string;
  };
  google: {
    default: string;
    fast: string;
  };
  taskSpecific: {
    optimization: string;
    categorization: string;
    chat: string;
  };
}

/**
 * Get all model configurations from environment variables
 */
export function getModelSelection(): ModelSelection {
  return {
    openai: {
      default: process.env.OPENAI_DEFAULT_MODEL || 'gpt-5-2025-08-07',
      fast: process.env.OPENAI_FAST_MODEL || 'gpt-5-mini-2025-08-07',
    },
    anthropic: {
      default: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-sonnet-4-0',
      fast: process.env.ANTHROPIC_FAST_MODEL || 'claude-sonnet-4-0',
    },
    google: {
      default: process.env.GOOGLE_DEFAULT_MODEL || 'gemini-2.5-pro',
      fast: process.env.GOOGLE_FAST_MODEL || 'gemini-2.5-flash',
    },
    taskSpecific: {
      optimization: process.env.OPTIMIZATION_MODEL || 'gpt-5-2025-08-07',
      categorization: process.env.CATEGORIZATION_MODEL || 'gpt-5-mini-2025-08-07',
      chat: process.env.CHAT_MODEL || 'gemini-2.5-flash',
    },
  };
}

/**
 * Get model configuration by model name
 */
export function getModelConfig(modelName: string): ModelConfig {
  const configs: Record<string, ModelConfig> = {
    // OpenAI models
    'gpt-5-2025-08-07': {
      model: 'gpt-5-2025-08-07',
      maxTokens: parseInt(process.env.GPT_5_MAX_TOKENS || '128000'),
      costPer1K: parseFloat(process.env.GPT_5_COST || '0.01'),
      provider: 'openai',
    },
    'gpt-5-mini-2025-08-07': {
      model: 'gpt-5-mini-2025-08-07',
      maxTokens: parseInt(process.env.GPT_5_MINI_MAX_TOKENS || '128000'),
      costPer1K: parseFloat(process.env.GPT_5_MINI_COST || '0.0015'),
      provider: 'openai',
    },
    // Anthropic models
    'claude-sonnet-4-0': {
      model: 'claude-sonnet-4-0',
      maxTokens: parseInt(process.env.CLAUDE_SONNET_4_MAX_TOKENS || '200000'),
      costPer1K: parseFloat(process.env.CLAUDE_SONNET_4_COST || '0.003'),
      provider: 'anthropic',
    },
    // Google models
    'gemini-2.5-pro': {
      model: 'gemini-2.5-pro',
      maxTokens: parseInt(process.env.GEMINI_2_5_PRO_MAX_TOKENS || '2000000'),
      costPer1K: parseFloat(process.env.GEMINI_2_5_PRO_COST || '0.0035'),
      provider: 'google',
    },
    'gemini-2.5-flash': {
      model: 'gemini-2.5-flash',
      maxTokens: parseInt(process.env.GEMINI_2_5_FLASH_MAX_TOKENS || '1000000'),
      costPer1K: parseFloat(process.env.GEMINI_2_5_FLASH_COST || '0.0005'),
      provider: 'google',
    },
  };

  const config = configs[modelName];
  if (!config) {
    throw new Error(`Unsupported model: ${modelName}`);
  }

  return config;
}

/**
 * Get available models for a specific provider
 */
export function getAvailableModels(provider: 'openai' | 'anthropic' | 'google'): string[] {
  const models = getModelSelection();

  switch (provider) {
    case 'openai':
      return [models.openai.default, models.openai.fast];
    case 'anthropic':
      return [models.anthropic.default, models.anthropic.fast];
    case 'google':
      return [models.google.default, models.google.fast];
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get the best model for a specific task
 */
export function getModelForTask(task: 'optimization' | 'categorization' | 'chat' | 'default'): string {
  const models = getModelSelection();

  switch (task) {
    case 'optimization':
      return models.taskSpecific.optimization;
    case 'categorization':
      return models.taskSpecific.categorization;
    case 'chat':
      return models.taskSpecific.chat;
    case 'default':
      return models.openai.default;
    default:
      return models.openai.default;
  }
}

/**
 * Check if a model is supported
 */
export function isModelSupported(modelName: string): boolean {
  try {
    getModelConfig(modelName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Legacy model mapping for backwards compatibility
 * Maps old model names to new ones
 */
export const LEGACY_MODEL_MAPPING: Record<string, string> = {
  'gpt-4': 'gpt-5-2025-08-07',
  'gpt-4o': 'gpt-5-2025-08-07',
  'gpt-4o-mini': 'gpt-5-mini-2025-08-07',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-0',
  'claude-3-5-haiku-20241022': 'claude-sonnet-4-0',
  'claude-3-5-haiku-latest': 'claude-sonnet-4-0',
  'gemini-pro': 'gemini-2.5-pro',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-2.5-flash',
};

/**
 * Get modern model name from legacy model name
 */
export function getMappedModel(modelName: string): string {
  return LEGACY_MODEL_MAPPING[modelName] || modelName;
}