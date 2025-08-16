'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, X, Folder, File, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FolderSearchProps {
  folders: Array<{
    id: string;
    name: string;
    path: string;
    color?: string;
    _count: { items: number };
  }>;
  onFolderSelect?: (folderId: string | null) => void;
  onSearch?: (query: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  selectedFolderId?: string | null;
  searchQuery?: string;
  placeholder?: string;
  showFilters?: boolean;
  className?: string;
}

interface SearchFilters {
  types: string[];
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  includeSubfolders: boolean;
  sortBy: 'name' | 'date' | 'type';
  sortOrder: 'asc' | 'desc';
}

const defaultFilters: SearchFilters = {
  types: [],
  dateRange: 'all',
  includeSubfolders: true,
  sortBy: 'date',
  sortOrder: 'desc'
};

const itemTypes = [
  { value: 'prompt', label: 'Prompts' },
  { value: 'agent', label: 'Agents' },
  { value: 'rule', label: 'Rules' },
  { value: 'template', label: 'Templates' },
  { value: 'snippet', label: 'Snippets' },
  { value: 'other', label: 'Other' }
];

const dateRanges = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' }
];

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date modified' },
  { value: 'type', label: 'Type' }
];

export function FolderSearch({
  folders,
  onFolderSelect,
  onSearch,
  onFiltersChange,
  selectedFolderId,
  searchQuery = '',
  placeholder = 'Search items...',
  showFilters = true,
  className
}: FolderSearchProps) {
  const [query, setQuery] = useState(searchQuery);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [showFolderSelector, setShowFolderSelector] = useState(false);

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Filter changes
  useEffect(() => {
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange]);

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setQuery('');
    onFolderSelect?.(null);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.types.length > 0) count++;
    if (filters.dateRange !== 'all') count++;
    if (!filters.includeSubfolders) count++;
    if (filters.sortBy !== 'date' || filters.sortOrder !== 'desc') count++;
    if (selectedFolderId) count++;
    return count;
  }, [filters, selectedFolderId]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Folder Selector */}
        <Popover open={showFolderSelector} onOpenChange={setShowFolderSelector}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Folder className="h-4 w-4 mr-1" />
              {selectedFolder ? selectedFolder.name : 'All folders'}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px]" align="start">
            <Command>
              <CommandInput placeholder="Search folders..." />
              <CommandList>
                <CommandEmpty>No folders found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem onSelect={() => {
                    onFolderSelect?.(null);
                    setShowFolderSelector(false);
                  }}>
                    <Folder className="h-4 w-4 mr-2" />
                    All folders
                  </CommandItem>
                  {folders.map((folder) => (
                    <CommandItem
                      key={folder.id}
                      onSelect={() => {
                        onFolderSelect?.(folder.id);
                        setShowFolderSelector(false);
                      }}
                    >
                      <Folder 
                        className="h-4 w-4 mr-2" 
                        style={{ color: folder.color }}
                      />
                      <span className="flex-1">{folder.path}</span>
                      <Badge variant="secondary" className="ml-2">
                        {folder._count.items}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filters */}
        {showFilters && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
              {itemTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type.value}
                  checked={filters.types.includes(type.value)}
                  onCheckedChange={(checked) => {
                    const newTypes = checked
                      ? [...filters.types, type.value]
                      : filters.types.filter(t => t !== type.value);
                    updateFilters({ types: newTypes });
                  }}
                >
                  {type.label}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Date Range</DropdownMenuLabel>
              {dateRanges.map((range) => (
                <DropdownMenuItem
                  key={range.value}
                  onClick={() => updateFilters({ dateRange: range.value as any })}
                  className={filters.dateRange === range.value ? 'bg-accent' : ''}
                >
                  {range.label}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => updateFilters({ sortBy: option.value as any })}
                  className={filters.sortBy === option.value ? 'bg-accent' : ''}
                >
                  {option.label}
                  {filters.sortBy === option.value && (
                    <span className="ml-auto">
                      {filters.sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.includeSubfolders}
                onCheckedChange={(checked) => 
                  updateFilters({ includeSubfolders: checked })
                }
              >
                Include subfolders
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Sort Order Toggle */}
        {showFilters && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => updateFilters({ 
              sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
            })}
          >
            {filters.sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        )}

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={clearFilters}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {(selectedFolder || filters.types.length > 0 || query) && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedFolder && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Folder className="h-3 w-3" style={{ color: selectedFolder.color }} />
              {selectedFolder.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFolderSelect?.(null)}
              />
            </Badge>
          )}
          
          {filters.types.map((type) => (
            <Badge key={type} variant="secondary" className="flex items-center gap-1">
              {itemTypes.find(t => t.value === type)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ 
                  types: filters.types.filter(t => t !== type) 
                })}
              />
            </Badge>
          ))}
          
          {query && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{query}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setQuery('')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Hook for managing search state
export function useFolderSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    if (selectedFolderId) params.set('folder', selectedFolderId);
    if (filters.types.length > 0) params.set('types', filters.types.join(','));
    if (filters.dateRange !== 'all') params.set('dateRange', filters.dateRange);
    if (!filters.includeSubfolders) params.set('includeSubfolders', 'false');
    if (filters.sortBy !== 'date') params.set('sortBy', filters.sortBy);
    if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder);
    
    return params;
  };

  const reset = () => {
    setSearchQuery('');
    setSelectedFolderId(null);
    setFilters(defaultFilters);
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedFolderId,
    setSelectedFolderId,
    filters,
    setFilters,
    buildSearchParams,
    reset
  };
}