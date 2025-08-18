'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Folder, 
  Check, 
  X, 
  Loader2, 
  FileText, 
  RefreshCw,
  FolderTree,
  ChevronRight,
  AlertCircle,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FolderSuggestion {
  id: string;
  suggestedPath: string;
  rationale: string;
  confidence: number;
  itemIds: string;
  status: 'pending' | 'applied' | 'rejected';
  createdAt: string;
  appliedAt?: string;
}

interface Item {
  id: string;
  name: string;
  type: string;
  subType?: string;
  format?: string;
}

interface AISuggestionsProps {
  items: Item[];
  onRefreshFolders?: () => void;
}

interface FolderStructurePreviewProps {
  path: string;
  itemIds: string[];
  items: Item[];
}

// Component to visualize the suggested folder structure
function FolderStructurePreview({ path, itemIds, items }: FolderStructurePreviewProps) {
  const pathParts = path.split('/').filter(Boolean);
  const suggestedItems = items.filter(item => itemIds.includes(item.id));

  return (
    <div className="bg-muted/30 p-4 rounded-lg border">
      <div className="flex items-center gap-2 mb-3">
        <FolderTree className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Suggested Structure</span>
      </div>
      
      <div className="space-y-1">
        {pathParts.map((part, index) => (
          <div key={index} className="flex items-center gap-2" style={{ paddingLeft: `${index * 16}px` }}>
            <Folder className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{part}</span>
            {index === pathParts.length - 1 && (
              <Badge variant="outline" className="text-xs">
                {suggestedItems.length} item{suggestedItems.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        ))}
        
        {suggestedItems.length > 0 && (
          <div className="mt-2 pt-2 border-t border-muted">
            <div className="text-xs text-muted-foreground mb-1">Items to organize:</div>
            {suggestedItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs" 
                   style={{ paddingLeft: `${pathParts.length * 16}px` }}>
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{item.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {item.type}
                </Badge>
              </div>
            ))}
            {suggestedItems.length > 3 && (
              <div className="text-xs text-muted-foreground ml-4">
                ... and {suggestedItems.length - 3} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AISuggestions({ items, onRefreshFolders }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<FolderSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing suggestions
  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/folders/suggestions');
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setError('Failed to load suggestions');
      toast({
        title: 'Error',
        description: 'Failed to load AI suggestions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate new suggestions
  const generateSuggestions = async (itemIds?: string[], analysisType: 'auto' | 'semantic' | 'template' = 'auto') => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const response = await fetch('/api/folders/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, analysisType })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }
      
      const data = await response.json();
      
      if (data.suggestions.length === 0) {
        toast({
          title: 'No Suggestions',
          description: data.message || 'No new organization suggestions found',
        });
      } else {
        toast({
          title: 'Suggestions Generated',
          description: `Generated ${data.suggestions.length} new suggestions from ${data.analyzedItems} items`
        });
        
        // Refresh suggestions list
        await fetchSuggestions();
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setError('Failed to generate suggestions');
      toast({
        title: 'Error',
        description: 'Failed to generate AI suggestions',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Accept or reject suggestions
  const processSuggestions = async (suggestionIds: string[], action: 'accept' | 'reject') => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/folders/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionIds, action })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} suggestions`);
      }
      
      const data = await response.json();
      
      toast({
        title: `Suggestions ${action === 'accept' ? 'Applied' : 'Rejected'}`,
        description: `Successfully ${action}ed ${data.processedSuggestions} suggestion${data.processedSuggestions !== 1 ? 's' : ''}`
      });
      
      // Clear selection and refresh
      setSelectedSuggestions([]);
      await fetchSuggestions();
      
      // Refresh folders if suggestions were accepted
      if (action === 'accept' && onRefreshFolders) {
        onRefreshFolders();
      }
    } catch (error) {
      console.error(`Error ${action}ing suggestions:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} suggestions`,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestionSelect = (suggestionId: string, selected: boolean) => {
    setSelectedSuggestions(prev => 
      selected 
        ? [...prev, suggestionId]
        : prev.filter(id => id !== suggestionId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedSuggestions(selected ? suggestions.map(s => s.id) : []);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  // Load suggestions on mount
  useEffect(() => {
    fetchSuggestions();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading AI suggestions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">AI-Powered Organization</h3>
          <p className="text-muted-foreground">
            Let AI analyze your content and suggest optimal folder structures.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchSuggestions()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => generateSuggestions()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Suggestions
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {suggestions.length > 0 && (
        <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedSuggestions.length === suggestions.length && suggestions.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedSuggestions.length > 0
                ? `${selectedSuggestions.length} selected`
                : `${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''}`
              }
            </span>
          </div>
          
          {selectedSuggestions.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => processSuggestions(selectedSuggestions, 'reject')}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-2" />
                Reject Selected
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => processSuggestions(selectedSuggestions, 'accept')}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Accept Selected
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Suggestions List */}
      {suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion) => {
            const itemIds = JSON.parse(suggestion.itemIds);
            const confidence = Math.round(suggestion.confidence * 100);
            
            return (
              <Card key={suggestion.id} className={`hover:shadow-md transition-shadow ${
                selectedSuggestions.includes(suggestion.id) ? 'ring-2 ring-primary' : ''
              }`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedSuggestions.includes(suggestion.id)}
                      onCheckedChange={(checked) => 
                        handleSuggestionSelect(suggestion.id, checked as boolean)
                      }
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-lg">{suggestion.suggestedPath}</CardTitle>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-sm font-medium">Confidence</div>
                            <div className={`text-sm ${getConfidenceColor(suggestion.confidence)}`}>
                              {getConfidenceLabel(suggestion.confidence)} ({confidence}%)
                            </div>
                          </div>
                          <Progress 
                            value={confidence} 
                            className="w-20"
                          />
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {suggestion.rationale}
                      </p>
                      
                      <FolderStructurePreview
                        path={suggestion.suggestedPath}
                        itemIds={itemIds}
                        items={items}
                      />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Created {new Date(suggestion.createdAt).toLocaleDateString()}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => processSuggestions([suggestion.id], 'reject')}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => processSuggestions([suggestion.id], 'accept')}
                        disabled={isProcessing}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No AI Suggestions</h3>
              <p className="text-muted-foreground mb-4">
                Generate AI-powered folder organization suggestions to better organize your content.
              </p>
              <Button onClick={() => generateSuggestions()} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate First Suggestions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Options */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advanced Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button
                variant="outline"
                onClick={() => generateSuggestions(undefined, 'template')}
                disabled={isGenerating}
                className="justify-start"
              >
                <FolderTree className="h-4 w-4 mr-2" />
                Template-based
              </Button>
              <Button
                variant="outline"
                onClick={() => generateSuggestions(undefined, 'semantic')}
                disabled={isGenerating}
                className="justify-start"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Semantic
              </Button>
              <Button
                variant="outline"
                onClick={() => generateSuggestions(undefined, 'auto')}
                disabled={isGenerating}
                className="justify-start"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Auto (Combined)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Different analysis methods may produce different organization suggestions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}