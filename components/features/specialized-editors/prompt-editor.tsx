// Specialized Prompt Editor Component
// Demonstrates differentiated UI for prompt-specific features

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dynamic from 'next/dynamic'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Icons
import { 
  Play, 
  TestTube, 
  Wand2, 
  Variable, 
  GitBranch, 
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Copy,
  Shuffle,
  BarChart3
} from 'lucide-react'

// Types
import { 
  PromptVariable, 
  PromptVariant, 
  PromptTestCase, 
  PerformanceMetrics,
  LLMModel,
  Item 
} from '@/types/improved-architecture'

// Monaco Editor
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="h-96 bg-muted rounded-md animate-pulse" />
})

// Schema for form validation
const promptSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  description: z.string().optional(),
  targetModels: z.array(z.string()),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    required: z.boolean(),
    description: z.string().optional(),
    defaultValue: z.any().optional()
  })),
  testCases: z.array(z.object({
    name: z.string(),
    inputs: z.record(z.string(), z.any())
  }))
})

type PromptFormData = z.infer<typeof promptSchema>

interface PromptEditorProps {
  item: Item
  availableModels: LLMModel[]
  onSave: (data: PromptFormData) => Promise<void>
  onTest: (testCase: PromptTestCase) => Promise<any>
  onOptimize: (model: LLMModel) => Promise<void>
  readonly?: boolean
}

