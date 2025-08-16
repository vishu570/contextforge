'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Save, 
  X, 
  Eye, 
  Clock, 
  AlertTriangle, 
  Lightbulb, 
  History, 
  GitBranch,
  Tags,
  Settings,
  FileText,
  Share,
  Play,
  Copy,
  Download,
  Upload,
  Code2,
  Zap,
  BarChart3,
  Users,
  MessageSquare,
  Workflow,
  Calculator,
  TestTube,
  Table,
  List,
  Type,
  Bold,
  Italic,
  Underline,
  Link,
  Image,
  Hash,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Split,
  RefreshCw,
  Target,
  Layers,
  Filter,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Dynamically import Monaco Editor
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-muted rounded-md flex items-center justify-center">
      Loading advanced editor...
    </div>
  ),
});

// Schema for advanced prompt editor
const advancedPromptSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  description: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    defaultValue: z.any().optional(),
    required: z.boolean(),
    description: z.string().optional(),
  })),
  targetModels: z.array(z.string()),
  format: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()),
  metadata: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).optional(),
    systemPrompt: z.string().optional(),
    responseFormat: z.enum(['text', 'json', 'xml']).optional(),
  }).optional(),
});

type AdvancedPromptFormData = z.infer<typeof advancedPromptSchema>;

interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue?: any;
  required: boolean;
  description?: string;
}

interface TemplateBlock {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: PromptVariable[];
}

interface Version {
  id: string;
  versionNumber: number;
  content: string;
  changes: string;
  createdAt: string;
  createdBy: string;
  approved: boolean;
  metrics?: {
    tokenCount: number;
    estimatedCost: number;
    performance: number;
  };
}

interface CollaboratorComment {
  id: string;
  user: string;
  content: string;
  position: { line: number; column: number };
  resolved: boolean;
  createdAt: string;
  replies: Array<{
    id: string;
    user: string;
    content: string;
    createdAt: string;
  }>;
}

interface AdvancedPromptEditorProps {
  initialData?: Partial<AdvancedPromptFormData>;
  onSave?: (data: AdvancedPromptFormData) => Promise<void>;
  onCancel?: () => void;
  readonly?: boolean;
  collaborative?: boolean;
  showTesting?: boolean;
  showAnalytics?: boolean;
}

const AI_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', costPer1K: 0.03 },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', costPer1K: 0.001 },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', costPer1K: 0.015 },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', costPer1K: 0.003 },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', costPer1K: 0.0005 },
];

const TEMPLATE_BLOCKS: TemplateBlock[] = [
  {
    id: 'system-instruction',
    name: 'System Instruction',
    content: 'You are a helpful AI assistant. Please follow these guidelines:\n- Be accurate and factual\n- Provide clear, concise responses\n- Ask for clarification when needed\n{{additional_instructions}}',
    category: 'System',
    variables: [{
      name: 'additional_instructions',
      type: 'string',
      required: false,
      description: 'Additional specific instructions'
    }],
  },
  {
    id: 'task-context',
    name: 'Task Context',
    content: 'Task: {{task_name}}\nContext: {{context}}\nObjective: {{objective}}\nConstraints: {{constraints}}',
    category: 'Structure',
    variables: [
      { name: 'task_name', type: 'string', required: true, description: 'Name of the task' },
      { name: 'context', type: 'string', required: true, description: 'Background context' },
      { name: 'objective', type: 'string', required: true, description: 'What you want to achieve' },
      { name: 'constraints', type: 'string', required: false, description: 'Any limitations or requirements' },
    ],
  },
  {
    id: 'output-format',
    name: 'Output Format',
    content: 'Please format your response as:\n```{{format_type}}\n{{example}}\n```\nEnsure the output is valid {{format_type}} and follows the structure shown above.',
    category: 'Format',
    variables: [
      { name: 'format_type', type: 'string', required: true, description: 'Output format (JSON, XML, CSV, etc.)' },
      { name: 'example', type: 'string', required: true, description: 'Example of the desired format' },
    ],
  },
];

