// Sample implementation of the PromptProcessor for differentiated content handling
// This demonstrates how prompt-specific processing would work

import { 
  PromptProcessor, 
  PromptContent, 
  PromptVariable, 
  PromptTestCase, 
  PromptVariant,
  ValidationResult,
  ProcessedContent,
  ContentMetadata,
  Item,
  LLMModel,
  OptimizedPrompt
} from '@/types/improved-architecture'

export class ContextForgePromptProcessor implements PromptProcessor {
  
  async processContent(item: Item): Promise<ProcessedContent<PromptContent>> {
    const content = item.content
    
    // Extract prompt-specific features
    const variables = this.extractVariables(content)
    const structure = this.analyzePromptStructure(content)
    const testCases = this.generateTestCases(variables)
    
    // Validate prompt content
    const validation = this.validate({ 
      rawContent: content, 
      variables, 
      structure, 
      variants: [], 
      testCases 
    })
    
    // Generate metadata
    const metadata = await this.extractMetadata(content)
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(content, variables, structure)
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(content, variables, structure)
    
    const structuredData: PromptContent = {
      rawContent: content,
      variables,
      structure,
      variants: [], // Will be populated by user or A/B testing system
      testCases
    }
    
    return {
      structuredData,
      extractedFeatures: this.extractPromptFeatures(content, variables),
      qualityScore,
      suggestions,
      warnings: validation.warnings.map(w => ({ 
        type: 'validation',
        message: w.message,
        severity: w.severity 
      })),
      metadata
    }
  }

