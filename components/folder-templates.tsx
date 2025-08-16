'use client';

import React, { useState, useEffect } from 'react';
import { Template, Sparkles, Download, Plus, Settings, Copy, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface FolderTemplate {
  id: string;
  name: string;
  description?: string;
  structure: any; // JSON structure
  rules: any; // JSON rules
  category?: string;
  isPublic: boolean;
  usageCount: number;
  createdBy?: string;
}

interface AutoOrgRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    type?: string;
    subType?: string;
    namePattern?: string;
    contentPattern?: string;
    tags?: string[];
  };
  action: {
    targetFolder: string;
    createIfMissing: boolean;
  };
}

interface FolderTemplatesProps {
  templates: FolderTemplate[];
  onApplyTemplate: (templateId: string) => Promise<void>;
  onCreateTemplate: (template: Omit<FolderTemplate, 'id' | 'usageCount' | 'createdBy'>) => Promise<void>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  autoOrgRules: AutoOrgRule[];
  onUpdateAutoOrgRules: (rules: AutoOrgRule[]) => Promise<void>;
  currentFolderStructure?: any;
}

const builtInTemplates: Omit<FolderTemplate, 'id' | 'usageCount' | 'createdBy'>[] = [
  {
    name: 'Development Workflow',
    description: 'Standard folder structure for development teams',
    category: 'development',
    isPublic: true,
    structure: {
      'prompts': {
        'development': {
          'backend': {},
          'frontend': {},
          'devops': {},
          'testing': {}
        },
        'documentation': {
          'api': {},
          'user-guides': {},
          'technical': {}
        }
      },
      'agents': {
        'code-review': {},
        'testing': {},
        'deployment': {}
      },
      'rules': {
        'coding-standards': {
          'javascript': {},
          'python': {},
          'general': {}
        },
        'review-guidelines': {}
      }
    },
    rules: {
      autoAssignment: [
        {
          type: 'prompt',
          namePattern: 'api|backend|server',
          targetFolder: '/prompts/development/backend'
        },
        {
          type: 'prompt',
          namePattern: 'frontend|ui|component',
          targetFolder: '/prompts/development/frontend'
        }
      ]
    }
  },
  {
    name: 'Content Creation',
    description: 'Organize content creation prompts and templates',
    category: 'content',
    isPublic: true,
    structure: {
      'prompts': {
        'writing': {
          'blog-posts': {},
          'social-media': {},
          'email-campaigns': {},
          'creative-writing': {}
        },
        'marketing': {
          'copywriting': {},
          'seo': {},
          'advertising': {}
        }
      },
      'templates': {
        'email': {},
        'social': {},
        'blog': {}
      },
      'agents': {
        'content-editor': {},
        'seo-optimizer': {},
        'social-media-manager': {}
      }
    },
    rules: {
      autoAssignment: [
        {
          type: 'prompt',
          namePattern: 'blog|article|post',
          targetFolder: '/prompts/writing/blog-posts'
        },
        {
          type: 'template',
          namePattern: 'email|newsletter',
          targetFolder: '/templates/email'
        }
      ]
    }
  },
  {
    name: 'AI Research',
    description: 'Structure for AI research and experimentation',
    category: 'research',
    isPublic: true,
    structure: {
      'prompts': {
        'research': {
          'experiments': {},
          'analysis': {},
          'benchmarks': {}
        },
        'models': {
          'fine-tuning': {},
          'evaluation': {},
          'comparison': {}
        }
      },
      'agents': {
        'researcher': {},
        'analyst': {},
        'evaluator': {}
      },
      'rules': {
        'research-protocols': {},
        'evaluation-criteria': {}
      }
    },
    rules: {
      autoAssignment: [
        {
          type: 'prompt',
          namePattern: 'experiment|test|benchmark',
          targetFolder: '/prompts/research/experiments'
        }
      ]
    }
  }
];

