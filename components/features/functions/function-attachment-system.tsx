'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Code2, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Play, 
  Download, 
  Upload, 
  Settings,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Globe,
  Database,
  FileText,
  Terminal,
  Webhook,
  Search,
  Filter,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

// Dynamically import Monaco Editor
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-muted rounded-md flex items-center justify-center">
      Loading code editor...
    </div>
  ),
});

export interface FunctionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required: boolean;
  defaultValue?: any;
  enum?: string[];
  properties?: Record<string, FunctionParameter>;
  items?: FunctionParameter;
}

export interface FunctionDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: FunctionParameter[];
  responseSchema?: any;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'apikey' | 'basic' | 'none';
    key?: string;
    value?: string;
  };
  examples?: Array<{
    name: string;
    parameters: Record<string, any>;
    expectedResponse?: any;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

interface FunctionAttachmentSystemProps {
  promptId?: string;
  attachedFunctions?: string[];
  onFunctionsChange: (functionIds: string[]) => void;
  allowCustomFunctions?: boolean;
  showTesting?: boolean;
}

const FUNCTION_CATEGORIES = [
  'API Calls',
  'Data Processing',
  'File Operations',
  'Web Search',
  'Database',
  'Utilities',
  'AI/ML',
  'Authentication',
  'Webhooks',
  'Custom'
];

const BUILT_IN_FUNCTIONS: Partial<FunctionDefinition>[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web for information',
    category: 'Web Search',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Search query',
        required: true
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Number of results to return',
        required: false,
        defaultValue: 10
      }
    ],
    isActive: true,
    tags: ['search', 'web', 'information']
  },
  {
    id: 'http-request',
    name: 'HTTP Request',
    description: 'Make HTTP requests to external APIs',
    category: 'API Calls',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'The URL to make the request to',
        required: true
      },
      {
        name: 'method',
        type: 'string',
        description: 'HTTP method',
        required: false,
        defaultValue: 'GET',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      },
      {
        name: 'headers',
        type: 'object',
        description: 'Request headers',
        required: false
      },
      {
        name: 'body',
        type: 'object',
        description: 'Request body',
        required: false
      }
    ],
    isActive: true,
    tags: ['http', 'api', 'request']
  },
  {
    id: 'database-query',
    name: 'Database Query',
    description: 'Execute database queries',
    category: 'Database',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'SQL query to execute',
        required: true
      },
      {
        name: 'database',
        type: 'string',
        description: 'Database connection name',
        required: false,
        defaultValue: 'default'
      }
    ],
    isActive: true,
    tags: ['database', 'sql', 'query']
  }
];

