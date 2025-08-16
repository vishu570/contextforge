'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
  Copy
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
  }>;
  suggestedPath?: string;
  status: 'pending' | 'approved' | 'rejected';
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

interface EnhancedReviewItemProps {
  item: StagedItem;
  onUpdate: (updates: Partial<StagedItem>) => void;
  onApprove: () => void;
  onReject: () => void;
  onOptimize: () => void;
  isProcessing: boolean;
}

export function EnhancedReviewItem({ 
  item, 
  onUpdate, 
  onApprove, 
  onReject, 
  onOptimize, 
  isProcessing 
}: EnhancedReviewItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);
  
  const Icon = typeIcons[item.type];

  const handleSave = () => {
    onUpdate(editedItem);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedItem(item);
    setIsEditing(false);
  };

  const handleTypeChange = (newType: string) => {
    setEditedItem(prev => ({ 
      ...prev, 
      type: newType as StagedItem['type'],
      classification: prev.classification ? {
        ...prev.classification,
        type: newType
      } : undefined
    }));
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
      
      <CardContent>
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="content">
              <Eye className="mr-2 h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="classification">
              <Sparkles className="mr-2 h-4 w-4" />
              Classification
            </TabsTrigger>
            <TabsTrigger value="organization">
              <Folder className="mr-2 h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="duplicates">
              <Copy className="mr-2 h-4 w-4" />
              Duplicates
              {item.duplicates && item.duplicates.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {item.duplicates.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="optimizations">
              <RefreshCw className="mr-2 h-4 w-4" />
              Optimizations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="space-y-4">
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
                <ScrollArea className="h-[400px] w-full rounded-md border">
                  {isEditing ? (
                    <Textarea
                      value={editedItem.content}
                      onChange={(e) => setEditedItem(prev => ({ ...prev, content: e.target.value }))}
                      className="min-h-[380px] border-none resize-none focus:ring-0"
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
            </div>
          </TabsContent>

          <TabsContent value="classification" className="space-y-4">
            {item.classification ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">AI Classification Result</h4>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {Math.round(item.classification.confidence * 100)}%
                    </p>
                  </div>
                  <Badge className={typeColors[item.classification.type as keyof typeof typeColors]}>
                    {item.classification.type}
                  </Badge>
                </div>
                
                {item.classification.reasoning && (
                  <div>
                    <h5 className="font-medium mb-2">AI Reasoning:</h5>
                    <p className="text-sm text-muted-foreground p-3 bg-accent/50 rounded-md">
                      {item.classification.reasoning}
                    </p>
                  </div>
                )}
                
                {item.classification.confidence < 0.7 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Low confidence classification. Please review and correct if needed.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No AI classification available</p>
                <Button variant="outline" className="mt-2" onClick={onOptimize}>
                  Run Classification
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="organization" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Suggested Folder Path</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono bg-accent/50 px-2 py-1 rounded">
                    {item.suggestedPath || `/${item.type}s/${item.name}`}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1">
                  {item.metadata.tags?.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">No tags</span>}
                </div>
              </div>
              
              {item.language && (
                <div>
                  <Label>Programming Language</Label>
                  <Badge variant="outline" className="ml-2">
                    {item.language}
                  </Badge>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="duplicates" className="space-y-4">
            {item.duplicates && item.duplicates.length > 0 ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {item.duplicates.length} potential duplicate{item.duplicates.length > 1 ? 's' : ''} found
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  {item.duplicates.map((duplicate, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{duplicate.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {Math.round(duplicate.similarity * 100)}% similar
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            Compare
                          </Button>
                          <Button size="sm" variant="outline">
                            Merge
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Copy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No duplicates found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This item appears to be unique
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="optimizations" className="space-y-4">
            {item.optimizations && item.optimizations.length > 0 ? (
              <div className="space-y-4">
                {item.optimizations.map((opt, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>Optimized for {opt.targetModel}</span>
                        <Badge variant="outline">
                          {Math.round(opt.confidence * 100)}% confidence
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-sm mb-2">Improvements:</h5>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {opt.suggestions.map((suggestion, i) => (
                              <li key={i}>• {suggestion}</li>
                            ))}
                          </ul>
                        </div>
                        <Separator />
                        <div>
                          <h5 className="font-medium text-sm mb-2">Optimized Content:</h5>
                          <ScrollArea className="h-32 w-full rounded border">
                            <div className="p-2">
                              <pre className="text-xs whitespace-pre-wrap">
                                {opt.optimizedContent}
                              </pre>
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No optimizations available</p>
                <Button variant="outline" onClick={onOptimize} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Optimizations
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}