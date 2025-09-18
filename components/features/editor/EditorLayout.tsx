'use client';

import type { EditorActions, EditorLayoutProps, EditorState, EditorTab, FileTreeItem } from '@/editor';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ComprehensiveEditor } from './ComprehensiveEditor';
import { EditorToolbar } from './EditorToolbar';
import { FileTree } from './FileTree';
import { ImportScreen } from './ImportScreen';
import { ResponsiveMobile } from './ResponsiveMobile';
import { TabsManager } from './TabsManager';
import { WelcomeScreen } from './WelcomeScreen';

export function EditorLayout({ initialData }: EditorLayoutProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);

  // Editor state
  const [state, setState] = useState<EditorState>({
    activeTabId: null,
    tabs: [],
    fileTree: [],
    sidebarExpanded: true,
    previewPanelExpanded: false,
  });

  // Import mode state
  const [showImport, setShowImport] = useState(false);

  // Check for import mode from URL params
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'import') {
      setShowImport(true);
    }
  }, [searchParams]);

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data on client side
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/items', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.items) {
            const fileTree = transformItemsToTree(data.items);
            setState(prev => ({ ...prev, fileTree }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch items:', error);
      }
    };

    fetchData();
  }, []);

  // Transform database items to file tree structure
  const transformItemsToTree = (items: any[]): FileTreeItem[] => {
    return items.map(item => {
      let folderPath = '';

      // Extract folder path from metadata if available
      try {
        const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
        if (metadata?.originalPath) {
          // Extract directory path from originalPath (e.g., "categories/01-core-development/api-designer.md" -> "categories/01-core-development")
          const pathParts = metadata.originalPath.split('/');
          if (pathParts.length > 1) {
            folderPath = pathParts.slice(0, -1).join('/');
          }
        }
      } catch (error) {
        console.warn('Failed to parse metadata for item:', item.name, error);
      }

      return {
        id: item.id,
        name: item.name || item.title || 'Untitled',
        type: item.type as any,
        format: item.format || '.txt',
        content: item.content || '',
        updatedAt: new Date(item.updatedAt),
        tags: item.tags || [],
        folderPath: folderPath || item.type, // fallback to type if no folder path
        metadata: item.metadata,
      };
    });
  };

  // Editor actions
  const actions: EditorActions = {
    openTab: useCallback((item: FileTreeItem) => {
      setState(prev => {
        // Check if tab is already open
        const existingTab = prev.tabs.find(tab => tab.id === item.id);
        if (existingTab) {
          return { ...prev, activeTabId: item.id };
        }

        // Create new tab
        const newTab: EditorTab = {
          id: item.id,
          title: item.name,
          type: item.type,
          content: item.content,
          format: item.format,
          tags: item.tags,
          metadata: item.metadata,
          unsaved: false,
          lastModified: item.updatedAt,
        };

        return {
          ...prev,
          tabs: [...prev.tabs, newTab],
          activeTabId: item.id,
        };
      });
    }, []),

    closeTab: useCallback((tabId: string) => {
      setState(prev => {
        const newTabs = prev.tabs.filter(tab => tab.id !== tabId);
        let newActiveTabId = prev.activeTabId;

        // If we're closing the active tab, switch to another tab
        if (prev.activeTabId === tabId) {
          if (newTabs.length > 0) {
            const currentIndex = prev.tabs.findIndex(tab => tab.id === tabId);
            const nextTab = newTabs[currentIndex] || newTabs[currentIndex - 1] || newTabs[0];
            newActiveTabId = nextTab.id;
          } else {
            newActiveTabId = null;
          }
        }

        return {
          ...prev,
          tabs: newTabs,
          activeTabId: newActiveTabId,
        };
      });
    }, []),

    switchTab: useCallback((tabId: string) => {
      setState(prev => ({ ...prev, activeTabId: tabId }));
    }, []),

    updateTab: useCallback((tabId: string, content: string) => {
      setState(prev => ({
        ...prev,
        tabs: prev.tabs.map(tab =>
          tab.id === tabId
            ? { ...tab, content, unsaved: true }
            : tab
        ),
      }));
    }, []),

    saveTab: useCallback(async (tabId: string) => {
      const tab = state.tabs.find(t => t.id === tabId);
      if (!tab) return;

      try {
        const response = await fetch(`/api/items/${tabId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: tab.title,
            content: tab.content,
            format: tab.format,
          }),
        });

        if (response.ok) {
          setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t =>
              t.id === tabId ? { ...t, unsaved: false } : t
            ),
          }));

          toast({
            title: 'Saved',
            description: `${tab.title} saved successfully`,
          });
        } else {
          throw new Error('Failed to save');
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save file',
          variant: 'destructive',
        });
      }
    }, [state.tabs, toast]),

    createFile: useCallback(async (type: string, parentId?: string) => {
      try {
        const name = prompt(`Enter name for new ${type}:`, `New ${type}`);
        if (!name) return;

        const response = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name,
            type,
            content: getDefaultContent(type),
            format: getDefaultFormat(type),
          }),
        });

        if (response.ok) {
          const newItem = await response.json();
          const newFileItem: FileTreeItem = {
            id: newItem.id,
            name: newItem.name,
            type: newItem.type,
            format: newItem.format,
            content: newItem.content,
            updatedAt: new Date(newItem.updatedAt),
            tags: [],
          };

          // Add to file tree and open in editor
          setState(prev => ({
            ...prev,
            fileTree: [...prev.fileTree, newFileItem],
          }));

          // Open the new file in a tab
          actions.openTab(newFileItem);

          toast({
            title: 'Created',
            description: `${name} created successfully`,
          });
        } else {
          throw new Error('Failed to create file');
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to create file',
          variant: 'destructive',
        });
      }
    }, [toast]),

    renameFile: useCallback(async (fileId: string, newName: string) => {
      try {
        const response = await fetch(`/api/items/${fileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: newName }),
        });

        if (response.ok) {
          // Update file tree
          setState(prev => ({
            ...prev,
            fileTree: prev.fileTree.map(file =>
              file.id === fileId ? { ...file, name: newName } : file
            ),
            // Update any open tabs
            tabs: prev.tabs.map(tab =>
              tab.id === fileId ? { ...tab, title: newName } : tab
            ),
          }));

          toast({
            title: 'Renamed',
            description: `File renamed to ${newName}`,
          });
        } else {
          throw new Error('Failed to rename file');
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to rename file',
          variant: 'destructive',
        });
      }
    }, [toast]),

    deleteFile: useCallback(async (fileId: string) => {
      const file = state.fileTree.find(f => f.id === fileId);
      if (!file) return;

      if (!confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
        return;
      }

      try {
        const response = await fetch(`/api/items/${fileId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          // Remove from file tree
          setState(prev => ({
            ...prev,
            fileTree: prev.fileTree.filter(f => f.id !== fileId),
          }));

          // Close any open tabs for this file
          actions.closeTab(fileId);

          toast({
            title: 'Deleted',
            description: `${file.name} deleted successfully`,
          });
        } else {
          throw new Error('Failed to delete file');
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete file',
          variant: 'destructive',
        });
      }
    }, [toast, state.fileTree]),

    toggleSidebar: useCallback(() => {
      setState(prev => ({ ...prev, sidebarExpanded: !prev.sidebarExpanded }));
    }, []),

    togglePreviewPanel: useCallback(() => {
      setState(prev => ({ ...prev, previewPanelExpanded: !prev.previewPanelExpanded }));
    }, []),

    toggleImport: useCallback(() => {
      setShowImport(prev => !prev);
    }, []),
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (state.activeTabId) {
              actions.saveTab(state.activeTabId);
            }
            break;
          case 'w':
            e.preventDefault();
            if (state.activeTabId) {
              actions.closeTab(state.activeTabId);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.activeTabId, actions]);

  // Mobile responsive layout
  if (isMobile) {
    return (
      <ResponsiveMobile
        state={state}
        actions={actions}
      />
    );
  }

  const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);

  return (
    <div className="h-screen flex flex-col bg-[#0F1117]">
      {/* Toolbar */}
      <EditorToolbar
        activeTab={activeTab}
        onSave={() => activeTab && actions.saveTab(activeTab.id)}
        onToggleSidebar={actions.toggleSidebar}
        onToggleImport={actions.toggleImport}
        sidebarExpanded={state.sidebarExpanded}
      />

      {/* Main editor area */}
      <div className="flex-1 flex min-h-0">
        <PanelGroup direction="horizontal">
          {/* Sidebar */}
          {state.sidebarExpanded && (
            <>
              <Panel
                defaultSize={25}
                minSize={15}
                maxSize={40}
                className="bg-[#161B22] border-r border-gray-700"
              >
                <FileTree
                  items={state.fileTree}
                  onFileSelect={actions.openTab}
                  onFileCreate={actions.createFile}
                  onFileRename={actions.renameFile}
                  onFileDelete={actions.deleteFile}
                />
              </Panel>
              <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-gray-600 transition-colors" />
            </>
          )}

          {/* Main content area */}
          <Panel minSize={30}>
            <div className="h-full flex flex-col">
              {/* Tabs */}
              {state.tabs.length > 0 && (
                <TabsManager
                  tabs={state.tabs}
                  activeTabId={state.activeTabId}
                  onTabClick={actions.switchTab}
                  onTabClose={actions.closeTab}
                />
              )}

              {/* Editor content */}
              <div className="flex-1 min-h-0">
                {showImport ? (
                  <ImportScreen />
                ) : activeTab ? (
                  <ComprehensiveEditor
                    key={activeTab.id}
                    tab={activeTab}
                    onChange={(value) => actions.updateTab(activeTab.id, value)}
                    onSave={() => actions.saveTab(activeTab.id)}
                  />
                ) : (
                  <WelcomeScreen
                    fileTree={state.fileTree}
                    onFileSelect={actions.openTab}
                    onCreateFile={actions.createFile}
                    onShowImport={actions.toggleImport}
                  />
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

// Helper function to determine Monaco editor language
function getEditorLanguage(format: string): string {
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.py': 'python',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.json': 'json',
    '.xml': 'xml',
    '.md': 'markdown',
    '.prompt': 'text',
    '.agent': 'json',
    '.rule': 'json',
    '.template': 'markdown',
  };
  return languageMap[format] || 'text';
}

// Helper function to get default content for new files
function getDefaultContent(type: string): string {
  const contentMap: Record<string, string> = {
    prompt: 'You are a helpful AI assistant. Please respond to the following:\n\n{user_input}',
    agent: '{\n  "name": "New Agent",\n  "description": "A helpful AI agent",\n  "instructions": "You are a specialized AI agent.",\n  "tools": []\n}',
    rule: '# New Rule\n\n## Description\nDescribe what this rule does\n\n## Conditions\n- When to apply this rule\n\n## Actions\n- What to do when rule is triggered',
    template: '# {title}\n\n## Overview\n{description}\n\n## Content\n{main_content}\n\n## Conclusion\n{conclusion}',
    snippet: 'Add your code or text snippet here...',
  };
  return contentMap[type] || 'New file content';
}

// Helper function to get default format for new files
function getDefaultFormat(type: string): string {
  const formatMap: Record<string, string> = {
    prompt: '.prompt',
    agent: '.json',
    rule: '.md',
    template: '.md',
    snippet: '.txt',
  };
  return formatMap[type] || '.txt';
}