export function FolderTemplates({
  templates,
  onApplyTemplate,
  onCreateTemplate,
  onDeleteTemplate,
  autoOrgRules,
  onUpdateAutoOrgRules,
  currentFolderStructure
}: FolderTemplatesProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    isPublic: false,
    structure: {},
    rules: {}
  });
  const [editingRules, setEditingRules] = useState<AutoOrgRule[]>([]);

  useEffect(() => {
    setEditingRules(autoOrgRules);
  }, [autoOrgRules]);

  const allTemplates = [
    ...builtInTemplates.map((t, index) => ({
      ...t,
      id: `builtin-${index}`,
      usageCount: 0,
      createdBy: 'system'
    })),
    ...templates
  ];

  const handleApplyTemplate = async (templateId: string) => {
    try {
      await onApplyTemplate(templateId);
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) return;

    try {
      await onCreateTemplate({
        ...newTemplate,
        structure: currentFolderStructure || {}
      });
      setShowCreateDialog(false);
      setNewTemplate({
        name: '',
        description: '',
        category: '',
        isPublic: false,
        structure: {},
        rules: {}
      });
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleSaveRules = async () => {
    try {
      await onUpdateAutoOrgRules(editingRules);
      setShowRulesDialog(false);
    } catch (error) {
      console.error('Error saving rules:', error);
    }
  };

  const addAutoOrgRule = () => {
    const newRule: AutoOrgRule = {
      id: `rule-${Date.now()}`,
      name: 'New Rule',
      enabled: true,
      conditions: {},
      action: {
        targetFolder: '',
        createIfMissing: true
      }
    };
    setEditingRules([...editingRules, newRule]);
  };

  const updateAutoOrgRule = (id: string, updates: Partial<AutoOrgRule>) => {
    setEditingRules(rules =>
      rules.map(rule => rule.id === id ? { ...rule, ...updates } : rule)
    );
  };

  const deleteAutoOrgRule = (id: string) => {
    setEditingRules(rules => rules.filter(rule => rule.id !== id));
  };

  const categorizedTemplates = allTemplates.reduce((acc, template) => {
    const category = template.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, typeof allTemplates>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Folder Templates</h2>
          <p className="text-muted-foreground">
            Pre-configured folder structures and auto-organization rules
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowRulesDialog(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Auto-Org Rules
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          {Object.keys(categorizedTemplates).map(category => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={() => handleApplyTemplate(template.id)}
                onDelete={template.createdBy !== 'system' ? () => onDeleteTemplate(template.id) : undefined}
              />
            ))}
          </div>
        </TabsContent>

        {Object.entries(categorizedTemplates).map(([category, templates]) => (
          <TabsContent key={category} value={category}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={() => handleApplyTemplate(template.id)}
                  onDelete={template.createdBy !== 'system' ? () => onDeleteTemplate(template.id) : undefined}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Development Workflow"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this template is for..."
              />
            </div>
            <div>
              <Label htmlFor="template-category">Category</Label>
              <Input
                id="template-category"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., development, content, research"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="template-public"
                checked={newTemplate.isPublic}
                onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, isPublic: checked }))}
              />
              <Label htmlFor="template-public">Make template public</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplate.name.trim()}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Organization Rules Dialog */}
      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Auto-Organization Rules</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {editingRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Input
                          value={rule.name}
                          onChange={(e) => updateAutoOrgRule(rule.id, { name: e.target.value })}
                          className="font-medium"
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(checked) => updateAutoOrgRule(rule.id, { enabled: checked })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAutoOrgRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Item Type</Label>
                          <Select
                            value={rule.conditions.type || ''}
                            onValueChange={(value) => updateAutoOrgRule(rule.id, {
                              conditions: { ...rule.conditions, type: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Any type</SelectItem>
                              <SelectItem value="prompt">Prompt</SelectItem>
                              <SelectItem value="agent">Agent</SelectItem>
                              <SelectItem value="rule">Rule</SelectItem>
                              <SelectItem value="template">Template</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Name Pattern</Label>
                          <Input
                            value={rule.conditions.namePattern || ''}
                            onChange={(e) => updateAutoOrgRule(rule.id, {
                              conditions: { ...rule.conditions, namePattern: e.target.value }
                            })}
                            placeholder="e.g., api|backend"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Target Folder</Label>
                        <Input
                          value={rule.action.targetFolder}
                          onChange={(e) => updateAutoOrgRule(rule.id, {
                            action: { ...rule.action, targetFolder: e.target.value }
                          })}
                          placeholder="/prompts/development/backend"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                onClick={addAutoOrgRule}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRulesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRules}>
              Save Rules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({
  template,
  onApply,
  onDelete
}: {
  template: FolderTemplate;
  onApply: () => void;
  onDelete?: () => void;
}) {
  const isBuiltIn = template.createdBy === 'system';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center">
              <Template className="h-5 w-5 mr-2" />
              {template.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {template.description || 'No description provided'}
            </CardDescription>
          </div>
          {!isBuiltIn && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Edit className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {template.category && (
                <Badge variant="secondary">{template.category}</Badge>
              )}
              {isBuiltIn && (
                <Badge variant="outline">Built-in</Badge>
              )}
              {template.isPublic && (
                <Badge variant="outline">Public</Badge>
              )}
            </div>
            <span className="text-muted-foreground">
              {template.usageCount} uses
            </span>
          </div>
          <Button onClick={onApply} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Apply Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}