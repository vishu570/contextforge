'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  RefreshCw
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

export default function ImportReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const importId = searchParams.get('importId');
  
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<StagedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (importId) {
      fetchStagedItems(importId);
    }
  }, [importId]);

  const fetchStagedItems = async (importId: string) => {
    try {
      const response = await fetch(`/api/import/${importId}/staged`);
      if (!response.ok) throw new Error('Failed to fetch staged items');
      
      const data = await response.json();
      setStagedItems(data.items);
      if (data.items.length > 0) {
        setSelectedItem(data.items[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemAction = async (itemId: string, action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/import/staged/${itemId}/${action}`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error(`Failed to ${action} item`);
      
      // Update local state
      setStagedItems(items => 
        items.map(item => 
          item.id === itemId 
            ? { ...item, status: action === 'approve' ? 'approved' : 'rejected' }
            : item
        )
      );
      
      // Move to next pending item
      const nextPendingItem = stagedItems.find(item => 
        item.id !== itemId && item.status === 'pending'
      );
      if (nextPendingItem) {
        setSelectedItem(nextPendingItem);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} item`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/import/${importId}/finalize`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to finalize import');
      
      router.push('/dashboard?imported=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize import');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateOptimizations = async (itemId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/import/staged/${itemId}/optimize`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to generate optimizations');
      
      const data = await response.json();
      
      // Update local state with optimizations
      setStagedItems(items => 
        items.map(item => 
          item.id === itemId 
            ? { ...item, optimizations: data.optimizations }
            : item
        )
      );
      
      if (selectedItem?.id === itemId) {
        setSelectedItem({ ...selectedItem, optimizations: data.optimizations });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate optimizations');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!importId || stagedItems.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No items to review</h3>
          <p className="text-muted-foreground mb-4">
            Import some files first to review them here
          </p>
          <Button onClick={() => router.push('/dashboard/import')}>
            Go to Import
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const pendingCount = stagedItems.filter(item => item.status === 'pending').length;
  const approvedCount = stagedItems.filter(item => item.status === 'approved').length;
  const rejectedCount = stagedItems.filter(item => item.status === 'rejected').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Review Import</h1>
            <p className="text-muted-foreground">
              Review and approve imported items before adding them to your library
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/import')}
            >
              Back to Import
            </Button>
            <Button 
              onClick={handleFinalize}
              disabled={pendingCount > 0 || isProcessing}
            >
              Finalize ({approvedCount} items)
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Summary */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stagedItems.length}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Items to Review</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {stagedItems.map((item) => {
                  const Icon = typeIcons[item.type];
                  const isSelected = selectedItem?.id === item.id;
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-4 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                        isSelected ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm truncate">
                            {item.name}
                          </span>
                        </div>
                        {item.status === 'pending' && <Clock className="h-4 w-4 text-orange-500" />}
                        {item.status === 'approved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {item.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="flex items-center space-x-1 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.format}
                        </Badge>
                      </div>
                      {item.classification && (
                        <div className="text-xs text-muted-foreground">
                          AI: {item.classification.type} ({Math.round(item.classification.confidence * 100)}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Item Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  {selectedItem && (
                    <>
                      {(() => {
                        const Icon = typeIcons[selectedItem.type];
                        return <Icon className="h-5 w-5" />;
                      })()}
                      <span>{selectedItem.name}</span>
                    </>
                  )}
                </CardTitle>
                {selectedItem?.status === 'pending' && (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateOptimizations(selectedItem.id)}
                      disabled={isProcessing}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Optimize
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleItemAction(selectedItem.id, 'reject')}
                      disabled={isProcessing}
                    >
                      <ThumbsDown className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleItemAction(selectedItem.id, 'approve')}
                      disabled={isProcessing}
                    >
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedItem ? (
                <Tabs defaultValue="content" className="w-full">
                  <TabsList>
                    <TabsTrigger value="content">
                      <Eye className="mr-2 h-4 w-4" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="classification">
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI Analysis
                    </TabsTrigger>
                    {selectedItem.optimizations && (
                      <TabsTrigger value="optimizations">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Optimizations
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="content" className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline">{selectedItem.type}</Badge>
                      <Badge variant="secondary">{selectedItem.format}</Badge>
                      {selectedItem.language && (
                        <Badge variant="secondary">{selectedItem.language}</Badge>
                      )}
                      {selectedItem.targetModels && (
                        <Badge variant="secondary">{selectedItem.targetModels}</Badge>
                      )}
                    </div>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                      <pre className="whitespace-pre-wrap text-sm">
                        {selectedItem.content}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="classification" className="space-y-4">
                    {selectedItem.classification ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Detected Type:</span>
                          <Badge variant="outline">{selectedItem.classification.type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            ({Math.round(selectedItem.classification.confidence * 100)}% confidence)
                          </span>
                        </div>
                        {selectedItem.classification.reasoning && (
                          <div>
                            <span className="font-medium">Reasoning:</span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {selectedItem.classification.reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No AI analysis available</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  {selectedItem.optimizations && (
                    <TabsContent value="optimizations" className="space-y-4">
                      {selectedItem.optimizations.map((opt, index) => (
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
                                <h5 className="font-medium text-sm mb-2">Suggestions:</h5>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {opt.suggestions.map((suggestion, i) => (
                                    <li key={i}>• {suggestion}</li>
                                  ))}
                                </ul>
                              </div>
                              <Separator />
                              <div>
                                <h5 className="font-medium text-sm mb-2">Optimized Content:</h5>
                                <ScrollArea className="h-32 w-full rounded border p-2">
                                  <pre className="text-xs whitespace-pre-wrap">
                                    {opt.optimizedContent}
                                  </pre>
                                </ScrollArea>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>
                  )}
                </Tabs>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select an item to review</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}