export function FunctionAttachmentSystem({
  promptId,
  attachedFunctions = [],
  onFunctionsChange,
  allowCustomFunctions = true,
  showTesting = true
}: FunctionAttachmentSystemProps) {
  const [functions, setFunctions] = useState<FunctionDefinition[]>([]);
  const [filteredFunctions, setFilteredFunctions] = useState<FunctionDefinition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFunction, setEditingFunction] = useState<FunctionDefinition | null>(null);
  const [newFunction, setNewFunction] = useState<Partial<FunctionDefinition>>({
    name: '',
    description: '',
    category: 'Custom',
    parameters: [],
    isActive: true,
    tags: []
  });
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testingFunction, setTestingFunction] = useState<FunctionDefinition | null>(null);
  const [testParameters, setTestParameters] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load built-in and custom functions
    const builtInFunctions = BUILT_IN_FUNCTIONS.map(func => ({
      ...func,
      id: func.id!,
      name: func.name!,
      description: func.description!,
      category: func.category!,
      parameters: func.parameters!,
      isActive: func.isActive!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: func.tags || []
    })) as FunctionDefinition[];

    // Load custom functions from localStorage
    const savedFunctions = localStorage.getItem('contextforge-custom-functions');
    const customFunctions = savedFunctions ? JSON.parse(savedFunctions) : [];

    const allFunctions = [...builtInFunctions, ...customFunctions];
    setFunctions(allFunctions);
    setFilteredFunctions(allFunctions);
  }, []);

  useEffect(() => {
    // Filter functions based on search term and category
    let filtered = functions.filter(func => {
      const matchesSearch = !searchTerm || 
        func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || func.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    setFilteredFunctions(filtered);
  }, [functions, searchTerm, selectedCategory]);

  const handleFunctionToggle = (functionId: string) => {
    const newAttached = attachedFunctions.includes(functionId)
      ? attachedFunctions.filter(id => id !== functionId)
      : [...attachedFunctions, functionId];
    
    onFunctionsChange(newAttached);
  };

  const handleCreateFunction = () => {
    if (!newFunction.name || !newFunction.description) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    const functionDef: FunctionDefinition = {
      id: `custom-${Date.now()}`,
      name: newFunction.name,
      description: newFunction.description,
      category: newFunction.category || 'Custom',
      parameters: newFunction.parameters || [],
      responseSchema: newFunction.responseSchema,
      endpoint: newFunction.endpoint,
      method: newFunction.method,
      headers: newFunction.headers,
      authentication: newFunction.authentication,
      examples: newFunction.examples,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: newFunction.tags || []
    };

    const updatedFunctions = [...functions, functionDef];
    setFunctions(updatedFunctions);

    // Save custom functions
    const customFunctions = updatedFunctions.filter(f => f.id.startsWith('custom-'));
    localStorage.setItem('contextforge-custom-functions', JSON.stringify(customFunctions));

    setShowCreateDialog(false);
    setNewFunction({
      name: '',
      description: '',
      category: 'Custom',
      parameters: [],
      isActive: true,
      tags: []
    });

    toast({
      title: 'Success',
      description: 'Function created successfully'
    });
  };

  const handleDeleteFunction = (functionId: string) => {
    if (!functionId.startsWith('custom-')) {
      toast({
        title: 'Error',
        description: 'Cannot delete built-in functions',
        variant: 'destructive'
      });
      return;
    }

    const updatedFunctions = functions.filter(f => f.id !== functionId);
    setFunctions(updatedFunctions);

    const customFunctions = updatedFunctions.filter(f => f.id.startsWith('custom-'));
    localStorage.setItem('contextforge-custom-functions', JSON.stringify(customFunctions));

    // Remove from attached functions
    onFunctionsChange(attachedFunctions.filter(id => id !== functionId));

    toast({
      title: 'Success',
      description: 'Function deleted successfully'
    });
  };

  const handleTestFunction = async (func: FunctionDefinition) => {
    setTestingFunction(func);
    setTestParameters({});
    setTestResult(null);
    setShowTestDialog(true);
  };

  const executeTest = async () => {
    if (!testingFunction) return;

    try {
      // Simulate function execution
      const result = {
        success: true,
        executedAt: new Date().toISOString(),
        parameters: testParameters,
        response: {
          message: 'Function executed successfully',
          data: { result: 'Mock response data' }
        }
      };

      setTestResult(result);
      toast({
        title: 'Test Executed',
        description: 'Function test completed successfully'
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Test execution failed',
        details: error
      });
    }
  };

  const exportFunctions = () => {
    const customFunctions = functions.filter(f => f.id.startsWith('custom-'));
    const dataStr = JSON.stringify(customFunctions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contextforge-functions.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFunctions = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedFunctions = JSON.parse(e.target?.result as string);
        const updatedFunctions = [...functions, ...importedFunctions];
        setFunctions(updatedFunctions);

        const customFunctions = updatedFunctions.filter(f => f.id.startsWith('custom-'));
        localStorage.setItem('contextforge-custom-functions', JSON.stringify(customFunctions));

        toast({
          title: 'Success',
          description: `Imported ${importedFunctions.length} functions`
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to import functions',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  };

  const toggleExpanded = (functionId: string) => {
    const newExpanded = new Set(expandedFunctions);
    if (newExpanded.has(functionId)) {
      newExpanded.delete(functionId);
    } else {
      newExpanded.add(functionId);
    }
    setExpandedFunctions(newExpanded);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'API Calls': return <Globe className="h-4 w-4" />;
      case 'Database': return <Database className="h-4 w-4" />;
      case 'Web Search': return <Search className="h-4 w-4" />;
      case 'File Operations': return <FileText className="h-4 w-4" />;
      case 'Webhooks': return <Webhook className="h-4 w-4" />;
      case 'Utilities': return <Settings className="h-4 w-4" />;
      default: return <Code2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Function Attachment System</h2>
          <p className="text-muted-foreground">
            Attach functions to enhance your prompts with external capabilities
          </p>
        </div>
        
        <div className="flex space-x-2">
          {allowCustomFunctions && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={exportFunctions}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('import-functions')?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <input
                id="import-functions"
                type="file"
                accept=".json"
                className="hidden"
                onChange={importFunctions}
              />
              
              <Button
                onClick={() => setShowCreateDialog(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Function
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Attached Functions Summary */}
      {attachedFunctions.length > 0 && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{attachedFunctions.length} function(s) attached to this prompt</span>
              <div className="flex flex-wrap gap-1">
                {attachedFunctions.map(id => {
                  const func = functions.find(f => f.id === id);
                  return func ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {func.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search functions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {FUNCTION_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(category)}
                        <span>{category}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Function List */}
      <div className="grid gap-4">
        {filteredFunctions.map((func) => {
          const isAttached = attachedFunctions.includes(func.id);
          const isExpanded = expandedFunctions.has(func.id);
          
          return (
            <Card key={func.id} className={isAttached ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={isAttached}
                      onCheckedChange={() => handleFunctionToggle(func.id)}
                    />
                    
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(func.category)}
                      <div>
                        <CardTitle className="text-lg">{func.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {func.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{func.category}</Badge>
                    
                    {showTesting && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestFunction(func)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {func.id.startsWith('custom-') && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingFunction(func);
                            setNewFunction(func);
                            setShowCreateDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteFunction(func.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(func.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  <Tabs defaultValue="parameters">
                    <TabsList>
                      <TabsTrigger value="parameters">Parameters</TabsTrigger>
                      <TabsTrigger value="examples">Examples</TabsTrigger>
                      {func.endpoint && <TabsTrigger value="endpoint">Endpoint</TabsTrigger>}
                    </TabsList>
                    
                    <TabsContent value="parameters" className="mt-4">
                      {func.parameters.length > 0 ? (
                        <div className="space-y-3">
                          {func.parameters.map((param, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant={param.required ? 'destructive' : 'secondary'}>
                                    {param.name}
                                  </Badge>
                                  <Badge variant="outline">{param.type}</Badge>
                                </div>
                                {param.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              
                              {param.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {param.description}
                                </p>
                              )}
                              
                              {param.defaultValue && (
                                <div className="text-xs">
                                  <span className="font-medium">Default: </span>
                                  <code className="bg-muted px-1 rounded">
                                    {JSON.stringify(param.defaultValue)}
                                  </code>
                                </div>
                              )}
                              
                              {param.enum && (
                                <div className="text-xs mt-1">
                                  <span className="font-medium">Options: </span>
                                  {param.enum.map((option, i) => (
                                    <Badge key={i} variant="outline" className="text-xs mr-1">
                                      {option}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No parameters defined</p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="examples" className="mt-4">
                      {func.examples && func.examples.length > 0 ? (
                        <div className="space-y-4">
                          {func.examples.map((example, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <h4 className="font-medium mb-2">{example.name}</h4>
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Parameters:</Label>
                                  <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                    {JSON.stringify(example.parameters, null, 2)}
                                  </pre>
                                </div>
                                {example.expectedResponse && (
                                  <div>
                                    <Label className="text-xs">Expected Response:</Label>
                                    <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                      {JSON.stringify(example.expectedResponse, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No examples provided</p>
                      )}
                    </TabsContent>
                    
                    {func.endpoint && (
                      <TabsContent value="endpoint" className="mt-4">
                        <div className="space-y-3">
                          <div>
                            <Label>Endpoint URL</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge>{func.method || 'GET'}</Badge>
                              <code className="flex-1 bg-muted p-2 rounded text-sm">
                                {func.endpoint}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(func.endpoint || '');
                                  toast({ title: 'Copied to clipboard' });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {func.headers && Object.keys(func.headers).length > 0 && (
                            <div>
                              <Label>Headers</Label>
                              <pre className="bg-muted p-2 rounded text-xs mt-1">
                                {JSON.stringify(func.headers, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {func.authentication && func.authentication.type !== 'none' && (
                            <div>
                              <Label>Authentication</Label>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge>{func.authentication.type}</Badge>
                                {func.authentication.key && (
                                  <span className="text-sm text-muted-foreground">
                                    Key: {func.authentication.key}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredFunctions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Code2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No functions found. {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your filters.' 
                : 'Create your first function to get started.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Function Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFunction ? 'Edit Function' : 'Create New Function'}
            </DialogTitle>
            <DialogDescription>
              Define a custom function with parameters and configuration
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Function Name</Label>
                <Input
                  value={newFunction.name || ''}
                  onChange={(e) => setNewFunction(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Custom Function"
                />
              </div>
              
              <div>
                <Label>Category</Label>
                <Select
                  value={newFunction.category}
                  onValueChange={(value) => setNewFunction(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNCTION_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={newFunction.description || ''}
                onChange={(e) => setNewFunction(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this function does..."
                rows={3}
              />
            </div>
            
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={newFunction.tags?.join(', ') || ''}
                onChange={(e) => setNewFunction(prev => ({ 
                  ...prev, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                }))}
                placeholder="api, search, utility"
              />
            </div>
            
            {/* Parameters would be implemented here */}
            <div>
              <Label>Parameters</Label>
              <div className="text-sm text-muted-foreground">
                Parameter editor will be implemented in the next iteration
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingFunction(null);
                  setNewFunction({
                    name: '',
                    description: '',
                    category: 'Custom',
                    parameters: [],
                    isActive: true,
                    tags: []
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateFunction}>
                {editingFunction ? 'Update Function' : 'Create Function'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Function Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Function: {testingFunction?.name}</DialogTitle>
            <DialogDescription>
              Test your function with sample parameters
            </DialogDescription>
          </DialogHeader>
          
          {testingFunction && (
            <div className="space-y-4">
              <div>
                <Label>Parameters</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Configure test parameters for this function
                </div>
                {/* Parameter inputs would be dynamically generated here */}
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">Parameter testing interface will be implemented</p>
                </div>
              </div>
              
              {testResult && (
                <div>
                  <Label>Test Result</Label>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-60">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                  Close
                </Button>
                <Button onClick={executeTest}>
                  <Play className="h-4 w-4 mr-1" />
                  Run Test
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}