export function PromptEditor({ 
  item, 
  availableModels, 
  onSave, 
  onTest, 
  onOptimize, 
  readonly = false 
}: PromptEditorProps) {
  // Form state
  const form = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      name: item.name,
      content: item.content,
      description: item.metadata?.description || '',
      targetModels: item.targetModels?.split(',') || [],
      variables: [],
      testCases: []
    }
  })

  // Editor state
  const [variables, setVariables] = useState<PromptVariable[]>([])
  const [variants, setVariants] = useState<PromptVariant[]>([])
  const [testCases, setTestCases] = useState<PromptTestCase[]>([])
  const [activeVariant, setActiveVariant] = useState<string>('original')
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [qualityScore, setQualityScore] = useState<number>(0)
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'test'>('edit')
  const [variableInputs, setVariableInputs] = useState<Record<string, any>>({})
  const [showOptimization, setShowOptimization] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)

  const { watch, setValue } = form
  const watchedContent = watch('content')

  // Auto-extract variables when content changes
  useEffect(() => {
    const extractedVars = extractVariablesFromContent(watchedContent)
    setVariables(extractedVars)
    setValue('variables', extractedVars)
    
    // Update variable inputs with defaults
    const newInputs: Record<string, any> = {}
    extractedVars.forEach(variable => {
      if (!(variable.name in variableInputs)) {
        newInputs[variable.name] = variable.defaultValue || getDefaultValueForType(variable.type)
      }
    })
    setVariableInputs(prev => ({ ...prev, ...newInputs }))
    
    // Auto-generate test cases
    if (extractedVars.length > 0) {
      const generatedTests = generateTestCases(extractedVars)
      setTestCases(generatedTests)
      setValue('testCases', generatedTests.map(tc => ({ name: tc.name, inputs: tc.inputs })))
    }
  }, [watchedContent, setValue, variableInputs])

  // Calculate quality score
  useEffect(() => {
    const score = calculatePromptQuality(watchedContent, variables)
    setQualityScore(score)
  }, [watchedContent, variables])

  // Variable extraction logic
  const extractVariablesFromContent = (content: string): PromptVariable[] => {
    const variablePattern = /\{\{(\w+)\}\}/g
    const foundVars = new Set<string>()
    const variables: PromptVariable[] = []
    
    let match
    while ((match = variablePattern.exec(content)) !== null) {
      const varName = match[1]
      if (!foundVars.has(varName)) {
        foundVars.add(varName)
        variables.push({
          name: varName,
          type: inferVariableType(varName),
          required: !content.includes(`{{${varName}?}}`),
          description: generateVariableDescription(varName),
          defaultValue: getDefaultValueForType(inferVariableType(varName))
        })
      }
    }
    
    return variables
  }

  // Test case generation
  const generateTestCases = (variables: PromptVariable[]): PromptTestCase[] => {
    const testCases: PromptTestCase[] = []
    
    if (variables.length === 0) return testCases
    
    // Default test case
    const defaultInputs: Record<string, any> = {}
    variables.forEach(variable => {
      defaultInputs[variable.name] = variable.defaultValue
    })
    
    testCases.push({
      id: 'default',
      name: 'Default Values',
      inputs: defaultInputs
    })
    
    // Edge case test cases
    variables.forEach(variable => {
      if (variable.type === 'string') {
        testCases.push({
          id: `empty_${variable.name}`,
          name: `Empty ${variable.name}`,
          inputs: { ...defaultInputs, [variable.name]: '' }
        })
        
        testCases.push({
          id: `long_${variable.name}`,
          name: `Long ${variable.name}`,
          inputs: { ...defaultInputs, [variable.name]: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(5) }
        })
      }
    })
    
    return testCases
  }

  // Quality calculation
  const calculatePromptQuality = (content: string, variables: PromptVariable[]): number => {
    let score = 0
    
    // Content length (20 points)
    const length = content.length
    if (length > 50 && length < 2000) score += 20
    else if (length >= 50) score += 10
    
    // Variable usage (25 points)
    if (variables.length > 0) {
      score += Math.min(variables.length * 5, 25)
    }
    
    // Structure indicators (25 points)
    if (content.includes('Context:') || content.includes('Instructions:')) score += 10
    if (content.includes('Example:')) score += 10
    if (content.includes('\n\n')) score += 5
    
    // Clarity indicators (20 points)
    if (/please|explain|describe|analyze/i.test(content)) score += 10
    if (/specific|detailed|comprehensive/i.test(content)) score += 10
    
    // Variable completeness (10 points)
    const completeVars = variables.filter(v => v.description && v.type).length
    if (variables.length > 0) {
      score += (completeVars / variables.length) * 10
    } else {
      score += 10 // No variables is also valid
    }
    
    return Math.min(Math.round(score), 100)
  }

  // Content preview with variable substitution
  const renderContentPreview = (): string => {
    let preview = watchedContent
    
    variables.forEach(variable => {
      const value = variableInputs[variable.name] || variable.defaultValue || `[${variable.name}]`
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g')
      preview = preview.replace(regex, String(value))
    })
    
    return preview
  }

  // Run test case
  const handleRunTest = async (testCase: PromptTestCase) => {
    try {
      const result = await onTest(testCase)
      setTestResults(prev => ({
        ...prev,
        [testCase.id || testCase.name]: {
          ...result,
          executedAt: new Date(),
          passed: true // Would be determined by actual test logic
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testCase.id || testCase.name]: {
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          executedAt: new Date(),
          passed: false
        }
      }))
    }
  }

  // Create variant
  const handleCreateVariant = () => {
    const newVariant: PromptVariant = {
      id: `variant_${Date.now()}`,
      name: `Variant ${variants.length + 1}`,
      content: watchedContent,
      variables: [...variables],
      active: false,
      createdAt: new Date()
    }
    
    setVariants(prev => [...prev, newVariant])
  }

  // Optimize for model
  const handleOptimize = async (model: LLMModel) => {
    setIsOptimizing(true)
    try {
      await onOptimize(model)
      setShowOptimization(true)
    } catch (error) {
      console.error('Optimization failed:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  // Helper functions
  const inferVariableType = (name: string): 'string' | 'number' | 'boolean' | 'array' | 'object' => {
    if (name.toLowerCase().includes('count') || name.toLowerCase().includes('number')) return 'number'
    if (name.toLowerCase().includes('is') || name.toLowerCase().includes('has')) return 'boolean'
    if (name.toLowerCase().includes('list') || name.toLowerCase().includes('items')) return 'array'
    return 'string'
  }

  const generateVariableDescription = (name: string): string => {
    const descriptions: Record<string, string> = {
      topic: 'The main topic or subject to focus on',
      context: 'Background information or context',
      style: 'Writing style or tone to use',
      format: 'Output format specification',
      examples: 'Example content or references'
    }
    
    return descriptions[name.toLowerCase()] || `Input value for ${name}`
  }

  const getDefaultValueForType = (type: string): any => {
    switch (type) {
      case 'string': return 'example text'
      case 'number': return 1
      case 'boolean': return true
      case 'array': return ['item1', 'item2']
      case 'object': return { key: 'value' }
      default: return 'default'
    }
  }

  return (
    <div className="space-y-6">
      {/* Quality Score Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Prompt Quality Score</span>
              </CardTitle>
              <CardDescription>
                Overall quality assessment based on structure, variables, and clarity
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{qualityScore}%</div>
              <Progress value={qualityScore} className="w-24" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="variables">Variables ({variables.length})</TabsTrigger>
            <TabsTrigger value="testing">Testing ({testCases.length})</TabsTrigger>
            <TabsTrigger value="variants">Variants ({variants.length})</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Content Editor */}
              <Card>
                <CardHeader>
                  <CardTitle>Prompt Content</CardTitle>
                  <CardDescription>
                    Write your prompt content. Use {'{{variableName}}'} for variables.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Prompt Name</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="Enter prompt name"
                      disabled={readonly}
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Content</Label>
                    <div className="border rounded-md overflow-hidden">
                      <MonacoEditor
                        height="400px"
                        language="text"
                        value={watchedContent}
                        onChange={(value) => setValue('content', value || '')}
                        options={{
                          readOnly: readonly,
                          minimap: { enabled: false },
                          wordWrap: 'on',
                          lineNumbers: 'off',
                          folding: false,
                          scrollBeyondLastLine: false,
                          renderLineHighlight: 'none',
                          theme: 'vs-light',
                          fontSize: 14,
                          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...form.register('description')}
                      placeholder="Describe what this prompt does"
                      rows={3}
                      disabled={readonly}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Live Preview</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewMode(previewMode === 'preview' ? 'edit' : 'preview')}
                    >
                      {previewMode === 'preview' ? 'Edit Mode' : 'Preview Mode'}
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    See how your prompt will look with variable values
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">
                        {renderContentPreview()}
                      </pre>
                    </div>
                  </ScrollArea>
                  
                  {variables.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <Label>Variable Inputs (for preview)</Label>
                      {variables.map(variable => (
                        <div key={variable.name} className="flex items-center space-x-2">
                          <Label className="w-20 text-sm">{variable.name}:</Label>
                          <Input
                            className="h-8 text-sm"
                            value={variableInputs[variable.name] || ''}
                            onChange={(e) => setVariableInputs(prev => ({
                              ...prev,
                              [variable.name]: e.target.value
                            }))}
                            placeholder={`Enter ${variable.name}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Variables Tab */}
          <TabsContent value="variables" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Variable className="h-5 w-5" />
                  <span>Extracted Variables</span>
                </CardTitle>
                <CardDescription>
                  Variables automatically detected from your prompt content
                </CardDescription>
              </CardHeader>
              <CardContent>
                {variables.length === 0 ? (
                  <div className="text-center py-8">
                    <Variable className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No variables detected. Use {'{{variableName}}'} syntax to add variables.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variables.map((variable, index) => (
                      <Card key={variable.name} className="border-2">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-semibold">Name</Label>
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary">{variable.name}</Badge>
                                {variable.required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-semibold">Type</Label>
                              <Badge variant="outline">{variable.type}</Badge>
                            </div>
                            
                            <div className="col-span-2">
                              <Label className="text-sm font-semibold">Description</Label>
                              <p className="text-sm text-muted-foreground">
                                {variable.description}
                              </p>
                            </div>
                            
                            <div className="col-span-2">
                              <Label className="text-sm font-semibold">Default Value</Label>
                              <div className="bg-muted p-2 rounded text-sm font-mono">
                                {JSON.stringify(variable.defaultValue)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TestTube className="h-5 w-5" />
                  <span>Test Cases</span>
                </CardTitle>
                <CardDescription>
                  Test your prompt with different variable combinations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testCases.length === 0 ? (
                  <div className="text-center py-8">
                    <TestTube className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No test cases available. Add variables to generate test cases.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testCases.map(testCase => (
                      <Card key={testCase.id} className="border-2">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold">{testCase.name}</h4>
                              {testResults[testCase.id || testCase.name]?.passed !== undefined && (
                                <Badge variant={testResults[testCase.id || testCase.name].passed ? "default" : "destructive"}>
                                  {testResults[testCase.id || testCase.name].passed ? (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  ) : (
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                  )}
                                  {testResults[testCase.id || testCase.name].passed ? 'Passed' : 'Failed'}
                                </Badge>
                              )}
                            </div>
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRunTest(testCase)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Run Test
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Test Inputs:</Label>
                            <div className="bg-muted p-3 rounded text-sm">
                              <pre>{JSON.stringify(testCase.inputs, null, 2)}</pre>
                            </div>
                          </div>
                          
                          {testResults[testCase.id || testCase.name] && (
                            <div className="mt-3 space-y-2">
                              <Label className="text-sm font-semibold">Test Result:</Label>
                              <div className="bg-muted p-3 rounded text-sm">
                                {testResults[testCase.id || testCase.name].error ? (
                                  <div className="text-red-600">
                                    Error: {testResults[testCase.id || testCase.name].error}
                                  </div>
                                ) : (
                                  <div className="text-green-600">
                                    Test completed successfully
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  Executed at: {testResults[testCase.id || testCase.name].executedAt?.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="h-5 w-5" />
                    <span>Prompt Variants</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateVariant}
                    disabled={readonly}
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Create Variant
                  </Button>
                </CardTitle>
                <CardDescription>
                  A/B test different versions of your prompt
                </CardDescription>
              </CardHeader>
              <CardContent>
                {variants.length === 0 ? (
                  <div className="text-center py-8">
                    <GitBranch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No variants created yet. Create variants to A/B test your prompt.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Original */}
                    <Card className={activeVariant === 'original' ? 'ring-2 ring-primary' : ''}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">Original</h4>
                            <Badge variant="default">Active</Badge>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveVariant('original')}
                          >
                            Select
                          </Button>
                        </div>
                        <div className="bg-muted p-3 rounded text-sm">
                          <pre className="whitespace-pre-wrap">
                            {watchedContent.substring(0, 200)}...
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Variants */}
                    {variants.map(variant => (
                      <Card key={variant.id} className={activeVariant === variant.id ? 'ring-2 ring-primary' : ''}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold">{variant.name}</h4>
                              {variant.active && <Badge variant="default">Active</Badge>}
                              {variant.metrics && (
                                <Badge variant="outline">
                                  Score: {Math.round(variant.metrics.qualityScore || 0)}%
                                </Badge>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveVariant(variant.id)}
                              >
                                Select
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="bg-muted p-3 rounded text-sm">
                            <pre className="whitespace-pre-wrap">
                              {variant.content.substring(0, 200)}...
                            </pre>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Created: {variant.createdAt?.toLocaleString() || 'Unknown'}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wand2 className="h-5 w-5" />
                  <span>Model Optimization</span>
                </CardTitle>
                <CardDescription>
                  Optimize your prompt for specific AI models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableModels.map(model => (
                    <Card key={model.id} className="border-2">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold">{model.name}</h4>
                            <p className="text-sm text-muted-foreground">{model.provider}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="text-xs">Max Tokens: {model.maxTokens}</div>
                            <div className="text-xs">
                              Features: {model.capabilities.includes('reasoning') ? 'Reasoning' : ''} 
                              {model.capabilities.includes('code') ? ' Code' : ''}
                            </div>
                          </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleOptimize(model)}
                            disabled={isOptimizing || readonly}
                          >
                            {isOptimizing ? (
                              <>
                                <TrendingUp className="h-3 w-3 mr-1 animate-spin" />
                                Optimizing...
                              </>
                            ) : (
                              <>
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Optimize
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {performanceMetrics && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5" />
                        <span>Performance Metrics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{performanceMetrics.qualityScore}%</div>
                          <div className="text-sm text-muted-foreground">Quality Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{performanceMetrics.averageResponseTime}ms</div>
                          <div className="text-sm text-muted-foreground">Response Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{performanceMetrics.tokenUsage}</div>
                          <div className="text-sm text-muted-foreground">Total Tokens</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">${performanceMetrics.costPerRequest.toFixed(4)}</div>
                          <div className="text-sm text-muted-foreground">Est. Cost</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Actions */}
        <div className="flex justify-end space-x-3 border-t pt-6">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={readonly}>
            Save Prompt
          </Button>
        </div>
      </form>
    </div>
  )
}