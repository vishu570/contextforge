'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileTreeItem } from '@/editor';
import {
  Bot,
  Clock,
  FileCode,
  FileText,
  Star,
  Webhook,
  Zap
} from 'lucide-react';

interface WelcomeScreenProps {
  fileTree: FileTreeItem[];
  onFileSelect: (item: FileTreeItem) => void;
  onCreateFile: (type: string) => void;
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

export function WelcomeScreen({ fileTree, onFileSelect, onCreateFile }: WelcomeScreenProps) {
  // Get recent files (sorted by update time)
  const recentFiles = fileTree
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  // Quick start templates
  const quickStarts = [
    {
      type: 'prompt',
      title: 'Chat Assistant',
      description: 'Create a conversational AI prompt',
      icon: FileText,
      color: 'text-blue-400',
      content: 'You are a helpful AI assistant. Respond to user questions clearly and concisely.\n\nUser: {user_input}\nAssistant:',
    },
    {
      type: 'agent',
      title: 'Code Reviewer',
      description: 'AI agent for code review',
      icon: Bot,
      color: 'text-green-400',
      content: '{\n  "name": "code-reviewer",\n  "description": "Reviews code for best practices and bugs",\n  "tools": ["code_analysis", "documentation"]\n}',
    },
    {
      type: 'rule',
      title: 'Writing Style',
      description: 'Content writing guidelines',
      icon: FileCode,
      color: 'text-purple-400',
      content: '# Writing Style Rules\n\n1. Use clear, concise language\n2. Avoid jargon and technical terms\n3. Write in active voice\n4. Keep sentences under 20 words',
    },
    {
      type: 'template',
      title: 'Blog Post',
      description: 'Blog post template',
      icon: Webhook,
      color: 'text-orange-400',
      content: '# {{title}}\n\n## Introduction\n{{introduction}}\n\n## Main Content\n{{main_content}}\n\n## Conclusion\n{{conclusion}}',
    },
  ];

  return (
    <div className="h-full bg-[#0F1117] overflow-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome to ContextForge
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Your professional AI context management workspace. Create, edit, and organize
            your prompts, agents, and templates in a powerful code editor environment.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Quick Actions */}
          <Card className="bg-[#161B22] border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Zap className="h-5 w-5 text-blue-400" />
                <span>Quick Start</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {quickStarts.map((template) => {
                  const Icon = template.icon;
                  return (
                    <Button
                      key={template.type}
                      variant="ghost"
                      className="justify-start h-auto p-3 text-left"
                      onClick={() => {
                        // Create new file with template content
                        onCreateFile(template.type);
                      }}
                    >
                      <Icon className={`h-4 w-4 mr-3 ${template.color}`} />
                      <div>
                        <div className="font-medium text-white">{template.title}</div>
                        <div className="text-sm text-gray-400">{template.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Files */}
          <Card className="bg-[#161B22] border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Clock className="h-5 w-5 text-green-400" />
                <span>Recent Files</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentFiles.length > 0 ? (
                <div className="space-y-2">
                  {recentFiles.map((file) => {
                    const Icon = typeIcons[file.type];
                    const iconColor = typeColors[file.type];

                    return (
                      <Button
                        key={file.id}
                        variant="ghost"
                        className="justify-start w-full h-auto p-3 text-left"
                        onClick={() => onFileSelect(file)}
                      >
                        <Icon className={`h-4 w-4 mr-3 ${iconColor}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-white truncate">
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(file.updatedAt).toLocaleDateString()} • {file.type}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">No recent files</p>
                  <p className="text-sm text-gray-500">Create your first file to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-[#161B22] border-gray-700">
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto text-blue-400 mb-4" />
              <h3 className="font-semibold text-white mb-2">Professional Editor</h3>
              <p className="text-sm text-gray-400">
                Monaco-powered code editor with syntax highlighting,
                auto-completion, and keyboard shortcuts.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#161B22] border-gray-700">
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 mx-auto text-green-400 mb-4" />
              <h3 className="font-semibold text-white mb-2">Multi-Tab Editing</h3>
              <p className="text-sm text-gray-400">
                Work with multiple files simultaneously, just like
                in your favorite IDE.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#161B22] border-gray-700">
            <CardContent className="p-6 text-center">
              <Zap className="h-12 w-12 mx-auto text-orange-400 mb-4" />
              <h3 className="font-semibold text-white mb-2">Smart Organization</h3>
              <p className="text-sm text-gray-400">
                Organize your AI contexts with folders, tags, and
                powerful search capabilities.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Keyboard Shortcuts */}
        <Card className="bg-[#161B22] border-gray-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Save file</span>
                  <code className="bg-gray-800 px-2 py-1 rounded text-gray-300">Ctrl+S</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Close tab</span>
                  <code className="bg-gray-800 px-2 py-1 rounded text-gray-300">Ctrl+W</code>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Find in file</span>
                  <code className="bg-gray-800 px-2 py-1 rounded text-gray-300">Ctrl+F</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Toggle sidebar</span>
                  <code className="bg-gray-800 px-2 py-1 rounded text-gray-300">Ctrl+B</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}