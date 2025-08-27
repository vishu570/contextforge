'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Import specialized form
import { SpecializedEditForm } from '@/src/components/specialized-editors/specialized-edit-form';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-muted rounded-md flex items-center justify-center">
      Loading editor...
    </div>
  ),
});

const editItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(1, 'Content is required'),
  format: z.string(),
  author: z.string().optional(),
  language: z.string().optional(),
  targetModels: z.array(z.string()),
  tags: z.array(z.string()),
  description: z.string().optional(),
});

type EditItemFormData = z.infer<typeof editItemSchema>;

interface EditItemFormProps {
  item: any;
  availableTags: any[];
  type: string;
  userId: string;
}

interface DuplicateItem {
  id: string;
  name: string;
  content: string;
  similarityScore: number;
  tags: Array<{ tag: { name: string } }>;
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

export function EditItemForm({ item, availableTags, type, userId }: EditItemFormProps) {
  // Check if this item type should use a specialized editor
  const useSpecializedEditor = ['prompt', 'agent', 'rule'].includes(item.type?.toLowerCase());
  
  // If specialized editor is available, use it instead
  if (useSpecializedEditor) {
    return (
      <SpecializedEditForm
        item={item}
        availableTags={availableTags}
        type={type}
        userId={userId}
      />
    );
  }
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    item.tags.map((t: any) => t.tag.name)
  );
  const [newTag, setNewTag] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const metadata = JSON.parse(item.metadata || '{}');

