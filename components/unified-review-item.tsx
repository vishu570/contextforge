'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Bot, 
  FileCode, 
  Webhook,
  Sparkles,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Edit2,
  Save,
  X,
  AlertTriangle,
  Folder,
  Copy,
  Tag,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  ChevronsUpDown,
  FolderOpen,
  Search
} from 'lucide-react';

interface StagedItem {
  id: string;
  name: string;
  content: string;
  type: 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'other';
  format: string;
  metadata: Record<string, any>;
  author?: string;
  language?: string;
  targetModels?: string;
  classification?: {
    type: string;
    confidence: number;
    reasoning?: string;
  };
  optimizations?: Array<{
    targetModel: string;
    optimizedContent: string;
    suggestions: string[];
    confidence: number;
  }>;
  duplicates?: Array<{
    id: string;
    name: string;
    similarity: number;
    type: 'identical' | 'similar';
  }>;
  suggestedPath?: string;
  status: 'pending' | 'approved' | 'rejected';
  tags?: string[];
}

const typeIcons = {
  prompt: FileText,
  agent: Bot,
  rule: FileCode,
  template: Webhook,
  snippet: FileCode,
  other: FileText,
};

const typeColors = {
  prompt: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  agent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rule: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  template: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  snippet: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

interface UnifiedReviewItemProps {
  item: StagedItem;
  onUpdate: (updates: Partial<StagedItem>) => void;
  onApprove: () => void;
  onReject: () => void;
  onOptimize: () => void;
  onRunClassification?: () => void;
  isProcessing: boolean;
  availableFolders?: string[];
  availableTags?: string[];
}

export function UnifiedReviewItem({ 
  item, 
  onUpdate, 
  onApprove, 
  onReject, 
  onOptimize, 
  onRunClassification,
  isProcessing,
  availableFolders = [],
  availableTags = []
}: UnifiedReviewItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);
  const [newTag, setNewTag] = useState('');
  const [showFolderSearch, setShowFolderSearch] = useState(false);
  const [customPath, setCustomPath] = useState(item.suggestedPath || '');
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  
  const Icon = typeIcons[item.type];

  const handleSave = useCallback(() => {
    onUpdate({
      ...editedItem,
      suggestedPath: customPath,
      tags: editedItem.tags || []
    });
    setIsEditing(false);
  }, [editedItem, customPath, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditedItem(item);
    setCustomPath(item.suggestedPath || '');
    setIsEditing(false);
  }, [item]);

  const handleTypeChange = useCallback((newType: string) => {
    setEditedItem(prev => ({ 
      ...prev, 
      type: newType as StagedItem['type'],
      classification: prev.classification ? {
        ...prev.classification,
        type: newType
      } : undefined
    }));
  }, []);

  const handleAddTag = useCallback((tag: string) => {
    if (tag && !(editedItem.tags || []).includes(tag)) {
      setEditedItem(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
      setNewTag('');
    }
  }, [editedItem.tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setEditedItem(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  }, []);

  const getDuplicateTypeColor = (type: 'identical' | 'similar') => {
    return type === 'identical' 
      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon className="h-6 w-6 text-muted-foreground" />
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedItem.name}
                  onChange={(e) => setEditedItem(prev => ({ ...prev, name: e.target.value }))}
                  className="text-lg font-semibold"
                />
              ) : (
                <CardTitle className="text-lg">{item.name}</CardTitle>
              )}
              <div className="flex items-center space-x-2 mt-2">
                {isEditing ? (
                  <Select value={editedItem.type} onValueChange={handleTypeChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prompt">Prompt</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="rule">Rule</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="snippet">Snippet</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={typeColors[item.type]}>{item.type}</Badge>
                )}
                <Badge variant="outline">{item.format}</Badge>
                {item.classification && (
                  <Badge variant="secondary" className="text-xs">
                    AI: {item.classification.type} ({Math.round(item.classification.confidence * 100)}%)
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                {item.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onOptimize}
                      disabled={isProcessing}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Optimize
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onReject}
                      disabled={isProcessing}
                    >
                      <ThumbsDown className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={onApprove}
                      disabled={isProcessing}
                    >
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Classification Section */}
        {item.classification ? (
          <div className="space-y-3 p-4 bg-accent/20 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Classification
              </h4>
              <div className="flex items-center space-x-2">
                <Badge className={typeColors[item.classification.type as keyof typeof typeColors]}>
                  {item.classification.type}
                </Badge>
                <span className={`text-sm font-medium ${getConfidenceColor(item.classification.confidence)}`}>
                  {Math.round(item.classification.confidence * 100)}%
                </span>
                {onRunClassification && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRunClassification}
                    disabled={isProcessing}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Re-classify
                  </Button>
                )}
              </div>
            </div>
            
            {item.classification.reasoning && (
              <p className="text-sm text-muted-foreground p-3 bg-background rounded border">
                {item.classification.reasoning}
              </p>
            )}
            
            {item.classification.confidence < 0.7 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Low confidence classification. Please review and correct if needed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="p-4 bg-accent/10 rounded-lg border-2 border-dashed">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Sparkles className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">No AI classification yet</span>
              </div>
              {onRunClassification && (
                <Button
                  size="sm"
                  onClick={onRunClassification}
                  disabled={isProcessing}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run Classification
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Organization Section */}
        <div className="space-y-4 p-4 bg-accent/10 rounded-lg">
          <h4 className="font-medium flex items-center">
            <Folder className="mr-2 h-4 w-4" />
            Organization
          </h4>
          
          {/* Folder Path - Always Editable */}
          <div className="space-y-2">
            <Label>Folder Path</Label>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <Popover open={showFolderSearch} onOpenChange={setShowFolderSearch}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={showFolderSearch}
                      className="w-full justify-between"
                    >
                      <div className="flex items-center">
                        <FolderOpen className="mr-2 h-4 w-4" />
                        <span className="font-mono text-sm">
                          {customPath || `/${item.type}s/${item.name}`}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search or enter custom path..." 
                        value={customPath}
                        onValueChange={setCustomPath}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="flex items-center justify-center p-4">
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setShowFolderSearch(false);
                              }}
                            >
                              Use Custom Path
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup heading="Suggested Paths">
                          <CommandItem
                            onSelect={() => {
                              setCustomPath(`/${item.type}s/${item.name}`);
                              setShowFolderSearch(false);
                            }}
                          >
                            <FolderOpen className="mr-2 h-4 w-4" />
                            /{item.type}s/{item.name}
                          </CommandItem>
                          {item.language && (
                            <CommandItem
                              onSelect={() => {
                                setCustomPath(`/${item.type}s/${item.language}/${item.name}`);
                                setShowFolderSearch(false);
                              }}
                            >
                              <FolderOpen className="mr-2 h-4 w-4" />
                              /{item.type}s/{item.language}/{item.name}
                            </CommandItem>
                          )}
                        </CommandGroup>
                        {availableFolders.length > 0 && (
                          <CommandGroup heading="Existing Folders">
                            {availableFolders.map((folder) => (
                              <CommandItem
                                key={folder}
                                onSelect={() => {
                                  setCustomPath(folder);
                                  setShowFolderSearch(false);
                                }}
                              >
                                <FolderOpen className="mr-2 h-4 w-4" />
                                {folder}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          {/* Tags - Always Editable */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {(editedItem.tags || []).map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
                {(!editedItem.tags || editedItem.tags.length === 0) && (
                  <span className="text-sm text-muted-foreground">No tags</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tag
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      <Label>Add Tag</Label>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Enter tag name..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddTag(newTag);
                            }
                          }}
                        />
                        <Button size="sm" onClick={() => handleAddTag(newTag)}>
                          Add
                        </Button>
                      </div>
                      {availableTags.length > 0 && (
                        <div className="mt-2">
                          <Label className="text-xs">Suggested:</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {availableTags
                              .filter(tag => !(editedItem.tags || []).includes(tag))
                              .slice(0, 6)
                              .map(tag => (
                                <Badge 
                                  key={tag}
                                  variant="outline" 
                                  className="cursor-pointer hover:bg-accent"
                                  onClick={() => handleAddTag(tag)}
                                >
                                  {tag}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Duplicates Section */}
        {item.duplicates && item.duplicates.length > 0 && (
          <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center text-yellow-800 dark:text-yellow-200">
                <Copy className="mr-2 h-4 w-4" />
                Potential Duplicates ({item.duplicates.length})
              </h4>
            </div>
            
            <div className="space-y-2">
              {item.duplicates.map((duplicate, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-background rounded border">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{duplicate.name}</p>
                      <Badge className={getDuplicateTypeColor(duplicate.type)} variant="outline">
                        {duplicate.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className={getConfidenceColor(duplicate.similarity)}>
                        {Math.round(duplicate.similarity * 100)}% similarity
                      </span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="mr-1 h-3 w-3" />
                      Compare
                    </Button>
                    <Button size="sm" variant="outline">
                      <Copy className="mr-1 h-3 w-3" />
                      Merge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optimizations Section */}
        {item.optimizations && item.optimizations.length > 0 && (
          <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium flex items-center text-blue-800 dark:text-blue-200">
              <RefreshCw className="mr-2 h-4 w-4" />
              AI Optimizations ({item.optimizations.length})
            </h4>
            
            <div className="space-y-3">
              {item.optimizations.map((opt, index) => (
                <Collapsible key={index}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Optimized for {opt.targetModel}</span>
                        <Badge variant="outline">
                          {Math.round(opt.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Improvements:</h5>
                      <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                        {opt.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm mb-2">Optimized Content Preview:</h5>
                      <ScrollArea className="h-32 w-full rounded border bg-background">
                        <pre className="p-3 text-xs whitespace-pre-wrap">
                          {opt.optimizedContent.slice(0, 500)}
                          {opt.optimizedContent.length > 500 && '...'}
                        </pre>
                      </ScrollArea>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        )}

        {/* Content Section - Collapsible */}
        <Collapsible open={isContentExpanded} onOpenChange={setIsContentExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Content Preview</span>
                <Badge variant="outline">{item.content.length} chars</Badge>
              </div>
              {isContentExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {isEditing && (
              <div className="space-y-2">
                <Label>Description/Summary</Label>
                <Textarea
                  placeholder="Add a description or summary for this item..."
                  value={editedItem.metadata.description || ''}
                  onChange={(e) => setEditedItem(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, description: e.target.value }
                  }))}
                  rows={2}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Content</Label>
              <ScrollArea className="h-[300px] w-full rounded-md border">
                {isEditing ? (
                  <Textarea
                    value={editedItem.content}
                    onChange={(e) => setEditedItem(prev => ({ ...prev, content: e.target.value }))}
                    className="min-h-[280px] border-none resize-none focus:ring-0"
                    placeholder="Enter your content here..."
                  />
                ) : (
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {item.content}
                    </pre>
                  </div>
                )}
              </ScrollArea>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons for Non-Editing Mode */}
        {!isEditing && item.status === 'pending' && (
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onOptimize}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enhance with AI
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onReject}
              disabled={isProcessing}
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={onApprove}
              disabled={isProcessing}
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Approve & Import
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}