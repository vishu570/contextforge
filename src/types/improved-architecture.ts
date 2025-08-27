// Type definitions for ContextForge Improved Architecture
// These types support the differentiated content handling system

// ============================================================================
// Core Content Processing Types
// ============================================================================

export type ContentType = 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'collection'

export interface ContentProcessor<T = any> {
  processContent(item: Item): Promise<ProcessedContent<T>>
  extractMetadata(content: string): Promise<ContentMetadata>
  generateSummary(content: string): Promise<ContentSummary>
  validate(content: T): ValidationResult
}

export interface ProcessedContent<T = any> {
  structuredData: T
  extractedFeatures: Feature[]
  qualityScore: number
  suggestions: Suggestion[]
  warnings: Warning[]
  metadata: ContentMetadata
}

export interface ContentMetadata {
  wordCount: number
  language: string
  readabilityScore: number
  complexity: 'simple' | 'moderate' | 'complex'
  entities: Entity[]
  topics: Topic[]
  extractedAt: Date
}

// ============================================================================
// Prompt-Specific Types
// ============================================================================

export interface PromptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  defaultValue?: any
  required: boolean
  validation?: ValidationRule[]
  examples?: string[]
}

export interface PromptVariant {
  id: string
  name: string
  content: string
  variables: PromptVariable[]
  metrics?: PerformanceMetrics
  active: boolean
  createdAt: Date
  testedAt?: Date
}

export interface PromptTestCase {
  id: string
  name: string
  inputs: Record<string, any>
  expectedOutputPattern?: string
  actualOutput?: string
  passed?: boolean
  score?: number
  executedAt?: Date
}

export interface PromptProcessor extends ContentProcessor<PromptContent> {
  extractVariables(content: string): PromptVariable[]
  validateVariables(variables: PromptVariable[]): ValidationResult
  generateTestCases(variables: PromptVariable[]): PromptTestCase[]
  createVariants(prompt: string, count: number): PromptVariant[]
  optimizeForModel(prompt: string, model: LLMModel): OptimizedPrompt
}

export interface PromptContent {
  rawContent: string
  variables: PromptVariable[]
  structure: PromptStructure
  variants: PromptVariant[]
  testCases: PromptTestCase[]
}

export interface PromptStructure {
  sections: PromptSection[]
  variableUsage: VariableUsage[]
  complexity: number
  estimatedTokens: number
}

export interface PromptSection {
  type: 'system' | 'user' | 'assistant' | 'context'
  content: string
  variables: string[]
  startPosition: number
  endPosition: number
}

// ============================================================================
// Agent-Specific Types
// ============================================================================

export interface AgentBehavior {
  personality: PersonalityTraits
  responseStyle: ResponseStyle
  constraints: string[]
  goals: string[]
  memory: MemoryConfig
  adaptability: number // 0-1 scale
}

export interface PersonalityTraits {
  friendliness: number // 0-1 scale
  formality: number // 0-1 scale
  creativity: number // 0-1 scale
  analytical: number // 0-1 scale
  empathy: number // 0-1 scale
}

export interface ResponseStyle {
  verbosity: 'concise' | 'normal' | 'detailed'
  tone: 'professional' | 'casual' | 'friendly' | 'technical'
  structure: 'freeform' | 'structured' | 'bullet-points' | 'numbered'
  codeStyle?: 'minimal' | 'commented' | 'verbose'
}

export interface AgentCapability {
  name: string
  description: string
  category: string
  inputTypes: string[]
  outputTypes: string[]
  requiredTools?: string[]
  confidence: number
  verified: boolean
}

export interface ConversationFlow {
  nodes: ConversationNode[]
  edges: ConversationEdge[]
  entryPoint: string
  exitPoints: string[]
}

export interface ConversationNode {
  id: string
  type: 'input' | 'processing' | 'output' | 'decision' | 'tool-call'
  content?: string
  conditions?: FlowCondition[]
  toolCall?: ToolCall
}

