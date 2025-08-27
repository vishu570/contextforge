'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getModelConfigs, ModelConfig } from '@/lib/models/config';
import { 
  Settings, 
  Zap, 
  DollarSign, 
  Gauge, 
  Brain, 
  Clock,
  Shield,
  Globe,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  Target,
  BarChart3
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface ModelSelection {
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  customEndpoint?: string;
  apiKey?: string;
  systemPrompt?: string;
}

interface CustomModel {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  apiKey: string;
  maxTokens: number;
  costPer1K: number;
  capabilities: string[];
}

interface ModelSelectorProps {
  selectedModel?: ModelSelection;
  onModelSelect: (selection: ModelSelection) => void;
  showAdvancedOptions?: boolean;
  showCostEstimation?: boolean;
  allowCustomModels?: boolean;
  estimatedTokens?: number;
}

export function ModelSelector({
  selectedModel,
  onModelSelect,
  showAdvancedOptions = true,
  showCostEstimation = true,
  allowCustomModels = false,
  estimatedTokens = 0
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [selection, setSelection] = useState<ModelSelection>(
    selectedModel || {
      modelId: '',
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0
    }
  );
  
  const [showCustomModelDialog, setShowCustomModelDialog] = useState(false);
  const [newCustomModel, setNewCustomModel] = useState<Partial<CustomModel>>({});
  const [showPresetDialog, setShowPresetDialog] = useState(false);

  useEffect(() => {
    const systemModels = getModelConfigs();
    setModels(systemModels);
    
    // Load custom models from localStorage
    const savedCustomModels = localStorage.getItem('contextforge-custom-models');
    if (savedCustomModels) {
      setCustomModels(JSON.parse(savedCustomModels));
    }
    
    // Set default model if none selected
    if (!selection.modelId && systemModels.length > 0) {
      const defaultModel = systemModels.find(m => m.isDefault) || systemModels[0];
      const newSelection = { ...selection, modelId: defaultModel.id };
      setSelection(newSelection);
      onModelSelect(newSelection);
    }
  }, []);

  useEffect(() => {
    onModelSelect(selection);
  }, [selection, onModelSelect]);

  const allModels = [...models, ...customModels.map(cm => ({
    ...cm,
    cost: cm.costPer1K,
    provider: cm.provider as 'openai' | 'anthropic' | 'google'
  }))];

  const selectedModelConfig = allModels.find(m => m.id === selection.modelId);

  const calculateCost = () => {
    if (!selectedModelConfig || !estimatedTokens) return 0;
    return (estimatedTokens / 1000) * selectedModelConfig.cost;
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'bg-purple-100 text-purple-800';
      case 'openai': return 'bg-green-100 text-green-800';
      case 'google': return 'bg-blue-100 text-blue-800';
      case 'custom': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'fast': return <Zap className="h-3 w-3" />;
      case 'creative': return <Sparkles className="h-3 w-3" />;
      case 'reasoning': return <Brain className="h-3 w-3" />;
      case 'code': return <Settings className="h-3 w-3" />;
      case 'multimodal': return <Globe className="h-3 w-3" />;
      case 'analysis': return <BarChart3 className="h-3 w-3" />;
      default: return <Target className="h-3 w-3" />;
    }
  };

  const handleCustomModelSave = () => {
    if (!newCustomModel.name || !newCustomModel.endpoint) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    const customModel: CustomModel = {
      id: `custom-${Date.now()}`,
      name: newCustomModel.name!,
      provider: 'custom',
      endpoint: newCustomModel.endpoint!,
      apiKey: newCustomModel.apiKey || '',
      maxTokens: newCustomModel.maxTokens || 4096,
      costPer1K: newCustomModel.costPer1K || 0.002,
      capabilities: newCustomModel.capabilities || []
    };

    const updatedCustomModels = [...customModels, customModel];
    setCustomModels(updatedCustomModels);
    localStorage.setItem('contextforge-custom-models', JSON.stringify(updatedCustomModels));
    
    setShowCustomModelDialog(false);
    setNewCustomModel({});
    
    toast({
      title: 'Success',
      description: 'Custom model added successfully'
    });
  };

  const removeCustomModel = (modelId: string) => {
    const updatedCustomModels = customModels.filter(m => m.id !== modelId);
    setCustomModels(updatedCustomModels);
    localStorage.setItem('contextforge-custom-models', JSON.stringify(updatedCustomModels));
    
    toast({
      title: 'Success',
      description: 'Custom model removed'
    });
  };

  const applyPreset = (presetName: string) => {
    const presets = {
      'creative': {
        temperature: 0.9,
        topP: 1,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      },
      'balanced': {
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0
      },
      'precise': {
        temperature: 0.2,
        topP: 0.8,
        frequencyPenalty: 0,
        presencePenalty: 0
      },
      'analytical': {
        temperature: 0.1,
        topP: 0.9,
        frequencyPenalty: 0.2,
        presencePenalty: 0
      }
    };

    const preset = presets[presetName as keyof typeof presets];
    if (preset) {
      setSelection(prev => ({ ...prev, ...preset }));
      setShowPresetDialog(false);
      
      toast({
        title: 'Preset Applied',
        description: `${presetName} preset has been applied`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Model Selection</span>
              </CardTitle>
              <CardDescription>
                Choose and configure your AI model
              </CardDescription>
            </div>
            
            <div className="flex space-x-2">
              {allowCustomModels && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomModelDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Custom Model
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Main Model Selector */}
          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select
              value={selection.modelId}
              onValueChange={(value) => setSelection(prev => ({ ...prev, modelId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {allModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <span>{model.name}</span>
                        <Badge className={getProviderBadgeColor(model.provider)}>
                          {model.provider}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>${model.cost}/1K</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Model Info */}
          {selectedModelConfig && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Cost</div>
                      <div className="text-muted-foreground">${selectedModelConfig.cost}/1K tokens</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Max Tokens</div>
                      <div className="text-muted-foreground">{selectedModelConfig.maxTokens.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Speed</div>
                      <div className="text-muted-foreground">
                        {selectedModelConfig.capabilities?.includes('fast') ? 'Fast' : 'Standard'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Provider</div>
                      <div className="text-muted-foreground capitalize">{selectedModelConfig.provider}</div>
                    </div>
                  </div>
                </div>
                
                {/* Capabilities */}
                {selectedModelConfig.capabilities && selectedModelConfig.capabilities.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Capabilities</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedModelConfig.capabilities.map((capability) => (
                        <Badge key={capability} variant="secondary" className="text-xs">
                          {getCapabilityIcon(capability)}
                          <span className="ml-1">{capability}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cost Estimation */}
          {showCostEstimation && estimatedTokens > 0 && (
            <Alert>
              <DollarSign className="h-4 w-4" />
              <div className="ml-2">
                <div className="font-medium">Estimated Cost</div>
                <div className="text-sm text-muted-foreground">
                  ~{estimatedTokens.toLocaleString()} tokens × ${calculateCost().toFixed(4)} = ${(calculateCost() * estimatedTokens / 1000).toFixed(4)}
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Advanced Configuration */}
      {showAdvancedOptions && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Advanced Configuration</span>
                </CardTitle>
                <CardDescription>
                  Fine-tune model parameters for optimal results
                </CardDescription>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPresetDialog(true)}
              >
                <Target className="h-4 w-4 mr-1" />
                Presets
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="text-sm text-muted-foreground">{selection.temperature}</span>
              </div>
              <Slider
                value={[selection.temperature || 0.7]}
                onValueChange={(value) => setSelection(prev => ({ ...prev, temperature: value[0] }))}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Lower values = more focused, higher values = more creative
              </div>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={selection.maxTokens}
                onChange={(e) => setSelection(prev => ({ 
                  ...prev, 
                  maxTokens: parseInt(e.target.value) || 1000 
                }))}
                min={1}
                max={selectedModelConfig?.maxTokens || 8192}
              />
              <div className="text-xs text-muted-foreground">
                Maximum number of tokens to generate
              </div>
            </div>

            {/* Top P */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Top P</Label>
                <span className="text-sm text-muted-foreground">{selection.topP}</span>
              </div>
              <Slider
                value={[selection.topP || 1]}
                onValueChange={(value) => setSelection(prev => ({ ...prev, topP: value[0] }))}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Nucleus sampling - consider top P probability mass
              </div>
            </div>

            {/* Frequency Penalty */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Frequency Penalty</Label>
                <span className="text-sm text-muted-foreground">{selection.frequencyPenalty}</span>
              </div>
              <Slider
                value={[selection.frequencyPenalty || 0]}
                onValueChange={(value) => setSelection(prev => ({ ...prev, frequencyPenalty: value[0] }))}
                min={-2}
                max={2}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Reduce repetition of frequent tokens
              </div>
            </div>

            {/* Presence Penalty */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Presence Penalty</Label>
                <span className="text-sm text-muted-foreground">{selection.presencePenalty}</span>
              </div>
              <Slider
                value={[selection.presencePenalty || 0]}
                onValueChange={(value) => setSelection(prev => ({ ...prev, presencePenalty: value[0] }))}
                min={-2}
                max={2}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Reduce repetition of any token
              </div>
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <Label>System Prompt (Optional)</Label>
              <Input
                value={selection.systemPrompt || ''}
                onChange={(e) => setSelection(prev => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="Additional system instructions..."
              />
              <div className="text-xs text-muted-foreground">
                Override default system prompt for this model
              </div>
            </div>

            {/* Custom Endpoint for custom models */}
            {selectedModelConfig?.provider === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Endpoint</Label>
                <Input
                  value={selection.customEndpoint || ''}
                  onChange={(e) => setSelection(prev => ({ ...prev, customEndpoint: e.target.value }))}
                  placeholder="https://api.example.com/v1/chat/completions"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Custom Models Management */}
      {allowCustomModels && customModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Models</CardTitle>
            <CardDescription>Manage your custom model configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customModels.map((model) => (
                <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-sm text-muted-foreground">{model.endpoint}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCustomModel(model.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Model Dialog */}
      <Dialog open={showCustomModelDialog} onOpenChange={setShowCustomModelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Model</DialogTitle>
            <DialogDescription>
              Configure a custom AI model endpoint
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Model Name</Label>
              <Input
                value={newCustomModel.name || ''}
                onChange={(e) => setNewCustomModel(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Custom Model"
              />
            </div>
            
            <div>
              <Label>API Endpoint</Label>
              <Input
                value={newCustomModel.endpoint || ''}
                onChange={(e) => setNewCustomModel(prev => ({ ...prev, endpoint: e.target.value }))}
                placeholder="https://api.example.com/v1/chat/completions"
              />
            </div>
            
            <div>
              <Label>API Key (Optional)</Label>
              <Input
                type="password"
                value={newCustomModel.apiKey || ''}
                onChange={(e) => setNewCustomModel(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Your API key"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={newCustomModel.maxTokens || 4096}
                  onChange={(e) => setNewCustomModel(prev => ({ 
                    ...prev, 
                    maxTokens: parseInt(e.target.value) || 4096 
                  }))}
                />
              </div>
              
              <div>
                <Label>Cost per 1K tokens</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newCustomModel.costPer1K || 0.002}
                  onChange={(e) => setNewCustomModel(prev => ({ 
                    ...prev, 
                    costPer1K: parseFloat(e.target.value) || 0.002 
                  }))}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCustomModelDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCustomModelSave}>
                Add Model
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preset Dialog */}
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parameter Presets</DialogTitle>
            <DialogDescription>
              Choose a preset configuration optimized for different use cases
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: 'creative',
                title: 'Creative',
                description: 'High temperature for creative tasks',
                icon: <Sparkles className="h-5 w-5" />
              },
              {
                name: 'balanced',
                title: 'Balanced',
                description: 'Default balanced settings',
                icon: <Target className="h-5 w-5" />
              },
              {
                name: 'precise',
                title: 'Precise',
                description: 'Low temperature for factual responses',
                icon: <CheckCircle className="h-5 w-5" />
              },
              {
                name: 'analytical',
                title: 'Analytical',
                description: 'Optimized for analysis and reasoning',
                icon: <BarChart3 className="h-5 w-5" />
              }
            ].map((preset) => (
              <Card key={preset.name} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    {preset.icon}
                    <span>{preset.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {preset.description}
                  </p>
                  <Button
                    onClick={() => applyPreset(preset.name)}
                    size="sm"
                    className="w-full"
                  >
                    Apply Preset
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}