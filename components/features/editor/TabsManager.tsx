'use client';

import { Button } from '@/components/ui/button';
import { EditorTab } from '@/editor';
import { Bot, Circle, FileCode, FileText, Webhook, X } from 'lucide-react';

interface TabsManagerProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
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

export function TabsManager({ tabs, activeTabId, onTabClick, onTabClose }: TabsManagerProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex bg-[#1C2128] border-b border-gray-700 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = typeIcons[tab.type];
        const iconColor = typeColors[tab.type];
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className={`
              flex items-center space-x-2 px-3 py-2 border-r border-gray-700 cursor-pointer
              min-w-0 max-w-xs group relative
              ${isActive
                ? 'bg-[#0F1117] text-gray-100 border-b-2 border-blue-500'
                : 'bg-[#1C2128] text-gray-300 hover:bg-gray-800/50'
              }
            `}
            onClick={() => onTabClick(tab.id)}
          >
            {/* Type Icon */}
            <Icon className={`h-3 w-3 flex-shrink-0 ${iconColor}`} />

            {/* Tab Title */}
            <span className="text-sm truncate min-w-0 flex-1">
              {tab.title}
            </span>

            {/* Unsaved Indicator */}
            {tab.unsaved && (
              <Circle className="h-2 w-2 fill-current text-orange-400" />
            )}

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>

            {/* Active Tab Indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </div>
        );
      })}
    </div>
  );
}