  const form = useForm<EditItemFormData>({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      name: item.name,
      content: item.content,
      format: item.format,
      author: item.author || '',
      language: item.language || 'english',
      targetModels: item.targetModels ? item.targetModels.split(',') : [],
      tags: selectedTags,
      description: metadata.description || '',
    },
  });

  const { watch, setValue } = form;
  const watchedContent = watch('content');
  const watchedName = watch('name');

  // Auto-save functionality
  const autoSave = useCallback(async (data: Partial<EditItemFormData>) => {
    if (!data.content) return;

    try {
      setAutoSaveStatus('saving');
      const response = await fetch(`/api/items/${item.id}/autosave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: data.content,
          metadata: { description: data.description },
        }),
      });

      if (response.ok) {
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(null), 2000);
      } else {
        setAutoSaveStatus('error');
      }
    } catch (error) {
      setAutoSaveStatus('error');
    }
  }, [item.id]);

  // Auto-save on content change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedContent !== item.content) {
        autoSave({ content: watchedContent });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [watchedContent, item.content, autoSave]);

  // Check for duplicates when name or content changes
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!watchedName || !watchedContent) return;

      try {
        const response = await fetch(`/api/items/${item.id}/duplicates`);
        if (response.ok) {
          const duplicatesData = await response.json();
          setDuplicates(duplicatesData);
          setShowDuplicateWarning(duplicatesData.length > 0);
        }
      } catch (error) {
        console.error('Error checking duplicates:', error);
      }
    };

    const timer = setTimeout(checkDuplicates, 1000);
    return () => clearTimeout(timer);
  }, [watchedName, watchedContent, item.id]);

  // Load optimizations
  useEffect(() => {
    if (item.optimizations) {
      setOptimizations(item.optimizations);
    }
  }, [item.optimizations]);

  const onSubmit = async (data: EditItemFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          metadata: {
            ...metadata,
            description: data.description,
          },
          targetModels: data.targetModels.join(','),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Item updated successfully',
        });
        
        // Clear auto-save draft
        await fetch(`/api/items/${item.id}/autosave`, {
          method: 'DELETE',
        });

        router.push(`/dashboard/${type}`);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update item',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/${type}`);
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
  };

  const handleShare = async () => {
    try {
      const response = await fetch(`/api/items/${item.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: 'view',
          requireAuth: false,
          allowComments: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.shareUrl);
        setShareDialogOpen(true);
        
        toast({
          title: 'Share link created',
          description: 'Your item can now be shared with others',
        });
      } else {
        throw new Error('Failed to create share link');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create share link',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Item deleted successfully',
        });
        router.push(`/dashboard/${type}`);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete item',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Copied!',
        description: 'Share link copied to clipboard',
      });
    }
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
    switch (item.type) {
      case 'agent':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="behavior">Agent Behavior Configuration</Label>
              <Textarea
                id="behavior"
                placeholder="Define agent behavior, personality, and response style..."
                value={metadata.behavior || ''}
                onChange={(e) => {
                  const newMetadata = { ...metadata, behavior: e.target.value };
                  setValue('description', JSON.stringify(newMetadata));
                }}
              />
            </div>
            <div>
              <Label htmlFor="capabilities">Capabilities</Label>
              <Textarea
                id="capabilities"
                placeholder="List agent capabilities and tools..."
                value={metadata.capabilities || ''}
                onChange={(e) => {
                  const newMetadata = { ...metadata, capabilities: e.target.value };
                  setValue('description', JSON.stringify(newMetadata));
                }}
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
                value={metadata.conditions || ''}
                onChange={(e) => {
                  const newMetadata = { ...metadata, conditions: e.target.value };
                  setValue('description', JSON.stringify(newMetadata));
                }}
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={metadata.priority || 'medium'}
                onValueChange={(value) => {
                  const newMetadata = { ...metadata, priority: value };
                  setValue('description', JSON.stringify(newMetadata));
                }}
              >
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
                value={metadata.variables || ''}
                onChange={(e) => {
                  const newMetadata = { ...metadata, variables: e.target.value };
                  setValue('description', JSON.stringify(newMetadata));
                }}
              />
            </div>
            <div>
              <Label htmlFor="usage">Usage Instructions</Label>
              <Textarea
                id="usage"
                placeholder="Explain how to use this template..."
                value={metadata.usage || ''}
                onChange={(e) => {
                  const newMetadata = { ...metadata, usage: e.target.value };
                  setValue('description', JSON.stringify(newMetadata));
                }}
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
      {/* Auto-save status */}
      {autoSaveStatus && (
        <Alert className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {autoSaveStatus === 'saving' && 'Saving draft...'}
            {autoSaveStatus === 'saved' && 'Draft saved automatically'}
            {autoSaveStatus === 'error' && 'Failed to save draft'}
          </AlertDescription>
        </Alert>
      )}

      {/* Duplicate warning */}
      {showDuplicateWarning && duplicates.length > 0 && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Found {duplicates.length} similar item(s). Consider reviewing them to avoid duplicates.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
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
                  Edit your {item.type} content with syntax highlighting and advanced features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="Enter item name"
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
                        {(formatOptions[item.type as keyof typeof formatOptions] || []).map((format) => (
                          <SelectItem key={format} value={format}>{format}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="content">Content</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(form.watch('content'));
                        toast({
                          title: 'Copied!',
                          description: 'Content copied to clipboard',
                        });
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Content
                    </Button>
                  </div>
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
                        bracketMatching: 'always',
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
                    placeholder="Describe what this item does or how to use it"
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

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="h-5 w-5" />
                  <span>Version History</span>
                </CardTitle>
                <CardDescription>
                  View and compare previous versions of this item
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {item.versions && item.versions.length > 0 ? (
                    <div className="space-y-3">
                      {item.versions.map((version: any) => (
                        <div key={version.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <GitBranch className="h-4 w-4" />
                              <span className="font-medium">Version {version.versionNumber}</span>
                              {version.approved && (
                                <Badge variant="default">Approved</Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(version.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {version.changeReason && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {version.changeReason}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Changed by: {version.changedBy || 'Unknown'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No version history available</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-6">
            <div className="grid gap-6">
              {/* Optimizations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5" />
                    <span>AI Optimizations</span>
                  </CardTitle>
                  <CardDescription>
                    AI-suggested improvements for better performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {optimizations.length > 0 ? (
                    <div className="space-y-4">
                      {optimizations.map((opt) => (
                        <div key={opt.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{opt.targetModel}</Badge>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">
                                Confidence: {Math.round(opt.confidence * 100)}%
                              </span>
                              <Button variant="outline" size="sm">
                                Apply
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-2">Suggested optimization:</p>
                            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                              {opt.optimizedContent.substring(0, 200)}...
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No optimization suggestions available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Duplicates */}
              {duplicates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Copy className="h-5 w-5" />
                      <span>Potential Duplicates</span>
                    </CardTitle>
                    <CardDescription>
                      Similar items found in your library
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {duplicates.map((duplicate) => (
                        <div key={duplicate.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{duplicate.name}</h4>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">
                                {Math.round(duplicate.similarityScore * 100)}% similar
                              </span>
                              <Button variant="outline" size="sm" asChild>
                                <a href={`/dashboard/${type}/${duplicate.id}/edit`} target="_blank">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View
                                </a>
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {duplicate.content.substring(0, 100)}...
                          </p>
                          <div className="flex space-x-1 mt-2">
                            {duplicate.tags.map((tag) => (
                              <Badge key={tag.tag.name} variant="secondary" className="text-xs">
                                {tag.tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Preview</span>
                </CardTitle>
                <CardDescription>
                  Preview how your content will appear
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">{form.watch('name')}</h3>
                  <pre className="whitespace-pre-wrap text-sm">
                    {form.watch('content')}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t pt-6">
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleShare}
            >
              <Share className="mr-2 h-4 w-4" />
              Share
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
            >
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Item</DialogTitle>
            <DialogDescription>
              Anyone with this link can view your item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {shareUrl && (
              <div className="flex items-center space-x-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={copyShareUrl} size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}