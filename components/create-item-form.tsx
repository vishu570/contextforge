'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { 
  Save, 
  X, 
  FileText,
  Tags,
  Settings,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-muted rounded-md flex items-center justify-center">
      Loading editor...
    </div>
  ),
});

const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(1, 'Content is required'),
  format: z.string(),
  author: z.string().optional(),
  language: z.string().optional(),
  targetModels: z.array(z.string()),
  tags: z.array(z.string()),
  description: z.string().optional(),
});

type CreateItemFormData = z.infer<typeof createItemSchema>;

interface CreateItemFormProps {
  availableTags: any[];
  type: string;
  itemType: string;
  userId: string;
}

const targetModelOptions = [
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'claude', label: 'Anthropic (Claude)' },
  { value: 'gemini', label: 'Google (Gemini)' },
];

const languageOptions = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'japanese', label: 'Japanese' },
];

const formatOptions = {
  prompt: ['.prompt', '.txt', '.md'],
  agent: ['.agent', '.json', '.yaml'],
  rule: ['.rule', '.json', '.yaml'],
  template: ['.template', '.md', '.txt'],
  snippet: ['.json', '.js', '.py', '.ts', '.yaml', '.xml'],
};

export function CreateItemForm({ availableTags, type, itemType, userId }: CreateItemFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const form = useForm<CreateItemFormData>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      name: '',
      content: `# New ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}

Add your ${itemType} content here...`,
      format: formatOptions[itemType as keyof typeof formatOptions]?.[0] || '.txt',
      author: '',
      language: 'english',
      targetModels: [],
      tags: [],
      description: '',
    },
  });

  const { watch, setValue } = form;

  const onSubmit = async (data: CreateItemFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          type: itemType,
          userId: userId,
          metadata: {
            description: data.description,
            // Add type-specific metadata based on itemType
            ...(itemType === 'agent' && {
              behavior: '',
              capabilities: '',
            }),
            ...(itemType === 'rule' && {
              conditions: '',
              priority: 'medium',
            }),
            ...(itemType === 'template' && {
              variables: '',
              usage: '',
            }),
          },
          targetModels: data.targetModels.join(','),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} created successfully`,
        });
        
        router.push(`/dashboard/${type}`);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to create ${itemType}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to create ${itemType}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/${type}`);
  };

  const addTag = () => {
    if (newTag && !selectedTags.includes(newTag)) {
      const updatedTags = [...selectedTags, newTag];
      setSelectedTags(updatedTags);
      setValue('tags', updatedTags);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(updatedTags);
    setValue('tags', updatedTags);
  };

  const getEditorLanguage = (format: string) => {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.xml': 'xml',
      '.md': 'markdown',
      '.prompt': 'text',
      '.agent': 'json',
      '.rule': 'json',
      '.template': 'markdown',
    };
    return languageMap[format] || 'text';
  };

  const renderTypeSpecificFields = () => {
    switch (itemType) {
      case 'agent':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="behavior">Agent Behavior Configuration</Label>
              <Textarea
                id="behavior"
                placeholder="Define agent behavior, personality, and response style..."
              />
            </div>
            <div>
              <Label htmlFor="capabilities">Capabilities</Label>
              <Textarea
                id="capabilities"
                placeholder="List agent capabilities and tools..."
              />
            </div>
          </div>
        );
      
      case 'rule':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="conditions">Rule Conditions</Label>
              <Textarea
                id="conditions"
                placeholder="Define when this rule should be applied..."
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select defaultValue="medium">
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 'template':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="variables">Template Variables</Label>
              <Textarea
                id="variables"
                placeholder="List template variables (e.g., {{name}}, {{description}})..."
              />
            </div>
            <div>
              <Label htmlFor="usage">Usage Instructions</Label>
              <Textarea
                id="usage"
                placeholder="Explain how to use this template..."
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Content Editor</span>
                </CardTitle>
                <CardDescription>
                  Create your {itemType} content with syntax highlighting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder={`Enter ${itemType} name`}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="format">Format</Label>
                    <Select 
                      value={form.watch('format')} 
                      onValueChange={(value) => setValue('format', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {(formatOptions[itemType as keyof typeof formatOptions] || []).map((format) => (
                          <SelectItem key={format} value={format}>{format}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <div className="mt-2 border rounded-md overflow-hidden bg-background">
                    <MonacoEditor
                      height="400px"
                      language={getEditorLanguage(form.watch('format'))}
                      value={form.watch('content')}
                      onChange={(value) => setValue('content', value || '')}
                      options={{
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        lineNumbers: 'on',
                        folding: true,
                        matchBrackets: 'always',
                        automaticLayout: true,
                        theme: 'vs-dark',
                        fontSize: 14,
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                        scrollBeyondLastLine: false,
                        renderLineHighlight: 'line',
                        selectOnLineNumbers: true,
                      }}
                    />
                  </div>
                  {form.formState.errors.content && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.content.message}
                    </p>
                  )}
                </div>

                {renderTypeSpecificFields()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Metadata & Settings</span>
                </CardTitle>
                <CardDescription>
                  Configure metadata, tags, and targeting options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder={`Describe what this ${itemType} does or how to use it`}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="author">Author</Label>
                    <Input
                      id="author"
                      {...form.register('author')}
                      placeholder="Author name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={form.watch('language')} 
                      onValueChange={(value) => setValue('language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Target Models</Label>
                  <div className="mt-2 space-y-2">
                    {targetModelOptions.map((model) => (
                      <div key={model.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={model.value}
                          checked={form.watch('targetModels').includes(model.value)}
                          onCheckedChange={(checked) => {
                            const current = form.watch('targetModels');
                            if (checked) {
                              setValue('targetModels', [...current, model.value]);
                            } else {
                              setValue('targetModels', current.filter(m => m !== model.value));
                            }
                          }}
                        />
                        <Label htmlFor={model.value}>{model.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="flex items-center space-x-2">
                    <Tags className="h-4 w-4" />
                    <span>Tags</span>
                  </Label>
                  <div className="mt-2 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                          <span>{tag}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={() => removeTag(tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add tag"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <Button type="button" onClick={addTag} variant="outline">
                        Add
                      </Button>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Available tags:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {availableTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => {
                              if (!selectedTags.includes(tag.name)) {
                                const updatedTags = [...selectedTags, tag.name];
                                setSelectedTags(updatedTags);
                                setValue('tags', updatedTags);
                              }
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? `Creating ${itemType}...` : `Create ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`}
          </Button>
        </div>
      </form>
    </div>
  );
}