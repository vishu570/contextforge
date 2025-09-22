'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileTreeItem } from '@/editor';
import {
  Bot,
  FileCode,
  FileText,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Webhook
} from 'lucide-react';
import { useState } from 'react';

interface FileTreeProps {
  items: FileTreeItem[];
  onFileSelect: (item: FileTreeItem) => void;
  onFileCreate: (type: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
  onFileDelete: (fileId: string) => void;
}

const typeIcons = {
  prompt: FileText,
  agent: Bot,
  rule: FileCode,
  template: Webhook,
  snippet: FileText,
  other: FileText,
};

const typeColors = {
  prompt: 'text-blue-400',
  agent: 'text-green-400',
  rule: 'text-purple-400',
  template: 'text-orange-400',
  snippet: 'text-gray-400',
  other: 'text-gray-400',
};

const typeBadgeColors = {
  prompt: 'bg-blue-900/30 text-blue-300 border-blue-700/50',
  agent: 'bg-green-900/30 text-green-300 border-green-700/50',
  rule: 'bg-purple-900/30 text-purple-300 border-purple-700/50',
  template: 'bg-orange-900/30 text-orange-300 border-orange-700/50',
  snippet: 'bg-gray-800/30 text-gray-300 border-gray-700/50',
  other: 'bg-gray-800/30 text-gray-300 border-gray-700/50',
};

// Sub-categorization functions based on the desired structure
function getPromptSubCategory(item: FileTreeItem): string {
  const name = item.name.toLowerCase();
  const content = item.content.toLowerCase();
  const tags = item.tags || [];

  // Business & Strategy
  if (tags.some(tag => ['business', 'strategy', 'market', 'competitive', 'research'].includes(tag.toLowerCase())) ||
      name.includes('business') || name.includes('strategy') || name.includes('market') || name.includes('competitive')) {
    return 'Business & Strategy';
  }

  // Automation
  if (tags.some(tag => ['automation', 'workflow', 'orchestrator', 'coordinator'].includes(tag.toLowerCase())) ||
      name.includes('automation') || name.includes('workflow') || name.includes('orchestrator')) {
    return 'Automation';
  }

  // Creative & Design
  if (tags.some(tag => ['creative', 'design', 'ui', 'ux'].includes(tag.toLowerCase())) ||
      name.includes('creative') || name.includes('design') || name.includes('ui')) {
    return 'Creative & Design';
  }

  // Data & Analytics
  if (tags.some(tag => ['data', 'analytics', 'analysis', 'scientist'].includes(tag.toLowerCase())) ||
      name.includes('data') || name.includes('analytics') || name.includes('analyst')) {
    return 'Data & Analytics';
  }

  // Development
  if (tags.some(tag => ['development', 'developer', 'engineer', 'coding', 'programming'].includes(tag.toLowerCase())) ||
      name.includes('developer') || name.includes('engineer') || name.includes('coding')) {
    return 'Development';
  }

  // Marketing
  if (tags.some(tag => ['marketing', 'content', 'seo'].includes(tag.toLowerCase())) ||
      name.includes('marketing') || name.includes('content') || name.includes('seo')) {
    return 'Marketing';
  }

  return 'General';
}

function getRuleSubCategory(item: FileTreeItem): string {
  const name = item.name.toLowerCase();
  const content = item.content.toLowerCase();
  const tags = item.tags || [];

  // Assistants
  if (name.includes('assistant') || content.includes('assistant')) {
    return 'Assistants';
  }

  // Memory
  if (name.includes('memory') || content.includes('memory')) {
    return 'Memory';
  }

  // Personas
  if (name.includes('persona') || content.includes('persona')) {
    return 'Personas';
  }

  // Planning
  if (name.includes('plan') || content.includes('planning')) {
    return 'Planning';
  }

  // Reasoning
  if (name.includes('reason') || content.includes('reasoning')) {
    return 'Reasoning';
  }

  return 'General';
}

function getAgentSubCategory(item: FileTreeItem): string {
  const name = item.name.toLowerCase();
  const tags = item.tags || [];

  // Frameworks
  if (tags.some(tag => ['framework', 'architecture'].includes(tag.toLowerCase())) ||
      name.includes('framework') || name.includes('architect')) {
    return 'Frameworks';
  }

  // Languages
  if (tags.some(tag => ['language', 'programming-language'].includes(tag.toLowerCase())) ||
      name.includes('python') || name.includes('javascript') || name.includes('java') ||
      name.includes('csharp') || name.includes('golang') || name.includes('rust') ||
      name.includes('php') || name.includes('typescript') || name.includes('swift') ||
      name.includes('kotlin') || name.includes('cpp')) {
    return 'Languages';
  }

  // Models
  if (tags.some(tag => ['model', 'ai-model'].includes(tag.toLowerCase())) ||
      name.includes('model') || name.includes('llm')) {
    return 'Models';
  }

  // Tools
  if (tags.some(tag => ['tool', 'utility', 'cli'].includes(tag.toLowerCase())) ||
      name.includes('tool') || name.includes('cli') || name.includes('utility')) {
    return 'Tools';
  }

  return 'General';
}

function getCommandSubCategory(item: FileTreeItem): string {
  const name = item.name.toLowerCase();
  const content = item.content.toLowerCase();

  // Git commands
  if (name.includes('git') || content.includes('git')) {
    return 'Git';
  }

  // Docker commands
  if (name.includes('docker') || content.includes('docker')) {
    return 'Docker';
  }

  // Package management
  if (name.includes('npm') || name.includes('yarn') || name.includes('pnpm') ||
      content.includes('npm') || content.includes('yarn') || content.includes('pnpm')) {
    return 'Package Management';
  }

  // Development tools
  if (name.includes('build') || name.includes('webpack') || name.includes('vite') ||
      content.includes('build') || content.includes('webpack') || content.includes('vite')) {
    return 'Build Tools';
  }

  return 'General';
}

function getTemplateSubCategory(item: FileTreeItem): string {
  const name = item.name.toLowerCase();
  const content = item.content.toLowerCase();

  // Code templates
  if (name.includes('component') || content.includes('component')) {
    return 'Code';
  }

  // Documentation templates
  if (name.includes('readme') || name.includes('documentation') || name.includes('api') ||
      content.includes('readme') || content.includes('documentation') || content.includes('api')) {
    return 'Documentation';
  }

  // Configuration templates
  if (name.includes('config') || name.includes('eslint') || name.includes('webpack') ||
      content.includes('config') || content.includes('eslint') || content.includes('webpack')) {
    return 'Configuration';
  }

  return 'General';
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w`;

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo`;
}

export function FileTree({ items, onFileSelect, onFileCreate, onFileRename, onFileDelete }: FileTreeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'type'>('updated');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['Prompts', 'Prompts/Business & Strategy', 'Rules', 'Agents']));
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Sort items based on sort preference
  const sortItems = (items: FileTreeItem[]) => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
  };

  // Group items by item type with sub-categorization
  const groupedItems = items.reduce((acc, item) => {
    let primaryCategory = '';
    let subCategory = '';

    // Determine primary category
    switch (item.type) {
      case 'agent':
        primaryCategory = 'Agents';
        subCategory = getAgentSubCategory(item);
        break;
      case 'prompt':
        primaryCategory = 'Prompts';
        subCategory = getPromptSubCategory(item);
        break;
      case 'rule':
        primaryCategory = 'Rules';
        subCategory = getRuleSubCategory(item);
        break;
      case 'template':
        primaryCategory = 'Templates';
        subCategory = getTemplateSubCategory(item);
        break;
      case 'snippet':
        primaryCategory = 'Commands';
        subCategory = getCommandSubCategory(item);
        break;
      default:
        primaryCategory = 'Other';
        subCategory = 'General';
    }

    const key = `${primaryCategory}/${subCategory}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, FileTreeItem[]>);

  // Sort items within each group
  Object.keys(groupedItems).forEach(key => {
    groupedItems[key] = sortItems(groupedItems[key]);
  });

  // Filter items based on search and type filter
  const filteredGroupedItems = Object.entries(groupedItems).reduce((acc, [folder, folderItems]) => {
    const filtered = folderItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesType;
    });

    if (filtered.length > 0) {
      acc[folder] = filtered;
    }
    return acc;
  }, {} as Record<string, FileTreeItem[]>);

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderName)) {
        newSet.delete(folderName);
      } else {
        newSet.add(folderName);
      }
      return newSet;
    });
  };

  const getFolderIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Prompts': return FileText;
      case 'Agents': return Bot;
      case 'Rules': return FileCode;
      case 'Templates': return Webhook;
      case 'Commands': return FileCode;
      case 'Configurations': return FileCode;
      default: return FileText;
    }
  };

  const getFolderColor = (categoryName: string) => {
    switch (categoryName) {
      case 'Prompts': return 'text-blue-400';
      case 'Agents': return 'text-green-400';
      case 'Rules': return 'text-purple-400';
      case 'Templates': return 'text-orange-400';
      case 'Commands': return 'text-red-400';
      case 'Configurations': return 'text-indigo-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#161B22]">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
            Explorer
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onFileCreate('prompt')}>
                <FileText className="mr-2 h-4 w-4 text-blue-400" />
                New Prompt
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFileCreate('agent')}>
                <Bot className="mr-2 h-4 w-4 text-green-400" />
                New Agent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFileCreate('rule')}>
                <FileCode className="mr-2 h-4 w-4 text-purple-400" />
                New Rule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFileCreate('template')}>
                <Webhook className="mr-2 h-4 w-4 text-orange-400" />
                New Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500 z-10" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-xs bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500 focus:bg-gray-800 focus:border-gray-600"
          />
        </div>

        {/* Filters and Sorting */}
        <div className="flex items-center space-x-2 mb-2">
          <Filter className="h-3 w-3 text-gray-500" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[80px] h-7 text-xs bg-gray-800 border-gray-700 text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-xs text-gray-200 focus:bg-gray-700 focus:text-gray-100">All</SelectItem>
              <SelectItem value="prompt" className="text-xs text-gray-200 focus:bg-gray-700 focus:text-gray-100">Prompts</SelectItem>
              <SelectItem value="agent" className="text-xs text-gray-200 focus:bg-gray-700 focus:text-gray-100">Agents</SelectItem>
              <SelectItem value="rule" className="text-xs text-gray-200 focus:bg-gray-700 focus:text-gray-100">Rules</SelectItem>
              <SelectItem value="template" className="text-xs text-gray-200 focus:bg-gray-700 focus:text-gray-100">Templates</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Sort:</span>
          <Select value={sortBy} onValueChange={(value: 'name' | 'updated' | 'type') => setSortBy(value)}>
            <SelectTrigger className="w-[80px] h-7 text-xs bg-gray-800 border-gray-700 text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="updated" className="text-xs text-gray-200 focus:bg-gray-700 focus:text-gray-100">Updated</SelectItem>
              <SelectItem value="name" className="text-xs text-gray-200 focus:bg-gray-700 focus:text-gray-100">Name</SelectItem>
              <SelectItem value="type" className="text-xs text-gray-200 focus:bg-gray-700 focus:text-gray-100">Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto p-2">
        {Object.entries(filteredGroupedItems).length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No files found</p>
            {searchQuery && (
              <p className="text-xs text-gray-600 mt-1">
                Try adjusting your search or filter
              </p>
            )}
          </div>
        ) : (
          // Group by primary category for hierarchical display
          (() => {
            const hierarchicalStructure = Object.entries(filteredGroupedItems).reduce((acc, [fullPath, items]) => {
              const [primaryCategory, subCategory] = fullPath.split('/');

              if (!acc[primaryCategory]) {
                acc[primaryCategory] = {};
              }
              acc[primaryCategory][subCategory] = items;

              return acc;
            }, {} as Record<string, Record<string, FileTreeItem[]>>);

            return Object.entries(hierarchicalStructure).map(([primaryCategory, subCategories]) => {
              const PrimaryIcon = getFolderIcon(primaryCategory);
              const primaryColor = getFolderColor(primaryCategory);
              const isPrimaryExpanded = expandedFolders.has(primaryCategory);
              const totalItems = Object.values(subCategories).flat().length;

              return (
                <div key={primaryCategory} className="mb-2">
                  {/* Primary Category Header */}
                  <button
                    onClick={() => toggleFolder(primaryCategory)}
                    className="flex items-center w-full px-2 py-1 rounded hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <div className={`transform transition-transform ${isPrimaryExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </div>
                      <PrimaryIcon className={`h-4 w-4 ${primaryColor}`} />
                      <span className="text-sm text-gray-200 font-medium">
                        {primaryCategory}
                      </span>
                      <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                        {totalItems}
                      </Badge>
                    </div>
                  </button>

                  {/* Sub-categories */}
                  {isPrimaryExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {Object.entries(subCategories).map(([subCategory, subItems]) => {
                        const subPath = `${primaryCategory}/${subCategory}`;
                        const isSubExpanded = expandedFolders.has(subPath);

                        return (
                          <div key={subPath}>
                            {/* Sub-category Header */}
                            <button
                              onClick={() => toggleFolder(subPath)}
                              className="flex items-center w-full px-2 py-1 rounded hover:bg-gray-800/50 transition-colors text-sm"
                            >
                              <div className="flex items-center space-x-2 flex-1">
                                <div className={`transform transition-transform ${isSubExpanded ? 'rotate-90' : ''}`}>
                                  ▶
                                </div>
                                <span className="text-gray-300">
                                  {subCategory}
                                </span>
                                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                  {subItems.length}
                                </Badge>
                              </div>
                            </button>

                            {/* Sub-category Contents */}
                            {isSubExpanded && (
                              <div className="ml-6 mt-1 space-y-1">
                                {subItems.map((item) => {
                      const ItemIcon = typeIcons[item.type];
                      const itemColor = typeColors[item.type];
                      const isSelected = selectedItemId === item.id;
                      const updatedAt = new Date(item.updatedAt);
                      const timeAgo = formatTimeAgo(updatedAt);

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center group rounded px-2 py-1.5 cursor-pointer transition-colors ${isSelected
                            ? 'bg-blue-600/20 border border-blue-500/30'
                            : 'hover:bg-gray-800/50'
                            }`}
                          onClick={() => {
                            setSelectedItemId(item.id);
                            onFileSelect(item);
                          }}
                        >
                          <ItemIcon className={`h-3 w-3 mr-2 ${itemColor} flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className={`text-sm truncate ${isSelected ? 'text-blue-200' : 'text-gray-200'}`}>
                                {item.name}
                              </div>
                              <div className="text-xs text-gray-500 ml-2">
                                {timeAgo}
                              </div>
                            </div>

                            {/* Content preview */}
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              <div className="text-xs text-gray-500 truncate mt-0.5">
                                {item.content ? `${item.content.slice(0, 60)}...` : 'No content'}
                              </div>
                            </div>

                            {/* Tags */}
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className={`text-xs px-1.5 py-0.5 rounded ${typeBadgeColors[item.type]} border`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {item.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{item.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onFileSelect(item)}>
                                Open
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(item.content)}
                              >
                                Copy Content
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  const newName = prompt('Enter new name:', item.name);
                                  if (newName && newName !== item.name) {
                                    onFileRename(item.id, newName);
                                  }
                                }}
                              >
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                                    onFileDelete(item.id);
                                  }
                                }}
                                className="text-red-400"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Status Bar */}
      <div className="p-2 border-t border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <div>
            {Object.values(filteredGroupedItems).flat().length} of {items.length} items
          </div>
          <div className="flex space-x-2">
            {Object.entries(groupedItems).map(([type, items]) => (
              <span key={type} className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${getFolderColor(type).replace('text-', 'bg-')}`} />
                <span>{items.length}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}