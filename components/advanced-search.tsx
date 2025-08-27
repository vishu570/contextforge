'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, X, Tag, Folder, SortAsc, SortDesc, Grid, List, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchFilters {
  query: string;
  type: 'all' | 'prompt' | 'agent' | 'rule' | 'template';
  tags: string[];
  categories: string[];
  sort: 'relevance' | 'created' | 'updated' | 'title';
  order: 'asc' | 'desc';
  semantic: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  preview?: string;
  relevanceScore: number;
}

interface SearchFacets {
  types: Array<{ value: string; count: number; label: string }>;
  tags: Array<{ value: string; count: number; label: string }>;
  categories: Array<{ value: string; count: number; label: string }>;
}

interface SearchResponse {
  items: SearchResult[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  facets: SearchFacets;
  resultsFound: number;
}

export function AdvancedSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: 'all',
    tags: [],
    categories: [],
    sort: 'relevance',
    order: 'desc',
    semantic: false
  });
  
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const performSearch = async (searchFilters = filters, page = 1) => {
    if (!searchFilters.query.trim() && searchFilters.tags.length === 0 && searchFilters.categories.length === 0) {
      setResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...searchFilters,
          limit: 20,
          offset: (page - 1) * 20,
          includeMetadata: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        console.error('Search failed:', await response.text());
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Get search suggestions
  const getSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions([
          ...data.suggestions,
          ...data.tagSuggestions
        ]);
      }
    } catch (error) {
      console.error('Suggestions error:', error);
    }
  };

  // Debounced search trigger
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (filters.query || filters.tags.length > 0 || filters.categories.length > 0) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  // Get suggestions on query change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      getSuggestions(filters.query);
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [filters.query]);

  const updateFilters = (updates: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
    setCurrentPage(1);
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      updateFilters({ tags: [...filters.tags, tag] });
    }
  };

  const removeTag = (tag: string) => {
    updateFilters({ tags: filters.tags.filter(t => t !== tag) });
  };

  const addCategory = (category: string) => {
    if (!filters.categories.includes(category)) {
      updateFilters({ categories: [...filters.categories, category] });
    }
  };

  const removeCategory = (category: string) => {
    updateFilters({ categories: filters.categories.filter(c => c !== category) });
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      type: 'all',
      tags: [],
      categories: [],
      sort: 'relevance',
      order: 'desc',
      semantic: false
    });
    setResults(null);
  };

  const handleResultClick = (item: SearchResult) => {
    router.push(`/dashboard/${item.type}s/${item.id}/edit`);
    setIsOpen(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    performSearch(filters, page);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          <Search className="h-4 w-4 mr-2" />
          <span className="text-muted-foreground">Search items...</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4">
          {/* Search Input */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search prompts, agents, rules, and templates..."
                  value={filters.query}
                  onChange={(e) => {
                    updateFilters({ query: e.target.value });
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="pl-10"
                />
                
                {/* Search Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 z-50 mt-1">
                    <CardContent className="p-2">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer rounded"
                          onClick={() => {
                            if (suggestion.type === 'item') {
                              updateFilters({ query: suggestion.title });
                            } else {
                              addTag(suggestion.value);
                            }
                            setShowSuggestions(false);
                          }}
                        >
                          {suggestion.type === 'item' ? (
                            <>
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              <span className="text-sm">{suggestion.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.itemType}
                              </Badge>
                            </>
                          ) : (
                            <>
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{suggestion.value}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {(filters.tags.length > 0 || filters.categories.length > 0 || filters.type !== 'all') && (
            <div className="flex flex-wrap gap-2">
              {filters.type !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Type: {filters.type}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ type: 'all' })} />
                </Badge>
              )}
              {filters.tags.map(tag => (
                <Badge key={tag} variant="outline" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
              {filters.categories.map(category => (
                <Badge key={category} variant="outline" className="gap-1">
                  <Folder className="h-3 w-3" />
                  {category}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeCategory(category)} />
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          )}

          <div className="flex-1 flex gap-4">
            {/* Filters Sidebar */}
            {showFilters && (
              <Card className="w-64 h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Type Filter */}
                  <div>
                    <Label className="text-xs font-medium">Type</Label>
                    <Select value={filters.type} onValueChange={(value: any) => updateFilters({ type: value })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="prompt">Prompts</SelectItem>
                        <SelectItem value="agent">Agents</SelectItem>
                        <SelectItem value="rule">Rules</SelectItem>
                        <SelectItem value="template">Templates</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <Label className="text-xs font-medium">Sort By</Label>
                    <div className="flex gap-2">
                      <Select value={filters.sort} onValueChange={(value: any) => updateFilters({ sort: value })}>
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Relevance</SelectItem>
                          <SelectItem value="created">Created</SelectItem>
                          <SelectItem value="updated">Updated</SelectItem>
                          <SelectItem value="title">Title</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateFilters({ order: filters.order === 'asc' ? 'desc' : 'asc' })}
                      >
                        {filters.order === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Semantic Search */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="semantic"
                      checked={filters.semantic}
                      onCheckedChange={(checked) => updateFilters({ semantic: !!checked })}
                    />
                    <Label htmlFor="semantic" className="text-xs">
                      Semantic Search
                    </Label>
                  </div>

                  {/* Facets */}
                  {results?.facets && (
                    <>
                      <Separator />
                      
                      {/* Tags Facet */}
                      {results.facets.tags.length > 0 && (
                        <div>
                          <Label className="text-xs font-medium">Popular Tags</Label>
                          <ScrollArea className="h-32">
                            <div className="space-y-1">
                              {results.facets.tags.slice(0, 10).map(tag => (
                                <div key={tag.value} className="flex items-center justify-between">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 justify-start text-xs"
                                    onClick={() => addTag(tag.value)}
                                  >
                                    {tag.label}
                                  </Button>
                                  <span className="text-xs text-muted-foreground">{tag.count}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Categories Facet */}
                      {results.facets.categories.length > 0 && (
                        <div>
                          <Label className="text-xs font-medium">Categories</Label>
                          <div className="space-y-1">
                            {results.facets.categories.slice(0, 8).map(category => (
                              <div key={category.value} className="flex items-center justify-between">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 justify-start text-xs"
                                  onClick={() => addCategory(category.value)}
                                >
                                  {category.label}
                                </Button>
                                <span className="text-xs text-muted-foreground">{category.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Results Area */}
            <div className="flex-1">
              {/* Results Header */}
              {results && (
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    {results.resultsFound} results found
                    {isSearching && <Loader2 className="inline h-4 w-4 ml-2 animate-spin" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Results List */}
              <ScrollArea className="flex-1">
                {results ? (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                    {results.items.map(item => (
                      <Card 
                        key={item.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleResultClick(item)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">{item.title}</h3>
                              {item.preview && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {item.preview}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {item.type}
                                </Badge>
                                {item.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {item.tags.length > 2 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{item.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            </div>
                            {filters.sort === 'relevance' && item.relevanceScore > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {Math.round(item.relevanceScore)}%
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    {filters.query || filters.tags.length > 0 || filters.categories.length > 0 
                      ? 'No results found' 
                      : 'Start typing to search your items'
                    }
                  </div>
                )}
              </ScrollArea>

              {/* Pagination */}
              {results?.pagination && results.pagination.pages > 1 && (
                <div className="flex justify-center mt-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!results.pagination.hasPrev}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground self-center">
                    Page {currentPage} of {results.pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!results.pagination.hasNext}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}