  extractVariables(content: string): PromptVariable[] {
    const variables: PromptVariable[] = []
    
    // Match various variable patterns
    const patterns = [
      /\{\{(\w+)\}\}/g,           // {{variable}}
      /\{(\w+)\}/g,               // {variable}
      /<(\w+)>/g,                 // <variable>
      /\[(\w+)\]/g,               // [variable]
      /@(\w+)/g,                  // @variable
      /\$\{(\w+)\}/g,             // ${variable}
    ]
    
    const foundVars = new Set<string>()
    
    patterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const varName = match[1]
        if (!foundVars.has(varName)) {
          foundVars.add(varName)
          
          const variable: PromptVariable = {
            name: varName,
            type: this.inferVariableType(varName, content),
            description: this.generateVariableDescription(varName, content),
            required: this.isVariableRequired(varName, content),
            examples: this.generateVariableExamples(varName),
            validation: this.generateVariableValidation(varName)
          }
          
          variables.push(variable)
        }
      }
    })
    
    return variables
  }

  validateVariables(variables: PromptVariable[]): ValidationResult {
    const errors: any[] = []
    const warnings: any[] = []
    
    variables.forEach(variable => {
      // Check for naming conventions
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
        errors.push({
          field: `variables.${variable.name}`,
          message: 'Variable name contains invalid characters',
          code: 'INVALID_VAR_NAME',
          severity: 'error'
        })
      }
      
      // Check for reserved names
      const reservedNames = ['system', 'user', 'assistant', 'context', 'input', 'output']
      if (reservedNames.includes(variable.name.toLowerCase())) {
        warnings.push({
          field: `variables.${variable.name}`,
          message: 'Variable name is reserved and may cause conflicts',
          code: 'RESERVED_VAR_NAME',
          severity: 'warning'
        })
      }
      
      // Type validation
      if (variable.defaultValue !== undefined) {
        const typeMatch = this.validateVariableType(variable.defaultValue, variable.type)
        if (!typeMatch) {
          errors.push({
            field: `variables.${variable.name}.defaultValue`,
            message: `Default value type doesn't match declared type ${variable.type}`,
            code: 'TYPE_MISMATCH',
            severity: 'error'
          })
        }
      }
    })
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  generateTestCases(variables: PromptVariable[]): PromptTestCase[] {
    const testCases: PromptTestCase[] = []
    
    // Generate basic test case with default values
    if (variables.length > 0) {
      const defaultInputs: Record<string, any> = {}
      variables.forEach(variable => {
        defaultInputs[variable.name] = variable.defaultValue || this.generateDefaultValue(variable.type)
      })
      
      testCases.push({
        id: 'default',
        name: 'Default Values Test',
        inputs: defaultInputs,
        expectedOutputPattern: undefined // To be filled by user
      })
    }
    
    // Generate edge case test cases
    variables.forEach(variable => {
      if (variable.type === 'string') {
        // Empty string test
        const emptyTestInputs = { ...testCases[0]?.inputs }
        emptyTestInputs[variable.name] = ''
        testCases.push({
          id: `empty_${variable.name}`,
          name: `Empty ${variable.name} Test`,
          inputs: emptyTestInputs
        })
        
        // Long string test
        const longTestInputs = { ...testCases[0]?.inputs }
        longTestInputs[variable.name] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10)
        testCases.push({
          id: `long_${variable.name}`,
          name: `Long ${variable.name} Test`,
          inputs: longTestInputs
        })
      }
      
      if (variable.type === 'number') {
        // Zero test
        const zeroTestInputs = { ...testCases[0]?.inputs }
        zeroTestInputs[variable.name] = 0
        testCases.push({
          id: `zero_${variable.name}`,
          name: `Zero ${variable.name} Test`,
          inputs: zeroTestInputs
        })
        
        // Negative test
        const negativeTestInputs = { ...testCases[0]?.inputs }
        negativeTestInputs[variable.name] = -1
        testCases.push({
          id: `negative_${variable.name}`,
          name: `Negative ${variable.name} Test`,
          inputs: negativeTestInputs
        })
      }
    })
    
    return testCases
  }

  createVariants(prompt: string, count: number): PromptVariant[] {
    const variants: PromptVariant[] = []
    const variables = this.extractVariables(prompt)
    
    // Original variant
    variants.push({
      id: 'original',
      name: 'Original',
      content: prompt,
      variables,
      active: true,
      createdAt: new Date()
    })
    
    // Generate variations
    for (let i = 1; i < count; i++) {
      const variantContent = this.generatePromptVariant(prompt, i)
      const variantVariables = this.extractVariables(variantContent)
      
      variants.push({
        id: `variant_${i}`,
        name: `Variant ${i}`,
        content: variantContent,
        variables: variantVariables,
        active: false,
        createdAt: new Date()
      })
    }
    
    return variants
  }

  async optimizeForModel(prompt: string, model: LLMModel): Promise<OptimizedPrompt> {
    const variables = this.extractVariables(prompt)
    const structure = this.analyzePromptStructure(prompt)
    
    let optimizedContent = prompt
    const optimizations: string[] = []
    
    // Model-specific optimizations
    switch (model.provider) {
      case 'openai':
        optimizedContent = this.optimizeForOpenAI(prompt, model)
        optimizations.push('OpenAI format optimization')
        break
      case 'anthropic':
        optimizedContent = this.optimizeForClaude(prompt, model)
        optimizations.push('Claude format optimization')
        break
      case 'google':
        optimizedContent = this.optimizeForGemini(prompt, model)
        optimizations.push('Gemini format optimization')
        break
    }
    
    // Token optimization
    if (model.capabilities.maxTokens) {
      const tokenCount = this.estimateTokenCount(optimizedContent)
      if (tokenCount > model.capabilities.maxTokens * 0.8) {
        optimizedContent = this.compressPrompt(optimizedContent, model.capabilities.maxTokens * 0.7)
        optimizations.push('Token count optimization')
      }
    }
    
    return {
      originalContent: prompt,
      optimizedContent,
      model: model.id,
      optimizations,
      tokenSavings: this.estimateTokenCount(prompt) - this.estimateTokenCount(optimizedContent),
      qualityScore: this.calculateOptimizationQuality(prompt, optimizedContent),
      metadata: {
        originalTokens: this.estimateTokenCount(prompt),
        optimizedTokens: this.estimateTokenCount(optimizedContent),
        optimizedAt: new Date().toISOString()
      }
    }
  }

  validate(content: PromptContent): ValidationResult {
    const errors: any[] = []
    const warnings: any[] = []
    
    // Basic content validation
    if (!content.rawContent.trim()) {
      errors.push({
        field: 'content',
        message: 'Prompt content cannot be empty',
        code: 'EMPTY_CONTENT',
        severity: 'error'
      })
    }
    
    // Variable validation
    const variableValidation = this.validateVariables(content.variables)
    errors.push(...variableValidation.errors)
    warnings.push(...variableValidation.warnings)
    
    // Structure validation
    if (content.structure.sections.length === 0) {
      warnings.push({
        field: 'structure',
        message: 'No clear sections detected in prompt',
        code: 'NO_SECTIONS',
        severity: 'warning'
      })
    }
    
    // Check for undefined variables in content
    const usedVariables = this.findUsedVariables(content.rawContent)
    const definedVariables = content.variables.map(v => v.name)
    const undefinedVars = usedVariables.filter(v => !definedVariables.includes(v))
    
    undefinedVars.forEach(varName => {
      errors.push({
        field: 'variables',
        message: `Variable '${varName}' is used but not defined`,
        code: 'UNDEFINED_VARIABLE',
        severity: 'error'
      })
    })
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  async extractMetadata(content: string): Promise<ContentMetadata> {
    const words = content.split(/\s+/).length
    const sentences = content.split(/[.!?]+/).length
    const avgWordsPerSentence = words / sentences
    
    return {
      wordCount: words,
      language: await this.detectLanguage(content),
      readabilityScore: this.calculateReadabilityScore(content),
      complexity: this.determineComplexity(avgWordsPerSentence, content),
      entities: await this.extractEntities(content),
      topics: await this.extractTopics(content),
      extractedAt: new Date()
    }
  }

  // Private helper methods
  
  private inferVariableType(varName: string, content: string): 'string' | 'number' | 'boolean' | 'array' | 'object' {
    // Simple heuristics based on variable name
    if (varName.toLowerCase().includes('count') || varName.toLowerCase().includes('number')) {
      return 'number'
    }
    if (varName.toLowerCase().includes('is') || varName.toLowerCase().includes('has')) {
      return 'boolean'
    }
    if (varName.toLowerCase().includes('list') || varName.toLowerCase().includes('items')) {
      return 'array'
    }
    return 'string'
  }

  private generateVariableDescription(varName: string, content: string): string {
    // Generate description based on context around the variable
    const contexts = this.findVariableContexts(varName, content)
    return `Variable for ${varName}` // Simplified - could use ML for better descriptions
  }

  private isVariableRequired(varName: string, content: string): boolean {
    // Check if variable appears in critical sections or has conditional logic
    return !content.includes(`[optional: ${varName}]`) && !content.includes(`{${varName}?`)
  }

  private generateVariableExamples(varName: string): string[] {
    // Generate relevant examples based on variable name
    const examples: Record<string, string[]> = {
      'name': ['John Doe', 'Alice Smith', 'Bob Johnson'],
      'topic': ['artificial intelligence', 'climate change', 'space exploration'],
      'language': ['Python', 'JavaScript', 'Java'],
      'number': ['42', '100', '3.14'],
      'date': ['2024-01-15', 'March 15, 2024', 'today']
    }
    
    const key = Object.keys(examples).find(k => varName.toLowerCase().includes(k))
    return key ? examples[key] : ['example value 1', 'example value 2']
  }

  private generateVariableValidation(varName: string): any[] {
    const validations: any[] = []
    
    if (varName.toLowerCase().includes('email')) {
      validations.push({
        type: 'pattern',
        parameters: { pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' },
        message: 'Must be a valid email address'
      })
    }
    
    if (varName.toLowerCase().includes('count') || varName.toLowerCase().includes('number')) {
      validations.push({
        type: 'type',
        parameters: { type: 'number' },
        message: 'Must be a number'
      })
      validations.push({
        type: 'minimum',
        parameters: { minimum: 0 },
        message: 'Must be non-negative'
      })
    }
    
    return validations
  }

  private analyzePromptStructure(content: string): any {
    const sections = this.identifySections(content)
    const variableUsage = this.analyzeVariableUsage(content)
    const complexity = this.calculateStructuralComplexity(content)
    const estimatedTokens = this.estimateTokenCount(content)
    
    return {
      sections,
      variableUsage,
      complexity,
      estimatedTokens
    }
  }

  private identifySections(content: string): any[] {
    const sections: any[] = []
    const lines = content.split('\n')
    
    let currentSection = null
    let currentContent = ''
    let startLine = 0
    
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      
      // Detect section headers
      if (trimmed.startsWith('##') || trimmed.startsWith('System:') || trimmed.startsWith('User:')) {
        if (currentSection) {
          sections.push({
            ...currentSection,
            content: currentContent.trim(),
            endPosition: index
          })
        }
        
        currentSection = {
          type: this.determineSectionType(trimmed),
          variables: [],
          startPosition: index
        }
        currentContent = ''
        startLine = index + 1
      } else {
        currentContent += line + '\n'
      }
    })
    
    // Add final section
    if (currentSection) {
      sections.push({
        ...currentSection,
        content: currentContent.trim(),
        endPosition: lines.length
      })
    }
    
    // If no sections detected, treat as single section
    if (sections.length === 0) {
      sections.push({
        type: 'user',
        content: content.trim(),
        variables: this.extractVariables(content).map(v => v.name),
        startPosition: 0,
        endPosition: lines.length
      })
    }
    
    return sections
  }

  private determineSectionType(line: string): 'system' | 'user' | 'assistant' | 'context' {
    const lower = line.toLowerCase()
    if (lower.includes('system') || lower.includes('instruction')) return 'system'
    if (lower.includes('assistant') || lower.includes('response')) return 'assistant'
    if (lower.includes('context') || lower.includes('background')) return 'context'
    return 'user'
  }

  private analyzeVariableUsage(content: string): any[] {
    const variables = this.extractVariables(content)
    return variables.map(variable => ({
      name: variable.name,
      occurrences: (content.match(new RegExp(`\\{\\{?${variable.name}\\}\\}?`, 'g')) || []).length,
      contexts: this.findVariableContexts(variable.name, content)
    }))
  }

  private findVariableContexts(varName: string, content: string): string[] {
    const contexts: string[] = []
    const regex = new RegExp(`(.{0,50})\\{\\{?${varName}\\}\\}?(.{0,50})`, 'g')
    let match
    
    while ((match = regex.exec(content)) !== null) {
      contexts.push(`${match[1]}{{${varName}}}${match[2]}`)
    }
    
    return contexts
  }

  private calculateStructuralComplexity(content: string): number {
    let complexity = 0
    
    // Base complexity
    complexity += Math.min(content.length / 1000, 5)
    
    // Variable complexity
    const variables = this.extractVariables(content)
    complexity += variables.length * 0.5
    
    // Conditional logic complexity
    const conditionals = (content.match(/if|when|unless|either|or\s+|and\s+/gi) || []).length
    complexity += conditionals * 0.3
    
    // Section complexity
    const sections = (content.match(/^#{1,3}\s+/gm) || []).length
    complexity += sections * 0.2
    
    return Math.round(complexity * 10) / 10
  }

  private calculateQualityScore(content: string, variables: PromptVariable[], structure: any): number {
    let score = 0
    
    // Content quality (40% weight)
    const contentScore = this.assessContentQuality(content)
    score += contentScore * 0.4
    
    // Variable quality (30% weight)
    const variableScore = this.assessVariableQuality(variables)
    score += variableScore * 0.3
    
    // Structure quality (20% weight)
    const structureScore = this.assessStructureQuality(structure)
    score += structureScore * 0.2
    
    // Completeness (10% weight)
    const completenessScore = this.assessCompleteness(content, variables)
    score += completenessScore * 0.1
    
    return Math.round(score * 100) / 100
  }

  private assessContentQuality(content: string): number {
    let score = 0.5 // Base score
    
    // Length appropriateness
    const length = content.length
    if (length > 50 && length < 2000) score += 0.2
    if (length > 100 && length < 1000) score += 0.1
    
    // Clarity indicators
    if (content.includes('please') || content.includes('explain') || content.includes('describe')) {
      score += 0.1
    }
    
    // Structure indicators
    if (content.includes(':') || content.includes('\n\n')) {
      score += 0.1
    }
    
    return Math.min(score, 1.0)
  }

  private assessVariableQuality(variables: PromptVariable[]): number {
    if (variables.length === 0) return 1.0 // No variables is valid
    
    let score = 0.3 // Base score
    
    // Variable naming quality
    const wellNamedVars = variables.filter(v => 
      v.name.length > 2 && 
      /^[a-zA-Z][a-zA-Z0-9_]*$/.test(v.name)
    ).length
    score += (wellNamedVars / variables.length) * 0.3
    
    // Variable completeness
    const completeVars = variables.filter(v => 
      v.description && v.type && v.required !== undefined
    ).length
    score += (completeVars / variables.length) * 0.4
    
    return Math.min(score, 1.0)
  }

  private assessStructureQuality(structure: any): number {
    let score = 0.5 // Base score
    
    // Section diversity
    if (structure.sections.length > 1) score += 0.2
    if (structure.sections.some((s: any) => s.type === 'system')) score += 0.1
    
    // Complexity appropriateness
    if (structure.complexity > 1 && structure.complexity < 5) score += 0.2
    
    return Math.min(score, 1.0)
  }

  private assessCompleteness(content: string, variables: PromptVariable[]): number {
    let score = 0.5
    
    // All used variables are defined
    const usedVars = this.findUsedVariables(content)
    const definedVars = variables.map(v => v.name)
    const undefinedCount = usedVars.filter(v => !definedVars.includes(v)).length
    
    if (undefinedCount === 0) score += 0.5
    else score -= Math.min(undefinedCount * 0.1, 0.4)
    
    return Math.max(score, 0)
  }

  private findUsedVariables(content: string): string[] {
    const variables: string[] = []
    const patterns = [
      /\{\{(\w+)\}\}/g,
      /\{(\w+)\}/g,
      /<(\w+)>/g,
      /\[(\w+)\]/g,
      /\$\{(\w+)\}/g,
    ]
    
    patterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1])
        }
      }
    })
    
    return variables
  }

  private extractPromptFeatures(content: string, variables: PromptVariable[]): any[] {
    return [
      {
        name: 'variable_count',
        value: variables.length,
        confidence: 1.0,
        metadata: { description: 'Number of variables in the prompt' }
      },
      {
        name: 'content_length',
        value: content.length,
        confidence: 1.0,
        metadata: { description: 'Character count of the prompt' }
      },
      {
        name: 'has_instructions',
        value: /please|instruction|task|goal|objective/i.test(content),
        confidence: 0.8,
        metadata: { description: 'Whether prompt contains instruction keywords' }
      },
      {
        name: 'complexity_level',
        value: this.calculateStructuralComplexity(content),
        confidence: 0.7,
        metadata: { description: 'Estimated complexity of the prompt' }
      }
    ]
  }

  private generateSuggestions(content: string, variables: PromptVariable[], structure: any): any[] {
    const suggestions: any[] = []
    
    // Variable suggestions
    if (variables.length === 0 && this.couldBenefitFromVariables(content)) {
      suggestions.push({
        type: 'enhancement',
        title: 'Add Variables',
        description: 'This prompt could benefit from variables to make it more reusable',
        confidence: 0.7,
        implementation: {
          action: 'add_variables',
          suggestions: this.suggestVariables(content)
        }
      })
    }
    
    // Structure suggestions
    if (structure.sections.length === 1 && content.length > 200) {
      suggestions.push({
        type: 'improvement',
        title: 'Improve Structure',
        description: 'Consider breaking this prompt into sections for better clarity',
        confidence: 0.6,
        implementation: {
          action: 'add_sections',
          suggestions: ['Add a context section', 'Separate instructions from examples']
        }
      })
    }
    
    // Quality suggestions
    if (this.calculateQualityScore(content, variables, structure) < 0.7) {
      suggestions.push({
        type: 'improvement',
        title: 'Improve Prompt Quality',
        description: 'This prompt could be improved for better results',
        confidence: 0.8,
        implementation: {
          action: 'quality_improvements',
          suggestions: this.generateQualityImprovements(content, variables, structure)
        }
      })
    }
    
    return suggestions
  }

  // Additional helper methods would be implemented here...
  private validateVariableType(value: any, type: string): boolean {
    // Implementation for type validation
    switch (type) {
      case 'string': return typeof value === 'string'
      case 'number': return typeof value === 'number'
      case 'boolean': return typeof value === 'boolean'
      case 'array': return Array.isArray(value)
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value)
      default: return true
    }
  }

  private generateDefaultValue(type: string): any {
    const defaults: Record<string, any> = {
      'string': 'example text',
      'number': 1,
      'boolean': true,
      'array': ['item1', 'item2'],
      'object': { key: 'value' }
    }
    return defaults[type] || 'default'
  }

  // Placeholder methods for completion - would need full implementation
  private generatePromptVariant(prompt: string, variantIndex: number): string {
    // Generate variations by modifying style, tone, structure
    return prompt // Simplified for demo
  }

  private optimizeForOpenAI(prompt: string, model: LLMModel): string {
    // OpenAI-specific optimizations
    return prompt
  }

  private optimizeForClaude(prompt: string, model: LLMModel): string {
    // Claude-specific optimizations  
    return prompt
  }

  private optimizeForGemini(prompt: string, model: LLMModel): string {
    // Gemini-specific optimizations
    return prompt
  }

  private estimateTokenCount(content: string): number {
    // Rough estimation - 1 token ≈ 4 characters for English
    return Math.ceil(content.length / 4)
  }

  private compressPrompt(content: string, maxTokens: number): string {
    // Implement prompt compression logic
    return content.substring(0, maxTokens * 4) // Simplified
  }

  private calculateOptimizationQuality(original: string, optimized: string): number {
    // Compare quality between original and optimized versions
    return 0.85 // Placeholder
  }

  private async detectLanguage(content: string): Promise<string> {
    // Language detection logic
    return 'en' // Simplified
  }

  private calculateReadabilityScore(content: string): number {
    // Flesch reading ease or similar metric
    return 0.75 // Placeholder
  }

  private determineComplexity(avgWordsPerSentence: number, content: string): 'simple' | 'moderate' | 'complex' {
    if (avgWordsPerSentence < 15 && content.length < 500) return 'simple'
    if (avgWordsPerSentence < 25 && content.length < 1500) return 'moderate'
    return 'complex'
  }

  private async extractEntities(content: string): Promise<any[]> {
    // Named entity recognition
    return [] // Placeholder
  }

  private async extractTopics(content: string): Promise<any[]> {
    // Topic extraction
    return [] // Placeholder
  }

  private couldBenefitFromVariables(content: string): boolean {
    // Check if content has repeated patterns that could be variables
    return /\b(name|title|topic|subject|item|value)\b/i.test(content)
  }

  private suggestVariables(content: string): string[] {
    // Analyze content and suggest potential variables
    return ['topic', 'context', 'style'] // Simplified
  }

  private generateQualityImprovements(content: string, variables: PromptVariable[], structure: any): string[] {
    const improvements: string[] = []
    
    if (content.length < 50) {
      improvements.push('Add more context and detail to the prompt')
    }
    
    if (!content.includes('please') && !content.includes('explain')) {
      improvements.push('Use clearer instruction language')
    }
    
    if (variables.length > 0 && variables.some(v => !v.description)) {
      improvements.push('Add descriptions to all variables')
    }
    
    return improvements
  }
}

// Export interface for use in other modules
export interface OptimizedPrompt {
  originalContent: string
  optimizedContent: string
  model: string
  optimizations: string[]
  tokenSavings: number
  qualityScore: number
  metadata: Record<string, any>
}