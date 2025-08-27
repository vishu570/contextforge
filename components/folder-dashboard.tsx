'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Folder, 
  FileText, 
  Bot, 
  FileCode, 
  Webhook, 
  Plus, 
  Search,
  Copy,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

interface FolderDashboardProps {
  stats: {
    prompts: number;
    agents: number;
    rules: number;
    templates: number;
    total: number;
  };
  recentItems: any[];
}

const typeIcons = {
  prompt: FileText,
  agent: Bot,
  rule: FileCode,
  template: Webhook,
  snippet: FileText,
};

const typeColors = {
  prompt: 'bg-blue-900/20 text-blue-300 border-blue-700/30',
  agent: 'bg-green-900/20 text-green-300 border-green-700/30',
  rule: 'bg-purple-900/20 text-purple-300 border-purple-700/30',
  template: 'bg-orange-900/20 text-orange-300 border-orange-700/30',
  snippet: 'bg-gray-800/20 text-gray-300 border-gray-700/30',
};

export function FolderDashboard({ stats, recentItems }: FolderDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const folders = [
    {
      name: 'Prompts',
      type: 'prompts',
      icon: FileText,
      count: stats.prompts,
      description: 'AI prompts and instructions',
      color: 'bg-blue-900/20 border-blue-700/30 hover:bg-blue-900/30',
    },
    {
      name: 'Agents',
      type: 'agents', 
      icon: Bot,
      count: stats.agents,
      description: 'AI agent configurations',
      color: 'bg-green-900/20 border-green-700/30 hover:bg-green-900/30',
    },
    {
      name: 'Rules',
      type: 'rules',
      icon: FileCode,
      count: stats.rules,
      description: 'Behavior rules and guidelines',
      color: 'bg-purple-900/20 border-purple-700/30 hover:bg-purple-900/30',
    },
    {
      name: 'Templates',
      type: 'templates',
      icon: Webhook,
      count: stats.templates,
      description: 'Reusable templates',
      color: 'bg-orange-900/20 border-orange-700/30 hover:bg-orange-900/30',
    },
  ];

  const filteredRecentItems = recentItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyContent = (content: string, name: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied!',
      description: `"${name}" content copied to clipboard`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ContextForge</h1>
          <p className="text-muted-foreground">
            Manage your prompts, agents, and templates
          </p>
        </div>
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/prompts/new">
                  <FileText className="mr-2 h-4 w-4" />
                  Prompt
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/agents/new">
                  <Bot className="mr-2 h-4 w-4" />
                  Agent
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/rules/new">
                  <FileCode className="mr-2 h-4 w-4" />
                  Rule
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/templates/new">
                  <Webhook className="mr-2 h-4 w-4" />
                  Template
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Folders Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {folders.map((folder) => {
          const Icon = folder.icon;
          return (
            <Link key={folder.type} href={`/dashboard/${folder.type}`}>
              <Card className={`cursor-pointer transition-colors ${folder.color}`}>
                <CardHeader className="flex flex-row items-center space-y-0 pb-3">
                  <Icon className="h-8 w-8 mr-3" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">{folder.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {folder.description}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{folder.count}</div>
                    <Badge variant="outline">
                      {folder.count === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Items */}
      {filteredRecentItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {searchQuery ? `Search Results (${filteredRecentItems.length})` : 'Recent Items'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredRecentItems.slice(0, 10).map((item) => {
                const Icon = typeIcons[item.type as keyof typeof typeIcons] || FileText;
                const colorClass = typeColors[item.type as keyof typeof typeColors] || typeColors.snippet;
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg border ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.content.substring(0, 100)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(item.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          copyContent(item.content, item.name);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/${item.type}s/${item.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats.total === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No items yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first prompt, agent, or template
            </p>
            <Button asChild>
              <Link href="/dashboard/prompts/new">
                <Plus className="mr-2 h-4 w-4" />
                Create First Item
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}