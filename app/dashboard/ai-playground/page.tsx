'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Code2, 
  TestTube, 
  Settings, 
  BarChart3,
  Sparkles,
  Rocket,
  Target,
  Zap,
  Users,
  BookOpen,
  Star
} from 'lucide-react';

// Import our new components
import { ModelSelector } from '@/components/features/llm/model-selector';
import { FunctionAttachmentSystem } from '@/components/features/functions/function-attachment-system';
import { PromptTestingPlayground } from '@/components/features/playground/prompt-testing-playground';
import { EnhancedPromptEditorComplete } from '@/components/features/prompt-editor/enhanced-prompt-editor-complete';

export default function AIPlaygroundPage() {
  const [activeTab, setActiveTab] = useState('editor');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [attachedFunctions, setAttachedFunctions] = useState<string[]>([]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Playground</h1>
          <Sparkles className="h-6 w-6 text-amber-500" />
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          The ultimate environment for prompt engineering, model testing, and AI experimentation.
          Build, test, and optimize your AI workflows with cutting-edge tools.
        </p>
        
        {/* Feature badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-blue-100">
            <Code2 className="h-3 w-3 mr-1" />
            Advanced Editor
          </Badge>
          <Badge variant="outline" className="bg-gradient-to-r from-green-50 to-green-100">
            <TestTube className="h-3 w-3 mr-1" />
            Multi-Model Testing
          </Badge>
          <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-purple-100">
            <Settings className="h-3 w-3 mr-1" />
            Function Integration
          </Badge>
          <Badge variant="outline" className="bg-gradient-to-r from-orange-50 to-orange-100">
            <BarChart3 className="h-3 w-3 mr-1" />
            Performance Analytics
          </Badge>
          <Badge variant="outline" className="bg-gradient-to-r from-pink-50 to-pink-100">
            <Users className="h-3 w-3 mr-1" />
            Real-time Collaboration
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">15+</div>
            <div className="text-sm text-muted-foreground">AI Models</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">200+</div>
            <div className="text-sm text-muted-foreground">Built-in Functions</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">∞</div>
            <div className="text-sm text-muted-foreground">Custom Endpoints</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">24/7</div>
            <div className="text-sm text-muted-foreground">Availability</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Playground */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Rocket className="h-5 w-5" />
                <span>AI Playground</span>
              </CardTitle>
              <CardDescription>
                Comprehensive AI development and testing environment
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-white/50">
                <Zap className="h-3 w-3 mr-1" />
                Enhanced
              </Badge>
              <Badge variant="outline" className="bg-white/50">
                <Star className="h-3 w-3 mr-1" />
                Professional
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="editor" className="flex items-center space-x-2">
                <Code2 className="h-4 w-4" />
                <span>Advanced Editor</span>
              </TabsTrigger>
              
              <TabsTrigger value="playground" className="flex items-center space-x-2">
                <TestTube className="h-4 w-4" />
                <span>Testing Playground</span>
              </TabsTrigger>
              
              <TabsTrigger value="functions" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Functions</span>
              </TabsTrigger>
              
              <TabsTrigger value="models" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>Models</span>
              </TabsTrigger>
            </TabsList>

            {/* Advanced Prompt Editor */}
            <TabsContent value="editor" className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Code2 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Advanced Prompt Editor</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Professional prompt development with versioning, collaboration, A/B testing, and AI-powered optimization.
                </p>
              </div>
              
              <EnhancedPromptEditorComplete
                onSave={async (data) => {
                  console.log('Saving prompt:', data);
                  // Handle save
                }}
                collaborative={true}
                showTesting={true}
                showAnalytics={true}
              />
            </TabsContent>

            {/* Testing Playground */}
            <TabsContent value="playground" className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TestTube className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Multi-Model Testing Playground</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Test your prompts across multiple AI models simultaneously, compare results, and analyze performance metrics.
                </p>
              </div>
              
              <PromptTestingPlayground
                onSave={async (testRun) => {
                  console.log('Saving test run:', testRun);
                  // Handle save
                }}
              />
            </TabsContent>

            {/* Function Attachment System */}
            <TabsContent value="functions" className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Settings className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">Function Attachment System</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Extend your AI capabilities with custom functions, API integrations, and external tools.
                </p>
              </div>
              
              <FunctionAttachmentSystem
                attachedFunctions={attachedFunctions}
                onFunctionsChange={setAttachedFunctions}
                allowCustomFunctions={true}
                showTesting={true}
              />
            </TabsContent>

            {/* Model Selection */}
            <TabsContent value="models" className="space-y-6">
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">Advanced Model Configuration</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure AI models with precision, manage custom endpoints, and optimize for cost and performance.
                </p>
              </div>
              
              <ModelSelector
                onModelSelect={(selection) => {
                  console.log('Model selected:', selection);
                  // Handle model selection
                }}
                showAdvancedOptions={true}
                showCostEstimation={true}
                allowCustomModels={true}
                estimatedTokens={1000}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Feature Showcase */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="group hover:shadow-lg transition-all duration-300 border-blue-200 hover:border-blue-300">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Precision Engineering</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Fine-tune every parameter with advanced model configuration, temperature control, and token optimization.
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-green-200 hover:border-green-300">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-lg">Performance Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Real-time metrics, cost analysis, and performance benchmarks to optimize your AI workflows.
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-purple-200 hover:border-purple-300">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Team Collaboration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Real-time collaborative editing, version control, and team management for prompt development.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="bg-gradient-to-r from-gray-50 to-blue-50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Getting Started</span>
          </CardTitle>
          <CardDescription>
            New to the AI Playground? Follow these steps to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto font-semibold">
                1
              </div>
              <h4 className="font-medium">Choose Your Models</h4>
              <p className="text-sm text-muted-foreground">
                Select from 15+ AI models or add custom endpoints
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto font-semibold">
                2
              </div>
              <h4 className="font-medium">Create Your Prompt</h4>
              <p className="text-sm text-muted-foreground">
                Use the advanced editor with variables and functions
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto font-semibold">
                3
              </div>
              <h4 className="font-medium">Test & Optimize</h4>
              <p className="text-sm text-muted-foreground">
                Compare results and optimize for performance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}