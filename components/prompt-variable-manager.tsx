'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus,
  X,
  Edit,
  Trash2,
  Code2,
  Type,
  Hash,
  ToggleLeft,
  List,
  Braces,
  AlertTriangle,
  Info,
  Copy,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const variableSchema = z.object({
  name: z.string()
    .min(1, 'Variable name is required')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Variable name must be a valid identifier'),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  defaultValue: z.any().optional(),
  required: z.boolean(),
  description: z.string().optional(),
  constraints: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.string()).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
});

type VariableFormData = z.infer<typeof variableSchema>;

export interface PromptVariable extends VariableFormData {
  id: string;
  usage: Array<{ line: number; column: number }>;
  lastModified: string;
}

interface PromptVariableManagerProps {
  variables: PromptVariable[];
  promptContent: string;
  onVariablesChange: (variables: PromptVariable[]) => void;
  onInsertVariable: (variableName: string) => void;
  readonly?: boolean;
}

const VARIABLE_TYPES = [
  { value: 'string', label: 'String', icon: Type, description: 'Text value' },
  { value: 'number', label: 'Number', icon: Hash, description: 'Numeric value' },
  { value: 'boolean', label: 'Boolean', icon: ToggleLeft, description: 'True/false value' },
  { value: 'array', label: 'Array', icon: List, description: 'List of values' },
  { value: 'object', label: 'Object', icon: Braces, description: 'Structured data' },
];

const PREDEFINED_VARIABLES = [
  {
    name: 'user_name',
    type: 'string' as const,
    description: 'Current user\'s name',
    required: false,
    defaultValue: '',
  },
  {
    name: 'current_date',
    type: 'string' as const,
    description: 'Current date in YYYY-MM-DD format',
    required: false,
    defaultValue: new Date().toISOString().split('T')[0],
  },
  {
    name: 'task_complexity',
    type: 'string' as const,
    description: 'Complexity level of the task',
    required: false,
    defaultValue: 'medium',
    constraints: {
      enum: ['simple', 'medium', 'complex', 'expert'],
    },
  },
  {
    name: 'output_length',
    type: 'number' as const,
    description: 'Desired output length in words',
    required: false,
    defaultValue: 100,
    constraints: {
      min: 1,
      max: 5000,
    },
  },
];

