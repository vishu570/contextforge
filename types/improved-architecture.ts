// Types for improved architecture components

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface PromptVariant {
  id: string;
  name: string;
  content: string;
  isDefault?: boolean;
  performance?: PerformanceMetrics;
  variables?: PromptVariable[];
  active?: boolean;
  createdAt?: Date;
  metrics?: PerformanceMetrics;
}

export interface PromptTestCase {
  id?: string;
  name: string;
  inputs: Record<string, any>;
  expectedOutput?: string;
  actualOutput?: string;
  passed?: boolean;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  tokenUsage: number;
  costPerRequest: number;
  qualityScore?: number;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  cost: number;
  capabilities: string[];
}

export interface AgentCapability {
  name: string;
  description: string;
  category: string;
  inputTypes: string[];
  outputTypes: string[];
  confidence: number;
  verified: boolean;
}

export interface AgentBehavior {
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
  priority: number;
}

export interface ConversationFlow {
  id: string;
  name: string;
  steps: ConversationStep[];
  isDefault?: boolean;
}

export interface ConversationStep {
  id: string;
  type: 'prompt' | 'response' | 'condition' | 'action';
  content: string;
  next?: string;
  conditions?: string[];
}

export interface PersonalityTraits {
  friendliness: number; // 0-1
  formality: number; // 0-1
  creativity: number; // 0-1
  analytical: number; // 0-1
  empathy: number; // 0-1
}

export interface ResponseStyle {
  verbosity: 'concise' | 'normal' | 'detailed';
  tone: 'professional' | 'casual' | 'friendly' | 'technical';
  structure: 'freeform' | 'structured' | 'bullet-points' | 'numbered';
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: string;
  category?: string;
  parameters?: Record<string, any>;
  enabled?: boolean;
  inputSchema?: {
    type: string;
    [key: string]: any;
  };
  outputSchema?: {
    type: string;
    [key: string]: any;
  };
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  active: boolean;
  executionMode: 'immediate' | 'deferred' | 'scheduled';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RuleCondition {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'regex' | 'custom' | 'exists' | 'in';
  value: any;
  negate?: boolean;
}

export interface RuleAction {
  id: string;
  type: 'set' | 'append' | 'remove' | 'trigger' | 'notify' | 'transform';
  target: string;
  value?: any;
}

export interface RuleConflict {
  id: string;
  ruleId1: string;
  ruleId2: string;
  type: 'priority' | 'condition' | 'action' | 'circular';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedResolution?: string;
}

export interface ExecutionPlan {
  id: string;
  rules: Rule[];
  order: string[];
  conflicts: RuleConflict[];
  estimatedExecutionTime: number;
}

export interface Item {
  id: string;
  name: string;
  type: string;
  content: string;
  format?: string;
  tags?: string[];
  updatedAt: Date;
  createdAt?: Date;
  targetModels?: string;
  metadata?: {
    description?: string;
    [key: string]: any;
  };
}
