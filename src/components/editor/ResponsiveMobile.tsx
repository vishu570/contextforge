'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, FileText } from 'lucide-react';
import { FileTree } from './FileTree';
import { TabsManager } from './TabsManager';
import { MonacoEditor } from './MonacoEditor';
import { EditorToolbar } from './EditorToolbar';
import { WelcomeScreen } from './WelcomeScreen';
import { EditorState, EditorActions } from '@/src/types/editor';
import { cn } from '@/lib/utils';

interface ResponsiveMobileProps {
  state: EditorState;
  actions: EditorActions;
}

export function ResponsiveMobile({ 
  state, 
  actions
}: ResponsiveMobileProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header */}
      <header className="h-12 border-b border-border bg-card/30 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="h-8 w-8 p-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          {activeTab && (
            <div className="flex items-center space-x-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium truncate max-w-32">
                {activeTab.title}
              </span>
              {activeTab.unsaved && (
                <span className="h-2 w-2 bg-orange-400 rounded-full"></span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeTab && actions.saveTab(activeTab.id)}
            disabled={!activeTab || !activeTab.unsaved}
            className="h-8 text-xs px-2"
          >
            Save
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between h-12 px-4 border-b border-border">
              <h2 className="font-semibold text-sm">Files</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* File Tree */}
            <div className="flex-1 overflow-y-auto">
              <FileTree 
                items={state.fileTree}
                onFileSelect={(file) => {
                  actions.openTab(file);
                  setSidebarOpen(false);
                }}
                onFileCreate={actions.createFile}
                onFileRename={actions.renameFile}
                onFileDelete={actions.deleteFile}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tabs - Show only in landscape or when there are tabs */}
      {(orientation === 'landscape' || state.tabs.length > 0) && (
        <div className="border-b border-border bg-card/30">
          <TabsManager
            tabs={state.tabs}
            activeTabId={activeTab?.id || null}
            onTabClick={actions.switchTab}
            onTabClose={actions.closeTab}
          />
        </div>
      )}

      {/* Main Editor Area */}
      <main className="flex-1 overflow-hidden">
        {activeTab ? (
          <div className="h-full relative">
            {/* Mobile-specific toolbar for landscape */}
            {orientation === 'landscape' && (
              <div className="absolute top-2 right-2 z-10 flex space-x-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => actions.saveTab(activeTab.id)}
                  disabled={!activeTab.unsaved}
                  className="h-7 text-xs px-2"
                >
                  Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => actions.closeTab(activeTab.id)}
                  className="h-7 text-xs px-2"
                >
                  Close
                </Button>
              </div>
            )}
            
            <MonacoEditor
              value={activeTab.content}
              language={getLanguageFromType(activeTab.type)}
              onChange={(value) => actions.updateTab(activeTab.id, value || '')}
              theme="vs-dark-contextforge"
            />
          </div>
        ) : (
          <WelcomeScreen
            fileTree={state.fileTree}
            onFileSelect={actions.openTab}
            onCreateFile={actions.createFile}
          />
        )}
      </main>

      {/* Mobile Bottom Bar - Portrait Mode */}
      {orientation === 'portrait' && activeTab && (
        <div className="h-12 border-t border-border bg-card/30 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-xs text-muted-foreground">
              Lines: {activeTab.content.split('\n').length}
            </span>
            <span className="text-xs text-muted-foreground">
              {activeTab.type}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.closeTab(activeTab.id)}
              className="h-8 text-xs px-2"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function getLanguageFromType(type: string): string {
  const languageMap: Record<string, string> = {
    prompt: 'markdown',
    agent: 'json',
    rule: 'yaml',
    template: 'markdown',
    snippet: 'plaintext',
    other: 'plaintext',
  };
  
  return languageMap[type] || 'plaintext';
}