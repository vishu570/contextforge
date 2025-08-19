'use client';

import { useState } from 'react';
import { getModelConfigs, getDefaultModel } from '@/lib/models/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Zap,
  Download,
  Upload,
  Copy,
  Layers,
  Combine,
  Sparkles,
  Code,
  FileText,
  Bot,
  Terminal,
  Rocket,
  Target,
  ChevronDown,
  Plus,
  Play,
  Settings,
  Save
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'assembly' | 'export' | 'batch' | 'template' | 'optimization';
  action: () => void;
  isPopular?: boolean;
  estimatedTime?: string;
}

interface ContextTemplate {
  id: string;
  name: string;
  description: string;
  model: string;
  itemCount: number;
  estimatedTokens: number;
  category: string;
  tags: string[];
}

interface QuickActionsPanelProps {
  onActionExecute?: (actionId: string) => void;
  selectedItems?: string[];
}

export function QuickActionsPanel({ 
  onActionExecute,
  selectedItems = [] 
}: QuickActionsPanelProps) {
  const [isAssemblyDialogOpen, setIsAssemblyDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(getDefaultModel().id);

  const quickActions: QuickAction[] = [
    {
      id: 'assemble-context',
      title: 'Assemble Context',
      description: 'Create optimized context for AI model',
      icon: <Layers className="h-4 w-4" />,
      category: 'assembly',
      action: () => setIsAssemblyDialogOpen(true),
      isPopular: true,
      estimatedTime: '30s'
    },
    {
      id: 'batch-optimize',
      title: 'Batch Optimize',
      description: 'Optimize multiple items for better performance',
      icon: <Sparkles className="h-4 w-4" />,
      category: 'optimization',
      action: () => onActionExecute?.('batch-optimize'),
      estimatedTime: '2-5min'
    },
    {
      id: 'export-bundle',
      title: 'Export Bundle',
      description: 'Package context for external tools',
      icon: <Download className="h-4 w-4" />,
      category: 'export',
      action: () => onActionExecute?.('export-bundle'),
      estimatedTime: '10s'
    },
    {
      id: 'create-template',
      title: 'Create Template',
      description: 'Save current selection as reusable template',
      icon: <Save className="h-4 w-4" />,
      category: 'template',
      action: () => onActionExecute?.('create-template'),
      estimatedTime: '20s'
    },
    {
      id: 'duplicate-check',
      title: 'Find Duplicates',
      description: 'Scan for duplicate or similar content',
      icon: <Copy className="h-4 w-4" />,
      category: 'batch',
      action: () => onActionExecute?.('duplicate-check'),
      estimatedTime: '1min'
    },
    {
      id: 'merge-prompts',
      title: 'Merge Prompts',
      description: 'Intelligently combine similar prompts',
      icon: <Combine className="h-4 w-4" />,
      category: 'optimization',
      action: () => onActionExecute?.('merge-prompts'),
      estimatedTime: '45s'
    }
  ];

  const contextTemplates: ContextTemplate[] = [
    {
      id: '1',
      name: 'Full Stack Development',
      description: 'Complete context for web application development',
      model: getDefaultModel().name,
      itemCount: 12,
      estimatedTokens: 8500,
      category: 'Development',
      tags: ['React', 'Node.js', 'TypeScript', 'Database']
    },
    {
      id: '2',
      name: 'Code Review Assistant',
      description: 'Focused context for code analysis and review',
      model: getModelConfigs()[1]?.name || 'GPT-5',
      itemCount: 8,
      estimatedTokens: 6200,
      category: 'Review',
      tags: ['Code Quality', 'Security', 'Performance']
    },
    {
      id: '3',
      name: 'API Documentation',
      description: 'Context optimized for API documentation generation',
      model: getDefaultModel().name,
      itemCount: 6,
      estimatedTokens: 4100,
      category: 'Documentation',
      tags: ['OpenAPI', 'REST', 'GraphQL']
    },
    {
      id: '4',
      name: 'Data Analysis Pipeline',
      description: 'Python and R focused data science context',
      model: getModelConfigs()[1]?.name || 'GPT-5',
      itemCount: 10,
      estimatedTokens: 7300,
      category: 'Data Science',
      tags: ['Python', 'Pandas', 'Visualization', 'ML']
    }
  ];

  const models = getModelConfigs();

  const exportFormats = [
    { id: 'contextforge', name: 'ContextForge Bundle', icon: <FileText className="h-4 w-4" /> },
    { id: 'cursor', name: 'Cursor IDE', icon: <Code className="h-4 w-4" /> },
    { id: 'vscode', name: 'VS Code Extension', icon: <Code className="h-4 w-4" /> },
    { id: 'cli', name: 'CLI Tool', icon: <Terminal className="h-4 w-4" /> },
    { id: 'api', name: 'API Payload', icon: <Bot className="h-4 w-4" /> }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'assembly': return <Layers className="h-4 w-4 text-blue-500" />;
      case 'export': return <Download className="h-4 w-4 text-green-500" />;
      case 'batch': return <Copy className="h-4 w-4 text-purple-500" />;
      case 'template': return <Save className="h-4 w-4 text-orange-500" />;
      case 'optimization': return <Sparkles className="h-4 w-4 text-yellow-500" />;
      default: return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const actionsByCategory = quickActions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Quick Actions</h2>
          <p className="text-muted-foreground">
            Streamline your AI context workflow with one-click actions
          </p>
        </div>
        {selectedItems.length > 0 && (
          <Badge variant="outline" className="px-3 py-1">
            {selectedItems.length} items selected
          </Badge>
        )}
      </div>

      <Tabs defaultValue="popular" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="popular">Popular</TabsTrigger>
          <TabsTrigger value="assembly">Assembly</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="popular" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {quickActions
              .filter(action => action.isPopular)
              .map((action) => (
                <Card key={action.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {action.icon}
                        <div>
                          <p className="font-medium">{action.title}</p>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Button size="sm" onClick={action.action}>
                          <Play className="mr-1 h-3 w-3" />
                          Run
                        </Button>
                        {action.estimatedTime && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ~{action.estimatedTime}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="assembly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Rocket className="h-5 w-5" />
                <span>Smart Context Assembly</span>
              </CardTitle>
              <CardDescription>
                Create optimized context packages for different AI models and use cases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Dialog open={isAssemblyDialogOpen} onOpenChange={setIsAssemblyDialogOpen}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4 text-center">
                        <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <p className="font-medium">Custom Assembly</p>
                        <p className="text-sm text-muted-foreground">Build context from scratch</p>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Assemble Context</DialogTitle>
                      <DialogDescription>
                        Create an optimized context package for your AI model
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Target Model</label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {models.find(m => m.id === selectedModel)?.name}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-full">
                            {models.map((model) => (
                              <DropdownMenuItem
                                key={model.id}
                                onClick={() => setSelectedModel(model.id)}
                              >
                                <div className="flex justify-between w-full">
                                  <span>{model.name}</span>
                                  <span className="text-muted-foreground">${model.cost}/1k tokens</span>
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Estimated Cost</label>
                        <div className="p-3 bg-accent rounded-lg">
                          <p className="text-sm">
                            ~8,500 tokens × ${models.find(m => m.id === selectedModel)?.cost}/1k = 
                            <span className="font-medium text-green-600 ml-1">
                              ${((8500 * (models.find(m => m.id === selectedModel)?.cost || 0)) / 1000).toFixed(3)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button className="flex-1">
                          <Zap className="mr-2 h-4 w-4" />
                          Assemble Context
                        </Button>
                        <Button variant="outline">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {Object.entries(actionsByCategory).map(([category, actions]) => {
                  if (category !== 'assembly') return null;
                  return actions.map((action) => (
                    <Card key={action.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4 text-center">
                        {action.icon}
                        <p className="font-medium mt-2">{action.title}</p>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                        <Button size="sm" className="mt-3" onClick={action.action}>
                          Execute
                        </Button>
                      </CardContent>
                    </Card>
                  ));
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {contextTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Model</span>
                    <span>{template.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span>{template.itemCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Tokens</span>
                    <span>{template.estimatedTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-2">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button className="w-full mt-3" onClick={() => onActionExecute?.(template.id)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Context</CardTitle>
              <CardDescription>
                Export your context in various formats for different tools and platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {exportFormats.map((format) => (
                  <Card key={format.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {format.icon}
                          <span className="font-medium">{format.name}</span>
                        </div>
                        <Button size="sm" onClick={() => onActionExecute?.(format.id)}>
                          <Download className="mr-1 h-3 w-3" />
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}