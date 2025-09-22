export interface AIModel {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Anthropic' | 'Google';
  costPer1K: number;
  apiId: string; // The actual API identifier
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    costPer1K: 0.01,
    apiId: 'gpt-5-2025-08-07',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    costPer1K: 0.0015,
    apiId: 'gpt-5-mini-2025-08-07',
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4.0',
    provider: 'Anthropic',
    costPer1K: 0.003,
    apiId: 'claude-sonnet-4-0',
  },
  {
    id: 'gemini-25-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    costPer1K: 0.0035,
    apiId: 'gemini-2.5-pro',
  },
  {
    id: 'gemini-25-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    costPer1K: 0.0005,
    apiId: 'gemini-2.5-flash',
  },
];

export const AI_MODEL_NAMES = AI_MODELS.map(model => model.name);

export const getModelByName = (name: string): AIModel | undefined => {
  return AI_MODELS.find(model => model.name === name);
};

export const getModelById = (id: string): AIModel | undefined => {
  return AI_MODELS.find(model => model.id === id);
};

export const getModelByApiId = (apiId: string): AIModel | undefined => {
  return AI_MODELS.find(model => model.apiId === apiId);
};