'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Icons
import { 
  Workflow, 
  Settings, 
  Target, 
  Zap,
  TestTube,
  Play,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  ArrowRight,
  ArrowDown,
  Eye,
  Save,
  RefreshCw,
  GitBranch,
  Filter,
  Bell,
  MoreVertical,
  Trash2,
  Edit3,
  Copy
} from 'lucide-react';

// Types
import { 
  Rule,
  RuleCondition,
  RuleAction,
  RuleConflict,
  ExecutionPlan,
  Item
} from '@/src/types/improved-architecture';

// Monaco Editor
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="h-96 bg-muted rounded-md animate-pulse" />
});

// Schema for form validation
const ruleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  conditions: z.array(z.object({
    id: z.string(),
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'greater', 'less', 'regex', 'custom', 'exists', 'in']),
    value: z.any(),
    negate: z.boolean().optional()
  })),
  actions: z.array(z.object({
    id: z.string(),
    type: z.enum(['set', 'append', 'remove', 'trigger', 'notify', 'transform']),
    target: z.string(),
    value: z.any().optional()
  })),
  priority: z.number().min(1).max(100),
  active: z.boolean(),
  executionMode: z.enum(['immediate', 'deferred', 'scheduled'])
});

type RuleFormData = z.infer<typeof ruleSchema>;

interface RuleEditorProps {
  item: Item;
  existingRules: Rule[];
  onSave: (data: RuleFormData) => Promise<void>;
  onTest: (rule: Rule) => Promise<any>;
  readonly?: boolean;
}

// Predefined field options for conditions
const FIELD_OPTIONS = [
  { value: 'item.type', label: 'Item Type' },
  { value: 'item.name', label: 'Item Name' },
  { value: 'item.content', label: 'Item Content' },
  { value: 'item.tags', label: 'Item Tags' },
  { value: 'item.author', label: 'Item Author' },
  { value: 'item.language', label: 'Item Language' },
  { value: 'item.createdAt', label: 'Created Date' },
  { value: 'item.updatedAt', label: 'Updated Date' },
  { value: 'user.email', label: 'User Email' },
  { value: 'user.role', label: 'User Role' },
  { value: 'system.time', label: 'Current Time' },
  { value: 'system.dayOfWeek', label: 'Day of Week' }
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals', description: 'Exact match' },
  { value: 'contains', label: 'Contains', description: 'Substring match' },
  { value: 'greater', label: 'Greater Than', description: 'Numeric comparison' },
  { value: 'less', label: 'Less Than', description: 'Numeric comparison' },
  { value: 'regex', label: 'Regex', description: 'Pattern matching' },
  { value: 'exists', label: 'Exists', description: 'Field has any value' },
  { value: 'in', label: 'In List', description: 'Value in array' }
];

const ACTION_TYPES = [
  { value: 'set', label: 'Set Value', description: 'Set a field to a specific value' },
  { value: 'append', label: 'Append', description: 'Add to existing value' },
  { value: 'remove', label: 'Remove', description: 'Remove field or value' },
  { value: 'trigger', label: 'Trigger Event', description: 'Execute system action' },
  { value: 'notify', label: 'Send Notification', description: 'Alert users' },
  { value: 'transform', label: 'Transform', description: 'Apply transformation' }
];

const PRIORITY_PRESETS = {
  critical: 90,
  high: 75,
  medium: 50,
  low: 25
};

