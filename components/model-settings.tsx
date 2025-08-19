'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { getModelConfigs, ModelConfig } from '@/lib/models/config';
import { Settings, Zap, DollarSign, Gauge } from 'lucide-react';

interface ModelSettingsProps {
  userId?: string;
}

export function ModelSettings({ userId }: ModelSettingsProps) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [userPreferences, setUserPreferences] = useState({
    defaultModel: '',
    fastModel: '',
    costSensitive: false,
    maxTokenBudget: 50000,
    autoOptimize: true
  });

  useEffect(() => {
    setModels(getModelConfigs());
    // Load user preferences here
    const defaultModel = getModelConfigs().find(m => m.isDefault);
    if (defaultModel) {
      setUserPreferences(prev => ({ ...prev, defaultModel: defaultModel.id }));
    }
  }, []);

  const handleSavePreferences = async () => {
    // Save to database or settings
    console.log('Saving preferences:', userPreferences);
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'bg-purple-100 text-purple-800';
      case 'openai': return 'bg-green-100 text-green-800';
      case 'google': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Model Configuration</h2>
      </div>

      {/* User Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Model Preferences</CardTitle>
          <CardDescription>
            Configure your default AI models and optimization settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default-model">Default Model</Label>
              <Select
                value={userPreferences.defaultModel}
                onValueChange={(value) => 
                  setUserPreferences(prev => ({ ...prev, defaultModel: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center space-x-2">
                        <span>{model.name}</span>
                        <Badge className={getProviderBadgeColor(model.provider)}>
                          {model.provider}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fast-model">Fast/Cheap Model</Label>
              <Select
                value={userPreferences.fastModel}
                onValueChange={(value) => 
                  setUserPreferences(prev => ({ ...prev, fastModel: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fast model" />
                </SelectTrigger>
                <SelectContent>
                  {models.filter(m => m.capabilities?.includes('fast')).map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center space-x-2">
                        <span>{model.name}</span>
                        <Badge className={getProviderBadgeColor(model.provider)}>
                          {model.provider}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token-budget">Maximum Token Budget</Label>
            <Input
              id="token-budget"
              type="number"
              value={userPreferences.maxTokenBudget}
              onChange={(e) => 
                setUserPreferences(prev => ({ 
                  ...prev, 
                  maxTokenBudget: parseInt(e.target.value) || 0 
                }))
              }
              placeholder="50000"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Cost Sensitive Mode</Label>
              <p className="text-sm text-muted-foreground">
                Automatically choose cheaper models when possible
              </p>
            </div>
            <Switch
              checked={userPreferences.costSensitive}
              onCheckedChange={(checked) => 
                setUserPreferences(prev => ({ ...prev, costSensitive: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Optimize</Label>
              <p className="text-sm text-muted-foreground">
                Automatically optimize prompts for token efficiency
              </p>
            </div>
            <Switch
              checked={userPreferences.autoOptimize}
              onCheckedChange={(checked) => 
                setUserPreferences(prev => ({ ...prev, autoOptimize: checked }))
              }
            />
          </div>

          <Button onClick={handleSavePreferences} className="w-full">
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Available Models */}
      <Card>
        <CardHeader>
          <CardTitle>Available Models</CardTitle>
          <CardDescription>
            Current model configurations from environment variables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <Card key={model.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{model.name}</CardTitle>
                    <Badge className={getProviderBadgeColor(model.provider)}>
                      {model.provider}
                    </Badge>
                  </div>
                  {model.isDefault && (
                    <Badge variant="outline" className="text-xs w-fit">
                      Default
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span>Cost</span>
                      </span>
                      <span className="font-mono">${model.cost}/1K</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <Gauge className="h-3 w-3" />
                        <span>Max Tokens</span>
                      </span>
                      <span className="font-mono">{model.maxTokens.toLocaleString()}</span>
                    </div>
                    {model.capabilities && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {model.capabilities.map((capability) => (
                          <Badge key={capability} variant="secondary" className="text-xs">
                            {capability}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Environment Configuration</span>
          </CardTitle>
          <CardDescription>
            Update these environment variables to change model versions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1">
            <div>ANTHROPIC_DEFAULT_MODEL=claude-sonnet-4-20250514</div>
            <div>OPENAI_DEFAULT_MODEL=gpt-5-2025-08-07</div>
            <div>GOOGLE_DEFAULT_MODEL=gemini-2.0-flash</div>
            <div>ANTHROPIC_FAST_MODEL=claude-haiku-4-20250514</div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Restart the application after changing environment variables.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}