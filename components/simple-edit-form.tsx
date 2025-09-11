'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Save, 
  X, 
  Copy,
  FileText
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

const editItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(1, 'Content is required'),
  format: z.string(),
  tags: z.array(z.string()),
});

type EditItemFormData = z.infer<typeof editItemSchema>;

interface SimpleEditFormProps {
  item: any;
  availableTags: any[];
  type: string;
  userId: string;
}

const formatOptions = {
  prompt: ['.prompt', '.txt', '.md'],
  agent: ['.agent', '.json', '.yaml'],
  rule: ['.rule', '.json', '.yaml'],
  template: ['.template', '.md', '.txt'],
  snippet: ['.json', '.js', '.py', '.ts', '.yaml', '.xml'],
};

export function SimpleEditForm({ item, availableTags, type, userId }: SimpleEditFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    item.tags?.map((t: any) => t.tag.name) || []
  );
  const [newTag, setNewTag] = useState('');

  const form = useForm<EditItemFormData>({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      name: item.name || '',
      content: item.content || '',
      format: item.format || (formatOptions[item.type as keyof typeof formatOptions]?.[0] || '.txt'),
      tags: selectedTags || [],
    },
  });

  const onSubmit = async (data: EditItemFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          content: data.content,
          format: data.format,
          tags: data.tags,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Item saved successfully',
        });
        router.push(`/dashboard/${type}s`);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save item',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save item',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/${type}s`);
  };

  const copyContent = () => {
    navigator.clipboard.writeText(form.watch('content'));
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard',
    });
  };

  const addTag = () => {
    if (newTag && !selectedTags.includes(newTag)) {
      const updatedTags = [...selectedTags, newTag];
      setSelectedTags(updatedTags);
      form.setValue('tags', updatedTags);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(updatedTags);
    form.setValue('tags', updatedTags);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Edit {item.type}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyContent}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
            {/* Name and Format */}
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
                  onValueChange={(value) => form.setValue('format', value)}
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

            {/* Content */}
            <div>
              <Label htmlFor="content">Content</Label>
              <div className="mt-2 border rounded-md overflow-hidden bg-background">
                <MonacoEditor
                  height="500px"
                  language={getEditorLanguage(form.watch('format'))}
                  value={form.watch('content')}
                  onChange={(value) => form.setValue('content', value || '')}
                  options={{
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    folding: true,
                    automaticLayout: true,
                    theme: 'vs-dark',
                    fontSize: 14,
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace',
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
              {form.formState.errors.content && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.content.message}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
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
                
                {availableTags.length > 0 && (
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
                              form.setValue('tags', updatedTags);
                            }
                          }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                <p className="text-sm capitalize">{item.type}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Format</Label>
                <p className="text-sm">{form.watch('format')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                <p className="text-sm">{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Last Modified</Label>
                <p className="text-sm">{new Date(item.updatedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Word Count</Label>
                <p className="text-sm">{form.watch('content').split(/\s+/).length}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Character Count</Label>
                <p className="text-sm">{form.watch('content').length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="bg-muted/50 rounded-md p-3 text-sm max-h-64 overflow-y-auto">
                  {form.watch('content').slice(0, 500)}
                  {form.watch('content').length > 500 && '...'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={copyContent}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Content
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  const url = `${window.location.origin}/api/items/${item.id}/export`;
                  navigator.clipboard.writeText(url);
                  toast({
                    title: 'Copied!',
                    description: 'Export URL copied to clipboard',
                  });
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Copy Export URL
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}