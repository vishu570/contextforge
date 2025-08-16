'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Plus, MoreHorizontal, Edit, Trash2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FolderNode {
  id: string;
  name: string;
  path: string;
  level: number;
  color?: string;
  icon?: string;
  parentId?: string;
  children?: FolderNode[];
  items?: Array<{
    id: string;
    item: {
      id: string;
      name: string;
      type: string;
      format: string;
    };
  }>;
  _count: {
    children: number;
    items: number;
  };
  isExpanded?: boolean;
  isDragOver?: boolean;
}

interface FolderTreeProps {
  folders: FolderNode[];
  onFolderSelect?: (folder: FolderNode) => void;
  onFolderCreate?: (name: string, parentId?: string) => void;
  onFolderUpdate?: (id: string, data: Partial<FolderNode>) => void;
  onFolderDelete?: (id: string) => void;
  onItemMove?: (itemIds: string[], targetFolderId: string) => void;
  selectedFolderId?: string;
  showItems?: boolean;
  allowDragDrop?: boolean;
  allowEdit?: boolean;
}

export function FolderTree({
  folders,
  onFolderSelect,
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete,
  onItemMove,
  selectedFolderId,
  showItems = false,
  allowDragDrop = true,
  allowEdit = true
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ type: 'folder' | 'item'; id: string } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();

  // Build tree structure
  const buildTree = useCallback((folders: FolderNode[]): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    // Create folder map
    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        isExpanded: expandedFolders.has(folder.id)
      });
    });

    // Build hierarchy
    folders.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!;
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  }, [expandedFolders]);

  const treeData = buildTree(folders);

  const toggleExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, type: 'folder' | 'item', id: string) => {
    if (!allowDragDrop) return;
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id }));
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    if (!allowDragDrop || !draggedItem) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!allowDragDrop) return;
    // Only clear if leaving the entire folder area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverFolder(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    if (!allowDragDrop || !draggedItem) return;
    e.preventDefault();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      
      if (dragData.type === 'item' && onItemMove) {
        onItemMove([dragData.id], targetFolderId);
      } else if (dragData.type === 'folder' && onFolderUpdate) {
        // Move folder (change parent)
        if (dragData.id !== targetFolderId) {
          onFolderUpdate(dragData.id, { parentId: targetFolderId });
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
    
    setDraggedItem(null);
    setDragOverFolder(null);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim() && onFolderCreate) {
      onFolderCreate(newFolderName.trim(), createParentId);
      setNewFolderName('');
      setShowCreateDialog(false);
      setCreateParentId(undefined);
    }
  };

  const handleEditFolder = (folder: FolderNode, newName: string) => {
    if (newName.trim() && newName !== folder.name && onFolderUpdate) {
      onFolderUpdate(folder.id, { name: newName.trim() });
    }
    setEditingFolder(null);
  };

  const renderFolder = (folder: FolderNode, depth: number = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const isExpanded = folder.isExpanded || false;
    const hasChildren = folder.children && folder.children.length > 0;
    const isDragOver = dragOverFolder === folder.id;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={cn(
            "flex items-center py-1 px-2 rounded cursor-pointer transition-colors group",
            isSelected && "bg-accent text-accent-foreground",
            isDragOver && "bg-blue-100 dark:bg-blue-900",
            "hover:bg-muted"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onFolderSelect?.(folder)}
          draggable={allowDragDrop}
          onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          {/* Expand/Collapse Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 mr-1"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(folder.id);
            }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )
            ) : (
              <div className="h-3 w-3" />
            )}
          </Button>

          {/* Folder Icon */}
          <div className="mr-2 flex-shrink-0">
            {isExpanded ? (
              <FolderOpen className="h-4 w-4" style={{ color: folder.color }} />
            ) : (
              <Folder className="h-4 w-4" style={{ color: folder.color }} />
            )}
          </div>

          {/* Folder Name */}
          <div className="flex-1 min-w-0">
            {editingFolder === folder.id ? (
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => handleEditFolder(folder, newFolderName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEditFolder(folder, newFolderName);
                  } else if (e.key === 'Escape') {
                    setEditingFolder(null);
                    setNewFolderName('');
                  }
                }}
                className="h-6 text-sm"
                autoFocus
              />
            ) : (
              <span className="text-sm font-medium truncate">{folder.name}</span>
            )}
          </div>

          {/* Item Count Badge */}
          {folder._count.items > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {folder._count.items}
            </Badge>
          )}

          {/* Actions Menu */}
          {allowEdit && (
            <div className="opacity-0 group-hover:opacity-100 ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreateParentId(folder.id);
                      setShowCreateDialog(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Subfolder
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(folder.id);
                      setNewFolderName(folder.name);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onFolderDelete?.(folder.id);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Render Children */}
        {isExpanded && folder.children && (
          <div>
            {folder.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}

        {/* Render Items */}
        {isExpanded && showItems && folder.items && folder.items.length > 0 && (
          <div>
            {folder.items.map(({ item }) => (
              <div
                key={item.id}
                className="flex items-center py-1 px-2 rounded cursor-pointer hover:bg-muted text-muted-foreground group"
                style={{ paddingLeft: `${(depth + 1) * 16 + 32}px` }}
                draggable={allowDragDrop}
                onDragStart={(e) => handleDragStart(e, 'item', item.id)}
              >
                <File className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="text-xs truncate flex-1">{item.name}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {item.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Folders</h3>
        {allowEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tree */}
      <Card className="p-2 max-h-96 overflow-y-auto">
        {treeData.length > 0 ? (
          <div className="space-y-1">
            {treeData.map(folder => renderFolder(folder))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">No folders yet</p>
            {allowEdit && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="mt-2"
              >
                Create your first folder
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                } else if (e.key === 'Escape') {
                  setShowCreateDialog(false);
                }
              }}
            />
            {createParentId && (
              <p className="text-sm text-muted-foreground mt-2">
                Creating in: {folders.find(f => f.id === createParentId)?.path || 'Root'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}