export interface AgentProcessor extends ContentProcessor<AgentContent> {
  parseBehaviorConfig(config: string): AgentBehavior
  extractCapabilities(content: string): AgentCapability[]
  matchTools(capabilities: AgentCapability[]): ToolMatch[]
  buildConversationFlow(agent: AgentContent): ConversationFlow
}

export interface AgentContent {
  behavior: AgentBehavior
  capabilities: AgentCapability[]
  conversationFlow?: ConversationFlow
  attachedTools: Tool[]
  systemPrompt: string
  examples: ConversationExample[]
}

// ============================================================================
// Rule-Specific Types
// ============================================================================

export interface RuleCondition {
  id: string
  field: string
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'regex' | 'custom' | 'exists' | 'in'
  value: any
  negate?: boolean
  weight?: number
}

export interface RuleAction {
  id: string
  type: 'set' | 'append' | 'remove' | 'trigger' | 'notify' | 'transform'
  target: string
  value?: any
  parameters?: Record<string, any>
}

export interface Rule {
  id: string
  name: string
  description?: string
  conditions: RuleCondition[]
  actions: RuleAction[]
  priority: number
  active: boolean
  executionMode: 'immediate' | 'deferred' | 'scheduled'
  schedule?: RuleSchedule
  metadata?: Record<string, any>
}

export interface RuleConflict {
  type: 'priority' | 'action' | 'condition' | 'circular'
  rules: string[]
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestedResolution?: string
}

export interface ExecutionPlan {
  steps: ExecutionStep[]
  dependencies: ExecutionDependency[]
  estimatedDuration: number
  resources: ResourceRequirement[]
}

export interface RuleProcessor extends ContentProcessor<RuleContent> {
  parseConditions(conditions: string): RuleCondition[]
  validateConditions(conditions: RuleCondition[]): ValidationResult
  buildDecisionTree(rules: Rule[]): DecisionTree
  detectConflicts(rules: Rule[]): RuleConflict[]
  generateExecutionPlan(rule: Rule): ExecutionPlan
}

export interface RuleContent {
  conditions: RuleCondition[]
  actions: RuleAction[]
  priority: number
  executionMode: 'immediate' | 'deferred' | 'scheduled'
  conflicts: RuleConflict[]
  executionPlan?: ExecutionPlan
}

// ============================================================================
// Import System Types
// ============================================================================

export interface ImportPipeline {
  stages: ImportStage[]
  processFile(file: File): Promise<ImportResult>
  processBatch(files: File[]): Promise<BatchImportResult>
}

export interface ImportStage {
  name: string
  process(context: ImportContext): Promise<ImportContext>
}

export interface ImportContext {
  file: File
  content: string
  analysis?: ContentAnalysis
  classification?: ContentClassification
  processedContent?: any
  quality?: QualityAssessment
  duplicates?: DuplicateInfo[]
  optimization?: OptimizationResult
  errors: ImportError[]
  warnings: ImportWarning[]
}

export interface ContentAnalysis {
  textStats: TextStatistics
  language: string
  entities: Entity[]
  format: string
  structure: any
  embedding: number[]
  topics: Topic[]
  sentiment?: number
}

export interface ContentClassification {
  type: ContentType
  subtype?: string
  confidence: number
  alternatives: ClassificationAlternative[]
  reasoning: string
}

export interface ImportResult {
  success: boolean
  item?: Item
  classification: ContentClassification
  quality: QualityAssessment
  suggestions: ImportSuggestion[]
  warnings: ImportWarning[]
  errors: ImportError[]
}

// ============================================================================
// Search System Types
// ============================================================================

export interface SearchQuery {
  text?: string
  embedding?: number[]
  filters: SearchFilter[]
  facets: string[]
  limit: number
  offset: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  searchMode: 'simple' | 'advanced' | 'semantic' | 'hybrid'
}

export interface SearchResult {
  item: Item
  score: number
  relevanceReasons: string[]
  highlights: SearchHighlight[]
  relatedItems?: Item[]
}

export interface SearchFilter {
  field: string
  operator: string
  value: any
  boost?: number
}

export interface SearchFacet {
  field: string
  values: FacetValue[]
}

