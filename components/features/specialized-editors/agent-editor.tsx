'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Icons
import { 
  Bot, 
  Settings, 
  MessageSquare, 
  Workflow, 
  Target,
  Zap,
  TestTube,
  Play,
  User,
  Brain,
  Puzzle,
  CheckCircle,
  AlertTriangle,
  Plus,
  Minus,
  ArrowRight,
  Eye,
  Save,
  RefreshCw
} from 'lucide-react';

// Types
import { 
  AgentBehavior,
  AgentCapability,
  ConversationFlow,
  PersonalityTraits,
  ResponseStyle,
  Tool,
  Item
} from '@/types/improved-architecture';

// Monaco Editor
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="h-96 bg-muted rounded-md animate-pulse" />
});

// Schema for form validation
const agentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  personality: z.object({
    friendliness: z.number().min(0).max(1),
    formality: z.number().min(0).max(1),
    creativity: z.number().min(0).max(1),
    analytical: z.number().min(0).max(1),
    empathy: z.number().min(0).max(1)
  }),
  responseStyle: z.object({
    verbosity: z.enum(['concise', 'normal', 'detailed']),
    tone: z.enum(['professional', 'casual', 'friendly', 'technical']),
    structure: z.enum(['freeform', 'structured', 'bullet-points', 'numbered'])
  }),
  capabilities: z.array(z.string()),
  constraints: z.array(z.string())
});

type AgentFormData = z.infer<typeof agentSchema>;

interface AgentEditorProps {
  item: Item;
  availableTools: Tool[];
  onSave: (data: AgentFormData) => Promise<void>;
  onTest: (testConfig: any) => Promise<any>;
  readonly?: boolean;
}

// Available capabilities catalog
const CAPABILITY_CATALOG: AgentCapability[] = [
  {
    name: 'code-generation',
    description: 'Generate, review, and explain code in multiple programming languages',
    category: 'Development',
    inputTypes: ['text', 'requirements'],
    outputTypes: ['code', 'documentation'],
    confidence: 0.9,
    verified: true
  },
  {
    name: 'data-analysis',
    description: 'Analyze datasets, create visualizations, and provide insights',
    category: 'Analytics',
    inputTypes: ['csv', 'json', 'text'],
    outputTypes: ['analysis', 'visualization'],
    confidence: 0.85,
    verified: true
  },
  {
    name: 'creative-writing',
    description: 'Create original content including stories, articles, and marketing copy',
    category: 'Content',
    inputTypes: ['prompt', 'theme'],
    outputTypes: ['text', 'structured-content'],
    confidence: 0.8,
    verified: true
  },
  {
    name: 'research-assistant',
    description: 'Research topics, summarize information, and provide citations',
    category: 'Research',
    inputTypes: ['query', 'documents'],
    outputTypes: ['summary', 'analysis'],
    confidence: 0.88,
    verified: true
  },
  {
    name: 'customer-support',
    description: 'Handle customer inquiries, troubleshoot issues, and provide solutions',
    category: 'Support',
    inputTypes: ['query', 'context'],
    outputTypes: ['response', 'solution'],
    confidence: 0.82,
    verified: true
  }
];

const PERSONALITY_PRESETS = {
  professional: { friendliness: 0.6, formality: 0.9, creativity: 0.4, analytical: 0.8, empathy: 0.6 },
  friendly: { friendliness: 0.9, formality: 0.3, creativity: 0.7, analytical: 0.5, empathy: 0.8 },
  analytical: { friendliness: 0.4, formality: 0.7, creativity: 0.3, analytical: 0.95, empathy: 0.4 },
  creative: { friendliness: 0.7, formality: 0.4, creativity: 0.95, analytical: 0.6, empathy: 0.7 },
  supportive: { friendliness: 0.8, formality: 0.6, creativity: 0.6, analytical: 0.7, empathy: 0.9 }
};

