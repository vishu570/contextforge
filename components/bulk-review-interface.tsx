'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedReviewItem } from './unified-review-item';
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
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  SkipBack,
  Settings,
  Download,
  Upload,
  Zap,
  Target,
  Archive,
  Users,
  List,
  Grid,
  AlertTriangle
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

interface BulkReviewInterfaceProps {
  items: StagedItem[];
  onUpdateItem: (id: string, updates: Partial<StagedItem>) => void;
  onApproveItem: (id: string) => void;
  onRejectItem: (id: string) => void;
  onOptimizeItem: (id: string) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkReject: (ids: string[]) => void;
  onBulkOptimize: (ids: string[]) => void;
  isProcessing: boolean;
  availableFolders?: string[];
  availableTags?: string[];
}

export function BulkReviewInterface({
  items,
  onUpdateItem,
  onApproveItem,
  onRejectItem,
  onOptimizeItem,
  onBulkApprove,
  onBulkReject,
  onBulkOptimize,
  isProcessing,
  availableFolders = [],
  availableTags = []
}: BulkReviewInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'single' | 'list'>('single');
  const [showFilters, setShowFilters] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Filter and search items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, searchQuery, filterType, filterStatus]);

  const currentItem = filteredItems[currentIndex];
  
  // Progress calculation
  const progress = useMemo(() => {
    const total = items.length;
    const approved = items.filter(item => item.status === 'approved').length;
    const rejected = items.filter(item => item.status === 'rejected').length;
    const processed = approved + rejected;
    return {
      total,
      processed,
      approved,
      rejected,
      percentage: total > 0 ? (processed / total) * 100 : 0
    };
  }, [items]);

  const handleItemUpdate = useCallback((updates: Partial<StagedItem>) => {
    if (currentItem) {
      onUpdateItem(currentItem.id, updates);
    }
  }, [currentItem, onUpdateItem]);

  const handleApprove = useCallback(() => {
    if (currentItem) {
      onApproveItem(currentItem.id);
      if (autoAdvance && currentIndex < filteredItems.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }
  }, [currentItem, onApproveItem, autoAdvance, currentIndex, filteredItems.length]);

  const handleReject = useCallback(() => {
    if (currentItem) {
      onRejectItem(currentItem.id);
      if (autoAdvance && currentIndex < filteredItems.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }
  }, [currentItem, onRejectItem, autoAdvance, currentIndex, filteredItems.length]);

  const handleOptimize = useCallback(() => {
    if (currentItem) {
      onOptimizeItem(currentItem.id);
    }
  }, [currentItem, onOptimizeItem]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(filteredItems.length - 1, prev + 1));
  }, [filteredItems.length]);

  const handleSelectItem = useCallback((id: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(filteredItems.filter(item => item.status === 'pending').map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [filteredItems]);

  const handleBulkApprove = useCallback(() => {
    onBulkApprove(Array.from(selectedItems));
    setSelectedItems(new Set());
  }, [selectedItems, onBulkApprove]);

  const handleBulkReject = useCallback(() => {
    onBulkReject(Array.from(selectedItems));
    setSelectedItems(new Set());
  }, [selectedItems, onBulkReject]);

  const handleBulkOptimize = useCallback(() => {
    onBulkOptimize(Array.from(selectedItems));
    setSelectedItems(new Set());
  }, [selectedItems, onBulkOptimize]);

  const pendingItems = filteredItems.filter(item => item.status === 'pending');
  const selectedCount = selectedItems.size;

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Archive className="h-5 w-5" />
                <span>Import Review</span>
                <Badge variant="outline">
                  {currentIndex + 1} of {filteredItems.length}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {progress.processed} of {progress.total} items processed
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'single' ? 'list' : 'single')}
              >
                {viewMode === 'single' ? (
                  <>
                    <List className="mr-2 h-4 w-4" />
                    List View
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Single View
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress value={progress.percentage} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.approved} approved</span>
              <span>{progress.rejected} rejected</span>
              <span>{items.length - progress.processed} pending</span>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="border-t">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div>
                <Label>Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="prompt">Prompts</SelectItem>
                    <SelectItem value="agent">Agents</SelectItem>
                    <SelectItem value="rule">Rules</SelectItem>
                    <SelectItem value="template">Templates</SelectItem>
                    <SelectItem value="snippet">Snippets</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-advance"
                    checked={autoAdvance}
                    onCheckedChange={(checked) => setAutoAdvance(checked === true)}
                  />
                  <Label htmlFor="auto-advance" className="text-sm">
                    Auto-advance
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">
                  {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                </span>
                <Button variant="outline" size="sm" onClick={() => setSelectedItems(new Set())}>
                  Clear Selection
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkOptimize}
                  disabled={isProcessing}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Optimize Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkReject}
                  disabled={isProcessing}
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Reject Selected
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={isProcessing}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Approve Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {viewMode === 'single' ? (
        <div className="space-y-4">
          {/* Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentIndex === filteredItems.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <span className="text-sm text-muted-foreground">
                    Item {currentIndex + 1} of {filteredItems.length}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIndex(0)}
                    disabled={currentIndex === 0}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIndex(filteredItems.length - 1)}
                    disabled={currentIndex === filteredItems.length - 1}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Item */}
          {currentItem ? (
            <UnifiedReviewItem
              item={currentItem}
              onUpdate={handleItemUpdate}
              onApprove={handleApprove}
              onReject={handleReject}
              onOptimize={handleOptimize}
              isProcessing={isProcessing}
              availableFolders={availableFolders}
              availableTags={availableTags}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No items match your current filters</p>
                <Button variant="outline" className="mt-4" onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setFilterStatus('all');
                }}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Items</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedCount > 0 && selectedCount === pendingItems.length}
                  onCheckedChange={handleSelectAll}
                />
                <Label>Select All ({pendingItems.length} pending)</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredItems.map((item, index) => (
                  <div key={item.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    {item.status === 'pending' && (
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium truncate">{item.name}</h4>
                        <Badge variant="outline">{item.type}</Badge>
                        <Badge variant={
                          item.status === 'approved' ? 'default' :
                          item.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {item.status}
                        </Badge>
                        {item.duplicates && item.duplicates.length > 0 && (
                          <Badge variant="destructive">
                            {item.duplicates.length} duplicates
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {item.content.substring(0, 150)}...
                      </p>
                      
                      {item.classification && (
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>AI: {item.classification.type}</span>
                          <span>({Math.round(item.classification.confidence * 100)}%)</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCurrentIndex(index);
                          setViewMode('single');
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {item.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOptimizeItem(item.id)}
                            disabled={isProcessing}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRejectItem(item.id)}
                            disabled={isProcessing}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onApproveItem(item.id)}
                            disabled={isProcessing}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}