export interface FacetValue {
  value: string
  count: number
  selected: boolean
}

// ============================================================================
// LLM Integration Types
// ============================================================================

export interface LLMModel {
  id: string
  name: string
  provider: string
  type: 'completion' | 'chat' | 'embedding' | 'classification'
  capabilities: ModelCapabilities
  pricing: PricingInfo
  limits: UsageLimits
  customConfig?: Record<string, any>
}

export interface ModelCapabilities {
  maxTokens: number
  supportedFormats: string[]
  specializations: string[]
  languages: string[]
  reasoning: boolean
  codeGeneration: boolean
  multimodal: boolean
  toolCalling: boolean
}

export interface Tool {
  id: string
  name: string
  description: string
  category: string
  inputSchema: JSONSchema
  outputSchema: JSONSchema
  implementation: ToolImplementation
  requirements: ToolRequirements
  metadata?: Record<string, any>
}

export interface ToolCall {
  toolId: string
  parameters: Record<string, any>
  context?: any
}

export interface ToolResult {
  success: boolean
  result?: any
  error?: string
  executionTime: number
  tokensUsed?: number
}

// ============================================================================
// UI Component Types
// ============================================================================

export interface EditorProps {
  item: Item
  contentProcessor: ContentProcessor
  onSave: (item: Item) => Promise<void>
  onTest?: (testConfig: any) => Promise<any>
  onPreview?: (content: any) => void
  readonly?: boolean
}

export interface EditorState {
  content: any
  isDirty: boolean
  isValid: boolean
  validationErrors: ValidationError[]
  suggestions: Suggestion[]
  previewMode: string
  testResults?: any
}

// ============================================================================
// Utility Types
// ============================================================================

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationRule {
  type: string
  parameters?: Record<string, any>
  message?: string
}

export interface Suggestion {
  type: 'improvement' | 'optimization' | 'fix' | 'enhancement'
  title: string
  description: string
  confidence: number
  implementation?: SuggestionImplementation
}

export interface Feature {
  name: string
  value: any
  confidence: number
  metadata?: Record<string, any>
}

export interface Entity {
  text: string
  type: string
  startPosition: number
  endPosition: number
  confidence: number
}

export interface Topic {
  name: string
  confidence: number
  keywords: string[]
}

export interface PerformanceMetrics {
  responseTime: number
  qualityScore: number
  tokenUsage: TokenUsage
  costEstimate: number
  successRate: number
  lastMeasured: Date
}

export interface TokenUsage {
  input: number
  output: number
  total: number
}

export interface QualityAssessment {
  overallScore: number
  dimensions: QualityDimension[]
  issues: QualityIssue[]
  recommendations: QualityRecommendation[]
}

export interface QualityDimension {
  name: string
  score: number
  weight: number
  description: string
}

// Re-export existing Item type with extensions
export interface Item {
  id: string
  userId: string
  type: ContentType
  subType?: string
  name: string
  content: string
  format: string
  metadata: Record<string, any>
  author?: string
  language?: string
  targetModels?: string
  tags: string[]
  collections: Array<{ id: string; name: string }>
  createdAt: Date
  updatedAt: Date
  
  // New fields for improved architecture
  structuredContent?: any
  qualityScore?: number
  embedding?: number[]
  summary?: ContentSummary
  versions?: ItemVersion[]
  optimizations?: OptimizationResult[]
}

export interface ItemVersion {
  id: string
  versionNumber: number
  content: string
  metadata: Record<string, any>
  changeReason?: string
  changedBy?: string
  approved: boolean
  approvedBy?: string
  createdAt: Date
}

export interface OptimizationResult {
  id: string
  targetModel: string
  optimizedContent: string
  originalTokens?: number
  optimizedTokens?: number
  tokenSavings?: number
  qualityScore?: number
  strategy: string
  confidence: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

// JSON Schema type for tool definitions
export interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchema>
  required?: string[]
  items?: JSONSchema
  additionalProperties?: boolean | JSONSchema
  description?: string
  examples?: any[]
  default?: any
  enum?: any[]
  format?: string
  pattern?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
}