export function AgentEditor({ item, availableTools, onSave, onTest, readonly = false }: AgentEditorProps) {
  // Form state
  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: item.name,
      description: item.metadata?.description || '',
      systemPrompt: item.content,
      personality: {
        friendliness: 0.7,
        formality: 0.6,
        creativity: 0.6,
        analytical: 0.7,
        empathy: 0.6
      },
      responseStyle: {
        verbosity: 'normal',
        tone: 'professional',
        structure: 'structured'
      },
      capabilities: [],
      constraints: []
    }
  });

  // Editor state
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [conversationFlow, setConversationFlow] = useState<ConversationFlow | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingAgent, setIsTestingAgent] = useState(false);
  const [behaviorScore, setBehaviorScore] = useState(75);
  const [showToolIntegration, setShowToolIntegration] = useState(false);
  const [constraints, setConstraints] = useState<string[]>(['Be helpful and accurate', 'Follow ethical guidelines']);
  const [newConstraint, setNewConstraint] = useState('');

  const { watch, setValue } = form;
  const watchedPersonality = watch('personality');
  const watchedSystemPrompt = watch('systemPrompt');

  // Calculate behavior score based on personality traits
  useEffect(() => {
    const personality = watchedPersonality;
    const balance = 1 - Math.abs(0.5 - (personality.friendliness + personality.formality + 
      personality.creativity + personality.analytical + personality.empathy) / 5);
    const completeness = selectedCapabilities.length / 5; // Assume 5 is ideal
    const promptQuality = Math.min(watchedSystemPrompt.length / 200, 1); // 200 chars as baseline
    
    const score = Math.round((balance * 40 + completeness * 30 + promptQuality * 30) * 100);
    setBehaviorScore(Math.min(score, 100));
  }, [watchedPersonality, selectedCapabilities.length, watchedSystemPrompt]);

  // Apply personality preset
  const applyPersonalityPreset = (preset: string) => {
    const traits = PERSONALITY_PRESETS[preset as keyof typeof PERSONALITY_PRESETS];
    if (traits) {
      setValue('personality', traits);
    }
  };

  // Handle capability selection
  const handleCapabilityToggle = (capabilityName: string) => {
    const updated = selectedCapabilities.includes(capabilityName)
      ? selectedCapabilities.filter(c => c !== capabilityName)
      : [...selectedCapabilities, capabilityName];
    
    setSelectedCapabilities(updated);
    setValue('capabilities', updated);
  };

  // Handle tool selection
  const handleToolToggle = (toolId: string) => {
    const updated = selectedTools.includes(toolId)
      ? selectedTools.filter(t => t !== toolId)
      : [...selectedTools, toolId];
    
    setSelectedTools(updated);
  };

  // Add constraint
  const addConstraint = () => {
    if (newConstraint && !constraints.includes(newConstraint)) {
      const updated = [...constraints, newConstraint];
      setConstraints(updated);
      setValue('constraints', updated);
      setNewConstraint('');
    }
  };

  // Remove constraint
  const removeConstraint = (index: number) => {
    const updated = constraints.filter((_, i) => i !== index);
    setConstraints(updated);
    setValue('constraints', updated);
  };

  // Test agent configuration
  const handleTestAgent = async () => {
    setIsTestingAgent(true);
    try {
      const testConfig = {
        systemPrompt: watchedSystemPrompt,
        personality: watchedPersonality,
        capabilities: selectedCapabilities,
        tools: selectedTools
      };
      
      const result = await onTest(testConfig);
      setTestResults(result);
    } catch (error) {
      console.error('Agent testing failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setIsTestingAgent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Behavior Score Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>Agent Behavior Configuration</span>
              </CardTitle>
              <CardDescription>
                Define your agent's personality, capabilities, and behavior patterns
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{behaviorScore}%</div>
              <Progress value={behaviorScore} className="w-24" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <Tabs defaultValue="personality" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personality">Personality</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          {/* Personality Tab */}
          <TabsContent value="personality" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Core agent identity and system prompt</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="Enter agent name"
                      disabled={readonly}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...form.register('description')}
                      placeholder="Describe what this agent does"
                      rows={3}
                      disabled={readonly}
                    />
                  </div>

                  <div>
                    <Label htmlFor="systemPrompt">System Prompt</Label>
                    <div className="border rounded-md overflow-hidden">
                      <MonacoEditor
                        height="300px"
                        language="text"
                        value={watchedSystemPrompt}
                        onChange={(value) => setValue('systemPrompt', value || '')}
                        options={{
                          readOnly: readonly,
                          minimap: { enabled: false },
                          wordWrap: 'on',
                          lineNumbers: 'off',
                          scrollBeyondLastLine: false,
                          theme: 'vs-light',
                          fontSize: 14
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personality Traits */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Personality Traits</CardTitle>
                      <CardDescription>Configure agent's personality characteristics</CardDescription>
                    </div>
                    <Select onValueChange={applyPersonalityPreset}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Presets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="analytical">Analytical</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="supportive">Supportive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(watchedPersonality).map(([trait, value]) => (
                    <div key={trait} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="capitalize">{trait.replace(/([A-Z])/g, ' $1')}</Label>
                        <span className="text-sm text-muted-foreground">{Math.round(value * 100)}%</span>
                      </div>
                      <Slider
                        value={[value]}
                        onValueChange={([newValue]) => {
                          setValue(`personality.${trait}` as any, newValue);
                        }}
                        max={1}
                        min={0}
                        step={0.05}
                        className="w-full"
                        disabled={readonly}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Response Style */}
            <Card>
              <CardHeader>
                <CardTitle>Response Style</CardTitle>
                <CardDescription>Configure how the agent communicates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Verbosity</Label>
                    <Select 
                      value={watch('responseStyle.verbosity')} 
                      onValueChange={(value) => setValue('responseStyle.verbosity', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tone</Label>
                    <Select 
                      value={watch('responseStyle.tone')} 
                      onValueChange={(value) => setValue('responseStyle.tone', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Structure</Label>
                    <Select 
                      value={watch('responseStyle.structure')} 
                      onValueChange={(value) => setValue('responseStyle.structure', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freeform">Freeform</SelectItem>
                        <SelectItem value="structured">Structured</SelectItem>
                        <SelectItem value="bullet-points">Bullet Points</SelectItem>
                        <SelectItem value="numbered">Numbered List</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Constraints */}
            <Card>
              <CardHeader>
                <CardTitle>Behavioral Constraints</CardTitle>
                <CardDescription>Define rules and limitations for agent behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {constraints.map((constraint, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Badge variant="secondary" className="flex-1 justify-start px-3 py-2">
                        {constraint}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeConstraint(index)}
                        disabled={readonly}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add new constraint"
                    value={newConstraint}
                    onChange={(e) => setNewConstraint(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addConstraint();
                      }
                    }}
                    disabled={readonly}
                  />
                  <Button type="button" onClick={addConstraint} variant="outline" disabled={readonly}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Capabilities Tab */}
          <TabsContent value="capabilities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Agent Capabilities</span>
                </CardTitle>
                <CardDescription>
                  Select the capabilities your agent should have
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CAPABILITY_CATALOG.map((capability) => (
                    <Card 
                      key={capability.name} 
                      className={`border-2 cursor-pointer transition-colors ${
                        selectedCapabilities.includes(capability.name) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => !readonly && handleCapabilityToggle(capability.name)}
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                checked={selectedCapabilities.includes(capability.name)}
                                disabled={readonly}
                              />
                              <Badge variant="outline">{capability.category}</Badge>
                            </div>
                            {capability.verified && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-semibold capitalize">
                              {capability.name.replace(/-/g, ' ')}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {capability.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Confidence: {Math.round(capability.confidence * 100)}%
                            </span>
                            <div className="flex space-x-1">
                              {capability.inputTypes.slice(0, 2).map(type => (
                                <Badge key={type} variant="secondary" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Puzzle className="h-5 w-5" />
                  <span>Tool Integration</span>
                </CardTitle>
                <CardDescription>
                  Connect external tools and services to enhance agent capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availableTools.length === 0 ? (
                  <div className="text-center py-8">
                    <Puzzle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No tools available. Configure tools in settings first.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableTools.map((tool) => (
                      <Card 
                        key={tool.id} 
                        className={`border-2 cursor-pointer transition-colors ${
                          selectedTools.includes(tool.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => !readonly && handleToolToggle(tool.id)}
                      >
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={selectedTools.includes(tool.id)}
                                  disabled={readonly}
                                />
                                <h4 className="font-semibold">{tool.name}</h4>
                              </div>
                              <Badge variant="outline">{tool.category}</Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {tool.description}
                            </p>
                            
                            <div className="text-xs text-muted-foreground">
                              Input: {tool.inputSchema?.type || 'any'} → Output: {tool.outputSchema?.type || 'any'}
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

          {/* Conversation Tab */}
          <TabsContent value="conversation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Conversation Flow</span>
                </CardTitle>
                <CardDescription>
                  Define how the agent handles conversations and interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Workflow className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Visual Flow Builder</h3>
                  <p className="text-muted-foreground mb-4">
                    Interactive conversation flow designer coming soon
                  </p>
                  <Button variant="outline" disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Build Flow
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TestTube className="h-5 w-5" />
                  <span>Agent Testing</span>
                </CardTitle>
                <CardDescription>
                  Test your agent configuration with sample interactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Test Agent Behavior</h4>
                    <p className="text-sm text-muted-foreground">
                      Run a simulated conversation to test agent responses
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleTestAgent}
                    disabled={isTestingAgent || readonly}
                  >
                    {isTestingAgent ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Run Test
                      </>
                    )}
                  </Button>
                </div>
                
                {testResults && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Test Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {testResults.error ? (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{testResults.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Response Time:</span>
                              <div className="font-semibold">{testResults.responseTime || 'N/A'}ms</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Coherence Score:</span>
                              <div className="font-semibold">{testResults.coherenceScore || 'N/A'}%</div>
                            </div>
                          </div>
                          
                          {testResults.sampleResponse && (
                            <div>
                              <Label className="text-sm font-semibold">Sample Response:</Label>
                              <div className="bg-muted p-3 rounded text-sm mt-1">
                                {testResults.sampleResponse}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
          <Button type="button" variant="outline" onClick={() => setShowToolIntegration(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button type="submit" disabled={readonly}>
            <Save className="mr-2 h-4 w-4" />
            Save Agent
          </Button>
        </div>
      </form>
    </div>
  );
}