export function RuleEditor({ item, existingRules, onSave, onTest, readonly = false }: RuleEditorProps) {
  // Form state
  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: item.name,
      description: item.metadata?.description || '',
      conditions: [],
      actions: [],
      priority: 50,
      active: true,
      executionMode: 'immediate'
    }
  });

  // Editor state
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [actions, setActions] = useState<RuleAction[]>([]);
  const [conflicts, setConflicts] = useState<RuleConflict[]>([]);
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingRule, setIsTestingRule] = useState(false);
  const [ruleScore, setRuleScore] = useState(50);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const { watch, setValue } = form;
  const watchedConditions = watch('conditions');
  const watchedActions = watch('actions');
  const watchedPriority = watch('priority');

  // Calculate rule score based on complexity and completeness
  useEffect(() => {
    const conditionScore = Math.min(conditions.length * 20, 60);
    const actionScore = Math.min(actions.length * 25, 40);
    const conflictPenalty = conflicts.reduce((penalty, conflict) => {
      return penalty + (conflict.severity === 'critical' ? 30 : 
                      conflict.severity === 'high' ? 20 : 
                      conflict.severity === 'medium' ? 10 : 5);
    }, 0);
    
    const score = Math.max(conditionScore + actionScore - conflictPenalty, 0);
    setRuleScore(Math.min(score, 100));
  }, [conditions.length, actions.length, conflicts]);

  // Check for rule conflicts when conditions or actions change
  useEffect(() => {
    const checkConflicts = () => {
      const detectedConflicts: RuleConflict[] = [];
      
      // Check priority conflicts
      existingRules.forEach(existingRule => {
        if (Math.abs(existingRule.priority - watchedPriority) < 5) {
          detectedConflicts.push({
            type: 'priority',
            rules: [existingRule.id, 'current'],
            description: `Similar priority to "${existingRule.name}" (${existingRule.priority})`,
            severity: 'medium'
          });
        }
      });
      
      // Check for circular dependencies
      const hasCircularActions = actions.some(action => 
        action.type === 'trigger' && 
        existingRules.some(rule => 
          rule.actions.some(existingAction => 
            existingAction.target === action.target
          )
        )
      );
      
      if (hasCircularActions) {
        detectedConflicts.push({
          type: 'circular',
          rules: ['current'],
          description: 'Potential circular trigger dependency detected',
          severity: 'high'
        });
      }
      
      setConflicts(detectedConflicts);
    };
    
    const timer = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timer);
  }, [watchedPriority, actions, existingRules]);

  // Add new condition
  const addCondition = () => {
    const newCondition: RuleCondition = {
      id: `condition_${Date.now()}`,
      field: 'item.type',
      operator: 'equals',
      value: '',
      negate: false
    };
    
    const updatedConditions = [...conditions, newCondition];
    setConditions(updatedConditions);
    setValue('conditions', updatedConditions);
  };

  // Remove condition
  const removeCondition = (conditionId: string) => {
    const updatedConditions = conditions.filter(c => c.id !== conditionId);
    setConditions(updatedConditions);
    setValue('conditions', updatedConditions);
  };

  // Update condition
  const updateCondition = (conditionId: string, updates: Partial<RuleCondition>) => {
    const updatedConditions = conditions.map(c => 
      c.id === conditionId ? { ...c, ...updates } : c
    );
    setConditions(updatedConditions);
    setValue('conditions', updatedConditions);
  };

  // Add new action
  const addAction = () => {
    const newAction: RuleAction = {
      id: `action_${Date.now()}`,
      type: 'set',
      target: '',
      value: ''
    };
    
    const updatedActions = [...actions, newAction];
    setActions(updatedActions);
    setValue('actions', updatedActions);
  };

  // Remove action
  const removeAction = (actionId: string) => {
    const updatedActions = actions.filter(a => a.id !== actionId);
    setActions(updatedActions);
    setValue('actions', updatedActions);
  };

  // Update action
  const updateAction = (actionId: string, updates: Partial<RuleAction>) => {
    const updatedActions = actions.map(a => 
      a.id === actionId ? { ...a, ...updates } : a
    );
    setActions(updatedActions);
    setValue('actions', updatedActions);
  };

  // Test rule execution
  const handleTestRule = async () => {
    setIsTestingRule(true);
    try {
      const rule: Rule = {
        id: 'test_rule',
        name: form.getValues('name'),
        description: form.getValues('description'),
        conditions,
        actions,
        priority: watchedPriority,
        active: true,
        executionMode: form.getValues('executionMode')
      };
      
      const result = await onTest(rule);
      setTestResults(result);
    } catch (error) {
      console.error('Rule testing failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setIsTestingRule(false);
    }
  };

  // Apply priority preset
  const applyPriorityPreset = (preset: string) => {
    const priority = PRIORITY_PRESETS[preset as keyof typeof PRIORITY_PRESETS];
    if (priority !== undefined) {
      setValue('priority', priority);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rule Score Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Workflow className="h-5 w-5" />
                <span>Rule Configuration</span>
              </CardTitle>
              <CardDescription>
                Define conditions and actions for automated rule processing
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{ruleScore}%</div>
              <Progress value={ruleScore} className="w-24" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {conflicts.length} potential conflict(s) detected. 
            <Button variant="link" className="p-0 h-auto ml-2" onClick={() => setShowConflictDialog(true)}>
              Review conflicts
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <Tabs defaultValue="conditions" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="conditions">Conditions ({conditions.length})</TabsTrigger>
            <TabsTrigger value="actions">Actions ({actions.length})</TabsTrigger>
            <TabsTrigger value="execution">Execution</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          {/* Conditions Tab */}
          <TabsContent value="conditions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Rule name and description</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Rule Name</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="Enter rule name"
                      disabled={readonly}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...form.register('description')}
                      placeholder="Describe what this rule does"
                      rows={3}
                      disabled={readonly}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Priority</Label>
                      <Select onValueChange={applyPriorityPreset}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Preset" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Slider
                        value={[watchedPriority]}
                        onValueChange={([value]) => setValue('priority', value)}
                        max={100}
                        min={1}
                        step={1}
                        className="w-full"
                        disabled={readonly}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Low (1)</span>
                        <span>Priority: {watchedPriority}</span>
                        <span>Critical (100)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rule Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Rule Status</CardTitle>
                  <CardDescription>Activation and execution settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="active"
                      checked={watch('active')}
                      onCheckedChange={(checked) => setValue('active', !!checked)}
                      disabled={readonly}
                    />
                    <Label htmlFor="active">Rule Active</Label>
                  </div>

                  <div>
                    <Label>Execution Mode</Label>
                    <Select 
                      value={watch('executionMode')} 
                      onValueChange={(value) => setValue('executionMode', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="deferred">Deferred</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Rule Health</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>✓ Valid conditions: {conditions.length}</div>
                      <div>✓ Valid actions: {actions.length}</div>
                      <div className={conflicts.length > 0 ? 'text-orange-600' : ''}>
                        {conflicts.length === 0 ? '✓' : '⚠'} Conflicts: {conflicts.length}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Condition Builder */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Rule Conditions</CardTitle>
                    <CardDescription>
                      Define when this rule should be triggered
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={addCondition} variant="outline" disabled={readonly}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Condition
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {conditions.length === 0 ? (
                  <div className="text-center py-8">
                    <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No conditions defined. Add conditions to specify when this rule triggers.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conditions.map((condition, index) => (
                      <Card key={condition.id} className="border-2">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                              <Label>Field</Label>
                              <Select 
                                value={condition.field}
                                onValueChange={(value) => updateCondition(condition.id, { field: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Operator</Label>
                              <Select 
                                value={condition.operator}
                                onValueChange={(value) => updateCondition(condition.id, { operator: value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {OPERATOR_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Value</Label>
                              <Input
                                value={condition.value}
                                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                                placeholder="Enter value"
                                disabled={readonly}
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={condition.negate}
                                  onCheckedChange={(checked) => updateCondition(condition.id, { negate: !!checked })}
                                  disabled={readonly}
                                />
                                <Label className="text-sm">NOT</Label>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCondition(condition.id)}
                                disabled={readonly}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {index < conditions.length - 1 && (
                            <div className="flex items-center justify-center mt-4">
                              <Badge variant="secondary">AND</Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Rule Actions</CardTitle>
                    <CardDescription>
                      Define what happens when conditions are met
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={addAction} variant="outline" disabled={readonly}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Action
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {actions.length === 0 ? (
                  <div className="text-center py-8">
                    <Zap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No actions defined. Add actions to specify what happens when conditions are met.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {actions.map((action, index) => (
                      <Card key={action.id} className="border-2">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                              <Label>Action Type</Label>
                              <Select 
                                value={action.type}
                                onValueChange={(value) => updateAction(action.id, { type: value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACTION_TYPES.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Target</Label>
                              <Input
                                value={action.target}
                                onChange={(e) => updateAction(action.id, { target: e.target.value })}
                                placeholder="Target field or system"
                                disabled={readonly}
                              />
                            </div>

                            <div>
                              <Label>Value</Label>
                              <Input
                                value={action.value || ''}
                                onChange={(e) => updateAction(action.id, { value: e.target.value })}
                                placeholder="Action value"
                                disabled={readonly}
                              />
                            </div>

                            <div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAction(action.id)}
                                disabled={readonly}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="mt-3 text-sm text-muted-foreground">
                            {ACTION_TYPES.find(t => t.value === action.type)?.description}
                          </div>
                          
                          {index < actions.length - 1 && (
                            <div className="flex items-center justify-center mt-4">
                              <ArrowDown className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Execution Tab */}
          <TabsContent value="execution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution Plan</CardTitle>
                <CardDescription>Preview how this rule will execute</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Execution Flow</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">
                          1
                        </div>
                        <span className="text-sm">Evaluate {conditions.length} condition(s)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-semibold text-green-600">
                          2
                        </div>
                        <span className="text-sm">Execute {actions.length} action(s) if conditions match</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-semibold text-purple-600">
                          3
                        </div>
                        <span className="text-sm">Log execution results</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="font-semibold text-muted-foreground">Priority</div>
                      <div className="text-lg">{watchedPriority}/100</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="font-semibold text-muted-foreground">Complexity</div>
                      <div className="text-lg">
                        {conditions.length + actions.length < 5 ? 'Low' : 
                         conditions.length + actions.length < 10 ? 'Medium' : 'High'}
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="font-semibold text-muted-foreground">Estimated Runtime</div>
                      <div className="text-lg">&lt;100ms</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conflicts Tab */}
          <TabsContent value="conflicts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conflict Detection</CardTitle>
                <CardDescription>Identify and resolve rule conflicts</CardDescription>
              </CardHeader>
              <CardContent>
                {conflicts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Conflicts Detected</h3>
                    <p className="text-muted-foreground">
                      This rule doesn't conflict with existing rules.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conflicts.map((conflict, index) => (
                      <Alert key={index} className={
                        conflict.severity === 'critical' ? 'border-red-500' :
                        conflict.severity === 'high' ? 'border-orange-500' :
                        conflict.severity === 'medium' ? 'border-yellow-500' :
                        'border-blue-500'
                      }>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold capitalize">{conflict.type} Conflict</span>
                              <Badge variant={
                                conflict.severity === 'critical' ? 'destructive' :
                                conflict.severity === 'high' ? 'destructive' :
                                'secondary'
                              }>
                                {conflict.severity}
                              </Badge>
                            </div>
                            <p>{conflict.description}</p>
                            {conflict.suggestedResolution && (
                              <p className="text-sm text-muted-foreground">
                                Suggestion: {conflict.suggestedResolution}
                              </p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Rule Testing</CardTitle>
                <CardDescription>Test your rule with sample data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Test Rule Execution</h4>
                    <p className="text-sm text-muted-foreground">
                      Simulate rule execution with sample data
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleTestRule}
                    disabled={isTestingRule || readonly || conditions.length === 0}
                  >
                    {isTestingRule ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Run Test
                      </>
                    )}
                  </Button>
                </div>
                
                {testResults && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Test Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {testResults.error ? (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{testResults.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Conditions Met:</span>
                              <div className="font-semibold">{testResults.conditionsMet ? 'Yes' : 'No'}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actions Executed:</span>
                              <div className="font-semibold">{testResults.actionsExecuted || 0}</div>
                            </div>
                          </div>
                          
                          {testResults.executionLog && (
                            <div>
                              <Label className="text-sm font-semibold">Execution Log:</Label>
                              <div className="bg-muted p-3 rounded text-sm mt-1 font-mono">
                                <pre>{JSON.stringify(testResults.executionLog, null, 2)}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Actions */}
        <div className="flex justify-end space-x-3 border-t pt-6">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="button" variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button type="submit" disabled={readonly || conditions.length === 0 || actions.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            Save Rule
          </Button>
        </div>
      </form>
    </div>
  );
}