export function PromptVariableManager({
  variables,
  promptContent,
  onVariablesChange,
  onInsertVariable,
  readonly = false,
}: PromptVariableManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingVariable, setEditingVariable] = useState<PromptVariable | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'usage'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showPredefined, setShowPredefined] = useState(false);

  const form = useForm<VariableFormData>({
    resolver: zodResolver(variableSchema),
    defaultValues: {
      name: '',
      type: 'string',
      defaultValue: '',
      required: false,
      description: '',
      constraints: {},
    },
  });

  // Analyze variable usage in prompt content
  const analyzeVariableUsage = (variableName: string): Array<{ line: number; column: number }> => {
    const usage: Array<{ line: number; column: number }> = [];
    const lines = promptContent.split('\n');
    
    lines.forEach((line, lineIndex) => {
      const regex = new RegExp(`{{\\s*${variableName}\\s*}}`, 'g');
      let match;
      while ((match = regex.exec(line)) !== null) {
        usage.push({
          line: lineIndex + 1,
          column: match.index + 1,
        });
      }
    });
    
    return usage;
  };

  // Find unused variables
  const getUnusedVariables = (): PromptVariable[] => {
    return variables.filter(variable => {
      const usage = analyzeVariableUsage(variable.name);
      return usage.length === 0;
    });
  };

  // Find undefined variables (used in content but not defined)
  const getUndefinedVariables = (): string[] => {
    const definedNames = new Set(variables.map(v => v.name));
    const usedNames = new Set<string>();
    
    const regex = /{{\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*}}/g;
    let match;
    while ((match = regex.exec(promptContent)) !== null) {
      usedNames.add(match[1]);
    }
    
    return Array.from(usedNames).filter(name => !definedNames.has(name));
  };

  // Filter and sort variables
  const filteredAndSortedVariables = variables
    .filter(variable => {
      const matchesSearch = variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (variable.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesType = !typeFilter || variable.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'usage':
          const aUsage = analyzeVariableUsage(a.name).length;
          const bUsage = analyzeVariableUsage(b.name).length;
          comparison = aUsage - bUsage;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const onSubmit = (data: VariableFormData) => {
    const newVariable: PromptVariable = {
      ...data,
      id: editingVariable?.id || Math.random().toString(36).substr(2, 9),
      usage: analyzeVariableUsage(data.name),
      lastModified: new Date().toISOString(),
    };

    if (editingVariable) {
      const updatedVariables = variables.map(v => 
        v.id === editingVariable.id ? newVariable : v
      );
      onVariablesChange(updatedVariables);
      toast({
        title: 'Variable updated',
        description: `Variable "${data.name}" has been updated successfully.`,
      });
    } else {
      onVariablesChange([...variables, newVariable]);
      toast({
        title: 'Variable added',
        description: `Variable "${data.name}" has been added successfully.`,
      });
    }

    form.reset();
    setEditingVariable(null);
    setShowAddDialog(false);
  };

  const handleEdit = (variable: PromptVariable) => {
    setEditingVariable(variable);
    form.reset(variable);
    setShowAddDialog(true);
  };

  const handleDelete = (variableId: string) => {
    const variable = variables.find(v => v.id === variableId);
    if (!variable) return;

    const usage = analyzeVariableUsage(variable.name);
    if (usage.length > 0) {
      if (!confirm(`Variable "${variable.name}" is used ${usage.length} time(s) in the prompt. Are you sure you want to delete it?`)) {
        return;
      }
    }

    const updatedVariables = variables.filter(v => v.id !== variableId);
    onVariablesChange(updatedVariables);
    
    toast({
      title: 'Variable deleted',
      description: `Variable "${variable.name}" has been deleted.`,
    });
  };

  const handleClone = (variable: PromptVariable) => {
    const clonedVariable: PromptVariable = {
      ...variable,
      id: Math.random().toString(36).substr(2, 9),
      name: `${variable.name}_copy`,
      lastModified: new Date().toISOString(),
      usage: [],
    };
    
    onVariablesChange([...variables, clonedVariable]);
    toast({
      title: 'Variable cloned',
      description: `Variable "${clonedVariable.name}" has been created.`,
    });
  };

  const addPredefinedVariable = (predefined: typeof PREDEFINED_VARIABLES[0]) => {
    if (variables.find(v => v.name === predefined.name)) {
      toast({
        title: 'Variable exists',
        description: `Variable "${predefined.name}" already exists.`,
        variant: 'destructive',
      });
      return;
    }

    const newVariable: PromptVariable = {
      ...predefined,
      id: Math.random().toString(36).substr(2, 9),
      usage: analyzeVariableUsage(predefined.name),
      lastModified: new Date().toISOString(),
    };

    onVariablesChange([...variables, newVariable]);
    toast({
      title: 'Variable added',
      description: `Predefined variable "${predefined.name}" has been added.`,
    });
  };

  const exportVariables = () => {
    const exportData = {
      variables: variables.map(({ id, usage, lastModified, ...rest }) => rest),
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt-variables.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        const importedVariables = importData.variables || importData;
        
        const newVariables = importedVariables.map((variable: any) => ({
          ...variable,
          id: Math.random().toString(36).substr(2, 9),
          usage: analyzeVariableUsage(variable.name),
          lastModified: new Date().toISOString(),
        }));
        
        onVariablesChange([...variables, ...newVariables]);
        toast({
          title: 'Variables imported',
          description: `${newVariables.length} variables imported successfully.`,
        });
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Invalid JSON file format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const unusedVariables = getUnusedVariables();
  const undefinedVariables = getUndefinedVariables();

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Variable Management</h3>
          <p className="text-sm text-muted-foreground">
            Define and manage template variables for your prompt
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPredefined(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Predefined
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportVariables}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-1" />
                Import
              </span>
            </Button>
          </label>
          
          {!readonly && (
            <Button
              onClick={() => {
                setEditingVariable(null);
                form.reset();
                setShowAddDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          )}
        </div>
      </div>

      {/* Alerts for issues */}
      {unusedVariables.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {unusedVariables.length} unused variable(s): {unusedVariables.map(v => v.name).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {undefinedVariables.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Undefined variable(s) found in prompt: {undefinedVariables.join(', ')}
            <Button
              variant="link"
              size="sm"
              className="ml-2 p-0 h-auto"
              onClick={() => {
                undefinedVariables.forEach(name => {
                  const newVariable: PromptVariable = {
                    id: Math.random().toString(36).substr(2, 9),
                    name,
                    type: 'string',
                    required: false,
                    usage: analyzeVariableUsage(name),
                    lastModified: new Date().toISOString(),
                  };
                  onVariablesChange([...variables, newVariable]);
                });
              }}
            >
              Add all
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search and filter controls */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            {VARIABLE_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="type">Type</SelectItem>
            <SelectItem value="usage">Usage</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </Button>
      </div>

      {/* Variables list */}
      <div className="space-y-4">
        {filteredAndSortedVariables.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Code2 className="mx-auto h-12 w-12 mb-4" />
                <p>No variables defined yet</p>
                <p className="text-sm">Add variables to make your prompts dynamic and reusable</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedVariables.map((variable) => {
            const usage = analyzeVariableUsage(variable.name);
            const TypeIcon = VARIABLE_TYPES.find(t => t.value === variable.type)?.icon || Type;
            
            return (
              <Card key={variable.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                            {`{{${variable.name}}}`}
                          </code>
                          <Badge variant="outline">{variable.type}</Badge>
                          {variable.required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <span>Used {usage.length} time(s)</span>
                          {usage.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1"
                              onClick={() => onInsertVariable(variable.name)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {variable.description && (
                        <p className="text-sm text-muted-foreground">
                          {variable.description}
                        </p>
                      )}
                      
                      {variable.defaultValue !== undefined && variable.defaultValue !== '' && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Default: </span>
                          <code className="bg-muted px-1 rounded">
                            {typeof variable.defaultValue === 'object' 
                              ? JSON.stringify(variable.defaultValue)
                              : String(variable.defaultValue)
                            }
                          </code>
                        </div>
                      )}
                      
                      {variable.constraints && Object.keys(variable.constraints).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(variable.constraints).map(([key, value]) => 
                            value !== undefined && (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                              </Badge>
                            )
                          )}
                        </div>
                      )}
                    </div>
                    
                    {!readonly && (
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onInsertVariable(variable.name)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClone(variable)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(variable)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(variable.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Variable Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingVariable ? 'Edit Variable' : 'Add Variable'}
            </DialogTitle>
            <DialogDescription>
              Define a template variable for dynamic content in your prompt
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Variable Name</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="variable_name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={form.watch('type')}
                  onValueChange={(value: any) => form.setValue('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <type.icon className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Describe what this variable represents..."
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="defaultValue">Default Value</Label>
              <Input
                id="defaultValue"
                {...form.register('defaultValue')}
                placeholder="Optional default value"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={form.watch('required')}
                onCheckedChange={(checked) => form.setValue('required', !!checked)}
              />
              <Label htmlFor="required">Required variable</Label>
            </div>
            
            {/* Constraints section based on type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Constraints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.watch('type') === 'string' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="minLength">Min Length</Label>
                        <Input
                          id="minLength"
                          type="number"
                          {...form.register('constraints.minLength', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxLength">Max Length</Label>
                        <Input
                          id="maxLength"
                          type="number"
                          {...form.register('constraints.maxLength', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="pattern">Pattern (Regex)</Label>
                      <Input
                        id="pattern"
                        {...form.register('constraints.pattern')}
                        placeholder="^[A-Za-z]+$"
                      />
                    </div>
                  </>
                )}
                
                {form.watch('type') === 'number' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="min">Minimum</Label>
                      <Input
                        id="min"
                        type="number"
                        {...form.register('constraints.min', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max">Maximum</Label>
                      <Input
                        id="max"
                        type="number"
                        {...form.register('constraints.max', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingVariable ? 'Update' : 'Add'} Variable
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Predefined Variables Dialog */}
      <Dialog open={showPredefined} onOpenChange={setShowPredefined}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Predefined Variables</DialogTitle>
            <DialogDescription>
              Add commonly used variables to your prompt
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {PREDEFINED_VARIABLES.map((predefined) => (
              <Card key={predefined.name} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm">{`{{${predefined.name}}}`}</code>
                      <Badge variant="outline">{predefined.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {predefined.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addPredefinedVariable(predefined)}
                    disabled={variables.some(v => v.name === predefined.name)}
                  >
                    {variables.some(v => v.name === predefined.name) ? 'Added' : 'Add'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}