export function AdvancedPromptEditor({
  initialData,
  onSave,
  onCancel,
  readonly = false,
  collaborative = false,
  showTesting = true,
  showAnalytics = true,
}: AdvancedPromptEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [editorMode, setEditorMode] = useState<'rich' | 'markdown' | 'code'>('rich');
  const [previewMode, setPreviewMode] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Variables and templates
  const [variables, setVariables] = useState<PromptVariable[]>(initialData?.variables || []);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [showTemplateBlocks, setShowTemplateBlocks] = useState(false);
  
  // Collaboration
  const [comments, setComments] = useState<CollaboratorComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  
  // Versioning
  const [versions, setVersions] = useState<Version[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  
  // Testing and Analytics
  const [testResults, setTestResults] = useState<any[]>([]);
  const [tokenCount, setTokenCount] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  
  // A/B Testing
  const [abTests, setAbTests] = useState<any[]>([]);
  const [showAbTesting, setShowAbTesting] = useState(false);
  
  const editorRef = useRef<any>(null);
  
  const form = useForm<AdvancedPromptFormData>({
    resolver: zodResolver(advancedPromptSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      description: initialData?.description || '',
      variables: variables,
      targetModels: initialData?.targetModels || ['gpt-4'],
      format: initialData?.format || 'text',
      category: initialData?.category || '',
      tags: initialData?.tags || [],
      metadata: {
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: '',
        responseFormat: 'text',
        ...initialData?.metadata,
      },
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedContent = watch('content');
  const watchedTargetModels = watch('targetModels');

  // Token counting and cost estimation
  const calculateTokens = useCallback((text: string) => {
    // Simplified token calculation (4 chars ≈ 1 token for GPT models)
    const tokens = Math.ceil(text.length / 4);
    setTokenCount(tokens);
    
    // Calculate cost based on selected models
    const selectedModels = getValues('targetModels');
    const avgCost = selectedModels.reduce((sum, modelId) => {
      const model = AI_MODELS.find(m => m.id === modelId);
      return sum + (model?.costPer1K || 0);
    }, 0) / selectedModels.length;
    
    setEstimatedCost((tokens / 1000) * avgCost);
  }, [getValues]);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!watchedContent || readonly) return;
    
    try {
      setAutoSaveStatus('saving');
      // Simulate auto-save API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (error) {
      setAutoSaveStatus('error');
    }
  }, [watchedContent, readonly]);

  // Effect for auto-save
  useEffect(() => {
    const timer = setTimeout(autoSave, 2000);
    return () => clearTimeout(timer);
  }, [autoSave]);

  // Effect for token counting
  useEffect(() => {
    calculateTokens(watchedContent);
  }, [watchedContent, calculateTokens]);

  const onSubmit = async (data: AdvancedPromptFormData) => {
    setIsLoading(true);
    try {
      if (onSave) {
        await onSave(data);
        toast({
          title: 'Success',
          description: 'Prompt saved successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save prompt',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVariableAdd = (variable: PromptVariable) => {
    const newVariables = [...variables, variable];
    setVariables(newVariables);
    setValue('variables', newVariables);
  };

  const handleVariableRemove = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index);
    setVariables(newVariables);
    setValue('variables', newVariables);
  };

  const insertTemplateBlock = (block: TemplateBlock) => {
    const currentContent = getValues('content');
    const newContent = currentContent + '\n\n' + block.content;
    setValue('content', newContent);
    
    // Add variables from template block
    block.variables.forEach(variable => {
      if (!variables.find(v => v.name === variable.name)) {
        handleVariableAdd(variable);
      }
    });
    
    setShowTemplateBlocks(false);
  };

  const handleFormat = (type: string) => {
    const selection = editorRef.current?.getSelection();
    const content = getValues('content');
    
    // Simple formatting logic (would be more sophisticated in real implementation)
    let formattedText = '';
    switch (type) {
      case 'bold':
        formattedText = `**${selection || 'bold text'}**`;
        break;
      case 'italic':
        formattedText = `*${selection || 'italic text'}*`;
        break;
      case 'code':
        formattedText = `\`${selection || 'code'}\``;
        break;
      case 'quote':
        formattedText = `> ${selection || 'quote'}`;
        break;
      case 'list':
        formattedText = `- ${selection || 'list item'}`;
        break;
      case 'table':
        formattedText = `| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |`;
        break;
      default:
        return;
    }
    
    setValue('content', content + formattedText);
  };

  const exportPrompt = (format: 'json' | 'yaml' | 'txt') => {
    const data = getValues();
    let exportContent = '';
    
    switch (format) {
      case 'json':
        exportContent = JSON.stringify(data, null, 2);
        break;
      case 'yaml':
        // Simple YAML conversion (would use proper YAML library in real implementation)
        exportContent = Object.entries(data).map(([key, value]) => 
          `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
        ).join('\n');
        break;
      case 'txt':
        exportContent = data.content;
        break;
    }
    
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : ''}`}>
      {/* Auto-save status */}
      {autoSaveStatus && (
        <Alert className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {autoSaveStatus === 'saving' && 'Auto-saving...'}
            {autoSaveStatus === 'saved' && 'Auto-saved successfully'}
            {autoSaveStatus === 'error' && 'Auto-save failed'}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header with title and actions */}
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              {...form.register('title')}
              placeholder="Prompt title..."
              className="text-lg font-semibold border-none p-0 shadow-none focus:ring-0"
              disabled={readonly}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Token count and cost */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Hash className="h-4 w-4" />
                <span>{tokenCount} tokens</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calculator className="h-4 w-4" />
                <span>${estimatedCost.toFixed(4)}</span>
              </div>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* View controls */}
            <Button
              type="button"
              variant={splitView ? "default" : "outline"}
              size="sm"
              onClick={() => setSplitView(!splitView)}
            >
              <Split className="h-4 w-4" />
            </Button>
            
            <Button
              type="button"
              variant={isFullscreen ? "default" : "outline"}
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            {/* Export menu */}
            <Select onValueChange={(value) => exportPrompt(value as any)}>
              <SelectTrigger className="w-32">
                <Download className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="yaml">YAML</SelectItem>
                <SelectItem value="txt">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="collaboration">Collaborate</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Main Editor Tab */}
          <TabsContent value="editor" className="space-y-6">
            <div className={splitView ? "grid grid-cols-2 gap-6" : ""}>
              {/* Editor Panel */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Prompt Editor</span>
                    </CardTitle>
                    
                    {/* Formatting toolbar */}
                    <div className="flex items-center space-x-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFormat('bold')}
                        disabled={readonly}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFormat('italic')}
                        disabled={readonly}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFormat('code')}
                        disabled={readonly}
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFormat('quote')}
                        disabled={readonly}
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFormat('list')}
                        disabled={readonly}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFormat('table')}
                        disabled={readonly}
                      >
                        <Table className="h-4 w-4" />
                      </Button>
                      
                      <Separator orientation="vertical" className="h-6" />
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTemplateBlocks(true)}
                        disabled={readonly}
                      >
                        <Layers className="h-4 w-4 mr-1" />
                        Blocks
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        {...form.register('description')}
                        placeholder="Brief description of this prompt..."
                        rows={2}
                        disabled={readonly}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="content">Prompt Content</Label>
                      <div className="mt-2 border rounded-md overflow-hidden">
                        <MonacoEditor
                          ref={editorRef}
                          height="500px"
                          language="markdown"
                          value={watch('content')}
                          onChange={(value) => setValue('content', value || '')}
                          options={{
                            minimap: { enabled: false },
                            wordWrap: 'on',
                            lineNumbers: 'on',
                            folding: true,
                            bracketMatching: 'always',
                            automaticLayout: true,
                            theme: 'vs-dark',
                            readOnly: readonly,
                            fontSize: 14,
                            tabSize: 2,
                            insertSpaces: true,
                            renderWhitespace: 'boundary',
                            cursorBlinking: 'blink',
                            cursorSmoothCaretAnimation: 'on',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Preview Panel (only in split view) */}
              {splitView && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="h-5 w-5" />
                      <span>Live Preview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-lg min-h-[500px]">
                      <h3 className="text-lg font-semibold mb-4">{watch('title') || 'Untitled Prompt'}</h3>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm">
                          {watch('content')}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Additional tabs will be implemented in subsequent components */}
          <TabsContent value="variables">
            <Card>
              <CardHeader>
                <CardTitle>Variable Management</CardTitle>
                <CardDescription>Define and manage template variables</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Variable management system will be implemented next
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testing">
            <Card>
              <CardHeader>
                <CardTitle>Prompt Testing</CardTitle>
                <CardDescription>Test your prompt with different AI models</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Testing playground will be implemented
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="versions">
            <Card>
              <CardHeader>
                <CardTitle>Version History</CardTitle>
                <CardDescription>Track changes and manage versions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Version control system will be implemented
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>View metrics and optimization suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Analytics dashboard will be implemented
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collaboration">
            <Card>
              <CardHeader>
                <CardTitle>Collaboration</CardTitle>
                <CardDescription>Real-time editing and comments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Collaboration features will be implemented
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Prompt Settings</CardTitle>
                <CardDescription>Configure model parameters and metadata</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Settings panel will be implemented
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        {!readonly && (
          <div className="flex items-center justify-between border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>

              <Button
                type="submit"
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save Prompt'}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Template Blocks Dialog */}
      <Dialog open={showTemplateBlocks} onOpenChange={setShowTemplateBlocks}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Template Blocks</DialogTitle>
            <DialogDescription>
              Insert reusable template blocks into your prompt
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {TEMPLATE_BLOCKS.map((block) => (
              <Card key={block.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{block.name}</CardTitle>
                  <Badge variant="outline" className="w-fit">
                    {block.category}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap mb-3">
                    {block.content.length > 100 
                      ? block.content.substring(0, 100) + '...' 
                      : block.content
                    }
                  </pre>
                  <Button
                    onClick={() => insertTemplateBlock(block)}
                    size="sm"
                    className="w-full"
                  >
                    Insert Block
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}