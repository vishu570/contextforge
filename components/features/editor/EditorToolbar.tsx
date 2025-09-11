'use client';

import { EditorTab } from '@/types/editor';
import { 
  Save, 
  Menu, 
  Play, 
  Download, 
  Search,
  Settings,
  User,
  LogOut,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface EditorToolbarProps {
  activeTab?: EditorTab;
  onSave: () => void;
  onToggleSidebar: () => void;
  sidebarExpanded: boolean;
}

export function EditorToolbar({ 
  activeTab, 
  onSave, 
  onToggleSidebar, 
  sidebarExpanded 
}: EditorToolbarProps) {
  const exportContent = () => {
    if (!activeTab) return;
    
    const blob = new Blob([activeTab.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab.title}${activeTab.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const runPrompt = () => {
    // TODO: Implement prompt execution
    console.log('Running prompt:', activeTab?.title);
  };

  return (
    <div className="h-12 bg-[#161B22] border-b border-gray-700 flex items-center justify-between px-4">
      {/* Left side - Navigation and file actions */}
      <div className="flex items-center space-x-3">
        {/* Sidebar toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="h-8 w-8 p-0"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* ContextForge brand */}
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="text-lg font-bold text-white">
            ContextForge
          </div>
          <Badge variant="secondary" className="text-xs">
            v2.0
          </Badge>
        </Link>

        {/* Main actions */}
        <div className="flex items-center space-x-2 ml-6">
          <Link href="/dashboard/import">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
            >
              <Upload className="h-3 w-3 mr-1" />
              Import
            </Button>
          </Link>
          
          {/* File actions - only show when active tab */}
          {activeTab && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                className="h-8 text-xs"
                disabled={!activeTab.unsaved}
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={runPrompt}
                className="h-8 text-xs"
              >
                <Play className="h-3 w-3 mr-1" />
                Run
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={exportContent}
                className="h-8 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Center - Current file info */}
      {activeTab && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <span>{activeTab.title}</span>
            {activeTab.unsaved && (
              <Badge variant="outline" className="text-xs">
                Modified
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Right side - Search and user menu */}
      <div className="flex items-center space-x-2">
        {/* Search */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/import">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/logout">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}