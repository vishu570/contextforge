'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EditorTab } from '@/editor';
import { useToast } from '@/hooks/use-toast';
import { AI_MODEL_NAMES } from '@/lib/constants/ai-models';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Bot,
  Check,
  Code,
  Copy,
  Eye,
  FileCode,
  FileJson,
  FileText,
  FolderOpen,
  GitBranch,
  History,
  Save,
  Sparkles,
  Upload,
  Wand2,
  Webhook,
  Zap
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { MonacoEditor } from './MonacoEditor';

interface ComprehensiveEditorProps {
  tab: EditorTab;
  onChange: (content: string) => void;
  onSave: (metadata?: any) => void;
  onShowImport?: () => void;
  userSession?: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface ItemMetadata {
  author?: string;
  language?: string;
  targetModels?: string[];
  tags?: string[];
  version?: string;
  lastModified?: Date;
  sourceUrl?: string;
  format?: string;
  automationLevel?: 'auto-apply' | 'auto-suggest' | 'manual';
  confidence?: number;
  collections?: string[];
}

interface LLMVariant {
  model: 'openai' | 'claude' | 'gemini';
  content: string;
  optimizations: string[];
  confidence: number;
}

interface VersionHistory {
  id: string;
  version: string;
  timestamp: Date;
  author: string;
  changes: string;
  content: string;
}

export function ComprehensiveEditor({ tab, onChange, onSave, onShowImport, userSession }: ComprehensiveEditorProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [metadata, setMetadata] = useState<ItemMetadata>({
    author: userSession?.name || userSession?.email || 'Unknown User',
    language: 'en',
    targetModels: [AI_MODEL_NAMES[0], AI_MODEL_NAMES[2], AI_MODEL_NAMES[3]], // GPT-5, Claude Sonnet 4.0, Gemini 2.5 Pro
    tags: tab.tags || [],
    version: '1.0.0',
    format: tab.format,
    automationLevel: 'auto-suggest',
  });

  const [llmVariants, setLlmVariants] = useState<LLMVariant[]>([
    {
      model: 'openai',
      content: tab.content,
      optimizations: ['Structured output format', 'Few-shot examples added'],
      confidence: 0.92,
    },
    {
      model: 'claude',
      content: tab.content,
      optimizations: ['Constitutional AI principles', 'Explicit reasoning chains'],
      confidence: 0.88,
    },
    {
      model: 'gemini',
      content: tab.content,
      optimizations: ['Multi-modal capabilities', 'Code generation focus'],
      confidence: 0.85,
    },
  ]);

  const [versionHistory] = useState<VersionHistory[]>([
    {
      id: '1',
      version: '1.0.0',
      timestamp: new Date(),
      author: userSession?.name || userSession?.email || 'Unknown User',
      changes: 'Initial version',
      content: tab.content,
    },
  ]);

  const [activeView, setActiveView] = useState<'edit' | 'preview' | 'optimize'>('edit');
  const [showDiff, setShowDiff] = useState(false);
  const [selectedLLM, setSelectedLLM] = useState<'openai' | 'claude' | 'gemini'>('openai');
  const [newTag, setNewTag] = useState('');
  const [copied, setCopied] = useState(false);
  const collections = tab.collections || [];

  // Update metadata when tab changes
  useEffect(() => {
    setMetadata(prev => ({
      ...prev,
      tags: tab.tags || [],
      format: tab.format,
    }));
  }, [tab.tags, tab.format]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prompt': return <FileText className="h-4 w-4" />;
      case 'agent': return <Bot className="h-4 w-4" />;
      case 'rule': return <Code className="h-4 w-4" />;
      case 'template': return <Webhook className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleAddTag = () => {
    if (newTag && !metadata.tags?.includes(newTag)) {
      setMetadata({
        ...metadata,
        tags: [...(metadata.tags || []), newTag],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setMetadata({
      ...metadata,
      tags: metadata.tags?.filter(t => t !== tag),
    });
  };

  const handleCopyToClipboard = async () => {
    await navigator.clipboard.writeText(tab.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied to clipboard',
      description: 'Content has been copied to your clipboard',
    });
  };

  const handleOptimize = () => {
    toast({
      title: 'Optimizing...',
      description: 'AI is optimizing your content for multiple models',
    });
    // Simulate optimization
    setTimeout(() => {
      toast({
        title: 'Optimization complete',
        description: 'Your content has been optimized for all target models',
      });
    }, 2000);
  };

  const handleImportFromGitHub = () => {
    if (onShowImport) {
      onShowImport();
    } else {
      toast({
        title: 'Import from GitHub',
        description: 'Opening GitHub import dialog...',
      });
    }
  };

  const handleCollectionNavigate = (collection: { id: string; name: string }) => {
    if (!collection?.id) return;
    router.push(`/dashboard/collections?folder=${collection.id}`);
  };

  const handleAddToCollection = () => {
    router.push('/dashboard/collections');
  };

  const getCollectionIcon = (icon?: string | null) => {
    switch (icon?.toLowerCase()) {
      case 'zap':
      case 'lightning':
        return <Zap className="h-3 w-3 mr-2" />;
      case 'bot':
      case 'robot':
        return <Bot className="h-3 w-3 mr-2" />;
      default:
        return <FolderOpen className="h-3 w-3 mr-2" />;
    }
  };

  const handleExport = async (format: string) => {
    try {
      toast({
        title: `Exporting as ${format}`,
        description: `Preparing your export...`,
      });

      const url = `/api/export?format=${format}&itemId=${tab.id}`;

      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Started',
        description: `Your ${format.toUpperCase()} export should download shortly.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting your file.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-full flex bg-[#0F1117]">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Action Toolbar */}
        <div className="h-12 bg-[#161B22] border-b border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            {getTypeIcon(tab.type)}
            <span className="text-sm font-medium text-gray-200">{tab.title}</span>
            <Badge variant="outline" className="text-xs">
              v{metadata.version}
            </Badge>
            {tab.unsaved && (
              <Badge variant="destructive" className="text-xs">
                Unsaved
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex bg-gray-800 rounded-md p-1">
              <Button
                variant={activeView === 'edit' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('edit')}
                className="h-6 px-2"
              >
                <Code className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant={activeView === 'preview' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('preview')}
                className="h-6 px-2"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
              <Button
                variant={activeView === 'optimize' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('optimize')}
                className="h-6 px-2"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Optimize
              </Button>
            </div>

            {/* Action Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyToClipboard}
              className="h-8"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOptimize}
              className="h-8"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSave(metadata)}
              className="h-8"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* Editor/Preview/Optimize Panel */}
          <div className="flex-1 min-w-0 min-h-0">
            {activeView === 'edit' && (
              <div className="h-full">
                <MonacoEditor
                  value={tab.content}
                  language={getEditorLanguage(tab.format)}
                  onChange={onChange}
                  theme="vs-dark-contextforge"
                />
              </div>
            )}

            {activeView === 'preview' && (
              <div className="h-full p-6 overflow-auto">
                <Card className="bg-[#161B22] border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Preview</CardTitle>
                    <CardDescription>
                      How your {tab.type} will appear in production
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-gray-300 bg-gray-900 p-4 rounded">
                      {tab.content}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === 'optimize' && (
              <div className="h-full p-6 overflow-auto">
                <div className="space-y-4">
                  <Card className="bg-[#161B22] border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Sparkles className="h-5 w-5 mr-2 text-yellow-400" />
                        AI Optimization Suggestions
                      </CardTitle>
                      <CardDescription>
                        Model-specific optimizations for better performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="openai" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                          <TabsTrigger value="openai">OpenAI</TabsTrigger>
                          <TabsTrigger value="claude">Claude</TabsTrigger>
                          <TabsTrigger value="gemini">Gemini</TabsTrigger>
                        </TabsList>

                        {llmVariants.map((variant) => (
                          <TabsContent key={variant.model} value={variant.model} className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-green-400 border-green-400">
                                {Math.round(variant.confidence * 100)}% Confidence
                              </Badge>
                              <Button size="sm" variant="outline">
                                Apply Changes
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-gray-400">Optimizations Applied:</Label>
                              <div className="flex flex-wrap gap-2">
                                {variant.optimizations.map((opt, idx) => (
                                  <Badge key={idx} variant="secondary">
                                    {opt}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-gray-400">Optimized Content:</Label>
                              <div className="bg-gray-900 p-4 rounded">
                                <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                                  {variant.content}
                                </pre>
                              </div>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Sidebar */}
          <div className="w-80 bg-[#161B22] border-l border-gray-700 overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Metadata Section */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-white">Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Author</Label>
                      <Input
                        value={metadata.author}
                        onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                        className="h-8 text-xs bg-gray-800 border-gray-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Language</Label>
                      <Select
                        value={metadata.language}
                        onValueChange={(value) => setMetadata({ ...metadata, language: value })}
                      >
                        <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Target Models</Label>
                      <div className="space-y-2">
                        {AI_MODEL_NAMES.map((model) => (
                          <div key={model} className="flex items-center space-x-2">
                            <Switch
                              checked={metadata.targetModels?.includes(model)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setMetadata({
                                    ...metadata,
                                    targetModels: [...(metadata.targetModels || []), model],
                                  });
                                } else {
                                  setMetadata({
                                    ...metadata,
                                    targetModels: metadata.targetModels?.filter(m => m !== model),
                                  });
                                }
                              }}
                              className="scale-75"
                            />
                            <Label className="text-xs text-gray-300">{model}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Tags</Label>
                      <div className="flex space-x-1">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                          placeholder="Add tag..."
                          className="h-8 text-xs bg-gray-800 border-gray-700"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddTag}
                          className="h-8"
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {metadata.tags?.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Automation Level</Label>
                      <Select
                        value={metadata.automationLevel}
                        onValueChange={(value: any) => setMetadata({ ...metadata, automationLevel: value })}
                      >
                        <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto-apply">Auto Apply</SelectItem>
                          <SelectItem value="auto-suggest">Auto Suggest</SelectItem>
                          <SelectItem value="manual">Manual Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Import/Export Section */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-white">Import & Export</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleImportFromGitHub}
                    >
                      <GitBranch className="h-3 w-3 mr-2" />
                      Import from GitHub
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <Upload className="h-3 w-3 mr-2" />
                      Upload File
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      hidden
                      accept=".json,.yaml,.yml,.md,.txt"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            toast({
                              title: 'Uploading file',
                              description: `Uploading ${file.name}...`,
                            });

                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('format', file.name.endsWith('.json') ? 'json' : file.name.endsWith('.yaml') || file.name.endsWith('.yml') ? 'yaml' : 'csv');

                            const response = await fetch('/api/import/files', {
                              method: 'POST',
                              credentials: 'include',
                              body: formData,
                            });

                            if (response.ok) {
                              const result = await response.json();
                              toast({
                                title: 'File uploaded successfully',
                                description: `Imported ${result.processedCount || 0} items from ${file.name}`,
                              });
                            } else {
                              throw new Error('Upload failed');
                            }
                          } catch (error) {
                            toast({
                              title: 'Upload failed',
                              description: `Failed to upload ${file.name}`,
                              variant: 'destructive',
                            });
                          }
                          // Reset the input
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleExport('json')}
                    >
                      <FileJson className="h-3 w-3 mr-2" />
                      Export as JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleExport('yaml')}
                    >
                      <FileCode className="h-3 w-3 mr-2" />
                      Export as YAML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleExport('bundle')}
                    >
                      <Archive className="h-3 w-3 mr-2" />
                      Export Bundle
                    </Button>
                  </CardContent>
                </Card>

                {/* Version History Section */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-white flex items-center">
                      <History className="h-4 w-4 mr-2" />
                      Version History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {versionHistory.map((version) => (
                          <div
                            key={version.id}
                            className="p-2 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-200">
                                v{version.version}
                              </span>
                              <span className="text-xs text-gray-500">
                                {version.timestamp.toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{version.changes}</p>
                            <p className="text-xs text-gray-500">by {userSession?.name || userSession?.email || version.author}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Collections Section */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-white">Collections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {collections.length > 0 ? (
                      <div className="space-y-2">
                        {collections.map(collection => (
                          <Button
                            key={collection.id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleCollectionNavigate(collection)}
                          >
                            {getCollectionIcon(collection.icon)}
                            {collection.name}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        This item is not part of any collections yet.
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full justify-start text-gray-400"
                      onClick={handleAddToCollection}
                    >
                      + Add to Collection
                    </Button>
                  </CardContent>
                </Card>

                {/* Source Information Section */}
                {tab.source && (
                  <Card className="bg-gray-900 border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        Source
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Repository</span>
                          <span className="text-xs text-white font-mono">
                            {tab.source.repoOwner}/{tab.source.repoName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Branch</span>
                          <span className="text-xs text-white font-mono">
                            {tab.source.branch || 'main'}
                          </span>
                        </div>
                        {tab.source.lastImportedAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Last Sync</span>
                            <span className="text-xs text-white">
                              {new Date(tab.source.lastImportedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {tab.source.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => window.open(tab.source?.url || '', '_blank')}
                        >
                          <Webhook className="h-3 w-3 mr-2" />
                          View on GitHub
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/sources/sync', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ sourceId: tab.source?.id }),
                            });

                            if (response.ok) {
                              const data = await response.json();
                              if (data.status === 'up_to_date') {
                                toast({ title: 'Repository is up to date' });
                              } else if (data.status === 'sync_started') {
                                toast({ title: `Sync started for ${data.repository}` });
                              }
                            } else {
                              const error = await response.json();
                              toast({
                                title: 'Sync failed',
                                description: error.error || 'Failed to sync repository',
                                variant: 'destructive'
                              });
                            }
                          } catch (err) {
                            toast({
                              title: 'Sync failed',
                              description: 'Failed to sync repository',
                              variant: 'destructive'
                            });
                          }
                        }}
                      >
                        <Zap className="h-3 w-3 mr-2" />
                        Sync Repository
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to determine Monaco editor language
function getEditorLanguage(format: string): string {
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.py': 'python',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.json': 'json',
    '.xml': 'xml',
    '.md': 'markdown',
    '.prompt': 'markdown',
    '.agent': 'json',
    '.rule': 'yaml',
    '.template': 'markdown',
  };
  return languageMap[format] || 'text';
}
