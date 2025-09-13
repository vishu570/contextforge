'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { UnifiedReviewItem } from '@/components/unified-review-item';
import { BulkActionsToolbar } from '@/components/bulk-actions-toolbar';
import { useToast } from '@/hooks/use-toast';
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

function ImportReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const importId = searchParams.get('importId');
  const { toast } = useToast();
  
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<StagedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Bulk selection state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  
  // Custom paths state - persists user-entered paths across item switching
  const [customPaths, setCustomPaths] = useState<Map<string, string>>(new Map());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingItemIds = stagedItems
        .filter(item => item.status === 'pending')
        .map(item => item.id);
      setSelectedItemIds(new Set(pendingItemIds));
    } else {
      setSelectedItemIds(new Set());
    }
  };

  const handleCustomPathChange = (itemId: string, path: string) => {
    setCustomPaths(prev => new Map(prev.set(itemId, path)));
  };

  useEffect(() => {
    if (importId) {
      fetchStagedItems(importId);
    }
  }, [importId]);

  // Keyboard shortcuts for bulk operations
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in an input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Ctrl/Cmd + A: Select all pending items
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        handleSelectAll(true);
      }

      // Escape: Clear selection
      if (event.key === 'Escape') {
        setSelectedItemIds(new Set());
      }

      // Ctrl/Cmd + Shift + A: Approve selected items
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        if (selectedItemIds.size > 0) {
          handleBulkAction('approve');
        }
      }

      // Ctrl/Cmd + Shift + R: Reject selected items
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        if (selectedItemIds.size > 0) {
          handleBulkAction('reject');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemIds, handleSelectAll]);

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
      
      // If the currently selected item was processed, move to next pending item
      // Otherwise keep the current selection
      if (selectedItem?.id === itemId) {
        const nextPendingItem = stagedItems.find(item => 
          item.id !== itemId && item.status === 'pending'
        );
        setSelectedItem(nextPendingItem || null);
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
      
      toast({
        title: "Optimizations Generated",
        description: `Generated ${data.optimizations.length} optimizations`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate optimizations';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadDuplicates = async (itemId: string) => {
    try {
      const response = await fetch(`/api/import/staged/${itemId}/duplicates`);
      if (!response.ok) throw new Error('Failed to load duplicates');
      
      const data = await response.json();
      
      // Update local state with duplicates
      setStagedItems(items => 
        items.map(item => 
          item.id === itemId 
            ? { ...item, duplicates: data.duplicates }
            : item
        )
      );
      
      if (selectedItem?.id === itemId) {
        setSelectedItem({ ...selectedItem, duplicates: data.duplicates });
      }
    } catch (err) {
      console.error('Failed to load duplicates:', err);
    }
  };

  const runClassification = async (itemId: string, content: string, name: string, type: string) => {
    try {
      const response = await fetch(`/api/import/staged/${itemId}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, name, type }),
      });
      
      if (!response.ok) throw new Error('Failed to run classification');
      
      const data = await response.json();
      
      // Update local state with classification
      setStagedItems(items => 
        items.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                classification: data.classification,
                suggestedPath: data.suggestedPath,
                metadata: { ...item.metadata, ...data.extractedMetadata },
                tags: data.extractedMetadata?.extractedTags || item.tags
              }
            : item
        )
      );
      
      if (selectedItem?.id === itemId) {
        setSelectedItem({ 
          ...selectedItem, 
          classification: data.classification,
          suggestedPath: data.suggestedPath,
          metadata: { ...selectedItem.metadata, ...data.extractedMetadata },
          tags: data.extractedMetadata?.extractedTags || selectedItem.tags
        });
      }
      
      const tagCount = data.extractedMetadata?.extractedTags?.length || 0;
      toast({
        title: "Classification Complete",
        description: `Classified as ${data.classification.type} with ${Math.round(data.classification.confidence * 100)}% confidence${tagCount > 0 ? ` and ${tagCount} tags extracted` : ''}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run classification';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const updateItemData = (itemId: string, updates: Partial<StagedItem>) => {
    setStagedItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, ...updates }
          : item
      )
    );
    
    if (selectedItem?.id === itemId) {
      setSelectedItem({ ...selectedItem, ...updates });
    }
  };

  // Bulk selection handlers
  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleBulkAction = async (action: 'approve' | 'reject', itemIds?: string[]) => {
    const targetItemIds = itemIds || Array.from(selectedItemIds);
    if (targetItemIds.length === 0) return;
    
    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: targetItemIds.length });
    
    try {
      const response = await fetch('/api/import/staged/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: targetItemIds,
          action,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} items`);
      }
      
      const result = await response.json();
      
      // Update local state for all successfully processed items
      setStagedItems(items => 
        items.map(item => 
          targetItemIds.includes(item.id)
            ? { ...item, status: action === 'approve' ? 'approved' : 'rejected' }
            : item
        )
      );
      
      // Clear selection
      setSelectedItemIds(new Set());
      
      // Move to next pending item if current item was processed
      if (selectedItem && targetItemIds.includes(selectedItem.id)) {
        const nextPendingItem = stagedItems.find(item => 
          !targetItemIds.includes(item.id) && item.status === 'pending'
        );
        setSelectedItem(nextPendingItem || null);
      }
      
      // Show success message with details
      if (result.failureCount > 0) {
        toast({
          title: "Bulk Action Partially Complete",
          description: `Successfully ${action}d ${result.successCount} of ${result.totalItems} items. ${result.failureCount} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Bulk Action Complete",
          description: `Successfully ${action}d ${result.successCount} items`,
        });
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} items`);
      toast({
        title: "Error",
        description: `Failed to complete bulk ${action} operation`,
        variant: "destructive",
      });
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const handleApproveAll = () => {
    const pendingItemIds = stagedItems
      .filter(item => item.status === 'pending')
      .map(item => item.id);
    handleBulkAction('approve', pendingItemIds);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
      </div>
    );
  }

  if (!importId || stagedItems.length === 0) {
    return (
      <div className="container mx-auto px-6 py-6">
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
      </div>
    );
  }

  const pendingCount = stagedItems.filter(item => item.status === 'pending').length;
  const approvedCount = stagedItems.filter(item => item.status === 'approved').length;
  const rejectedCount = stagedItems.filter(item => item.status === 'rejected').length;

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Review Import</h1>
            <p className="text-muted-foreground">
              Review and approve imported items before adding them to your library
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-muted-foreground hidden lg:block">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+A</kbd> Select all •{' '}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+Shift+A</kbd> Approve •{' '}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> Clear
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
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isBulkProcessing && (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Processing bulk operation... This may take a few moments.
            </AlertDescription>
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

        {/* Bulk Actions Toolbar */}
        <BulkActionsToolbar
          selectedCount={selectedItemIds.size}
          totalPendingCount={pendingCount}
          isProcessing={isBulkProcessing}
          progress={bulkProgress}
          onSelectAll={handleSelectAll}
          onClearSelection={() => setSelectedItemIds(new Set())}
          onBulkApprove={() => handleBulkAction('approve')}
          onBulkReject={() => handleBulkAction('reject')}
          onApproveAll={handleApproveAll}
          allSelected={pendingCount > 0 && selectedItemIds.size === pendingCount}
        />

        {/* Enhanced Review Interface */}
        <div className="space-y-6">
          {/* Items List with Inline Details */}
          <Card>
            <CardHeader>
              <CardTitle>Items to Review ({selectedItem ? stagedItems.findIndex(item => item.id === selectedItem?.id) + 1 : 0} of {stagedItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stagedItems.map((item) => {
                  const Icon = typeIcons[item.type];
                  const isSelected = selectedItem?.id === item.id;
                  const isChecked = selectedItemIds.has(item.id);
                  const isPending = item.status === 'pending';
                  
                  return (
                    <div key={item.id} className="space-y-0">
                      {/* Item Row */}
                      <div
                        className={`flex items-center space-x-3 p-2 rounded-lg border ${
                          isSelected 
                            ? 'bg-accent border-accent-foreground/20' 
                            : 'hover:bg-accent/50'
                        } ${
                          isChecked && isPending
                            ? 'ring-2 ring-primary/20 bg-primary/5'
                            : ''
                        }`}
                      >
                        {/* Checkbox for pending items */}
                        {isPending && (
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => 
                              handleSelectItem(item.id, checked as boolean)
                            }
                            disabled={isBulkProcessing}
                          />
                        )}
                        
                        {/* Item button - takes up remaining space */}
                        <Button
                          variant={isSelected ? "default" : "ghost"}
                          size="sm"
                          onClick={() => {
                            // Toggle selection - if already selected, deselect
                            if (isSelected) {
                              setSelectedItem(null);
                            } else {
                              setSelectedItem(item);
                              // Load duplicates when item is selected
                              loadDuplicates(item.id);
                            }
                          }}
                          className="flex-1 justify-start h-auto p-2"
                          disabled={isBulkProcessing}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          <span className="flex-1 text-left truncate">{item.name}</span>
                          <div className="flex items-center space-x-1 ml-2">
                            {item.status === 'pending' && <Clock className="h-3 w-3 text-orange-500" />}
                            {item.status === 'approved' && <CheckCircle className="h-3 w-3 text-green-500" />}
                            {item.status === 'rejected' && <XCircle className="h-3 w-3 text-red-500" />}
                          </div>
                        </Button>
                      </div>
                      
                      {/* Inline Enhanced Review Item */}
                      {isSelected && (
                        <div className={`mt-2 rounded-lg ${
                          selectedItemIds.has(item.id) && item.status === 'pending'
                            ? 'ring-2 ring-primary/20'
                            : ''
                        }`}>
                          <UnifiedReviewItem
                            item={item}
                            onUpdate={(updates) => updateItemData(item.id, updates)}
                            onApprove={() => handleItemAction(item.id, 'approve')}
                            onReject={() => handleItemAction(item.id, 'reject')}
                            onOptimize={() => generateOptimizations(item.id)}
                            onRunClassification={() => runClassification(item.id, item.content, item.name, item.type)}
                            isProcessing={isProcessing || isBulkProcessing}
                            customPaths={customPaths}
                            onCustomPathChange={handleCustomPathChange}
                          />
                          {selectedItemIds.has(item.id) && item.status === 'pending' && (
                            <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded text-sm text-primary">
                              This item is selected for bulk operations
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {stagedItems.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No items to review</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

export default function ImportReviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
    }>
      <ImportReviewContent />
    </Suspense>
  );
}