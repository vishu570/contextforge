'use client';

import React, { useState, useMemo } from 'react';
import { Move, Folder, FolderOpen, Search, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  type: string;
  format?: string;
}

interface FolderNode {
  id: string;
  name: string;
  path: string;
  level: number;
  color?: string;
  parentId?: string;
  children?: FolderNode[];
  _count: {
    children: number;
    items: number;
  };
}

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: Item[];
  folders: FolderNode[];
  onMove: (itemIds: string[], targetFolderId: string | null) => Promise<void>;
  onCreateFolder?: (name: string, parentId?: string) => Promise<{ id: string; name: string; path: string }>;
}

export function BulkMoveDialog({
  open,
  onOpenChange,
  selectedItems,
  folders,
  onMove,
  onCreateFolder
}: BulkMoveDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  // Build tree structure
  const buildTree = (folders: FolderNode[]): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

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
  };

  // Filter folders based on search
  const filteredFolders = useMemo(() => {
    if (!searchQuery) return folders;
    return folders.filter(folder =>
      folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      folder.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [folders, searchQuery]);

  const treeData = buildTree(filteredFolders);

  const toggleExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleMove = async () => {
    if (selectedItems.length === 0) return;

    setIsMoving(true);
    try {
      const itemIds = selectedItems.map(item => item.id);
      await onMove(itemIds, selectedFolderId);
      onOpenChange(false);
    } catch (error) {
      console.error('Error moving items:', error);
    } finally {
      setIsMoving(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !onCreateFolder) return;

    try {
      const newFolder = await onCreateFolder(newFolderName.trim(), createParentId || undefined);
      setSelectedFolderId(newFolder.id);
      setNewFolderName('');
      setShowCreateFolder(false);
      setCreateParentId(null);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const renderFolderTree = (folder: FolderNode, depth: number = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center py-2 px-2 rounded cursor-pointer transition-colors group",
            isSelected && "bg-accent text-accent-foreground",
            "hover:bg-muted"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          {/* Expand/Collapse Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 mr-2"
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

          {/* Folder Name and Path */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{folder.name}</div>
            <div className="text-xs text-muted-foreground truncate">{folder.path}</div>
          </div>

          {/* Item Count */}
          <Badge variant="secondary" className="ml-2">
            {folder._count.items}
          </Badge>

          {/* Create Subfolder Button */}
          {onCreateFolder && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 ml-2 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setCreateParentId(folder.id);
                setShowCreateFolder(true);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Render Children */}
        {isExpanded && folder.children && (
          <div>
            {folder.children.map(child => renderFolderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Move className="h-5 w-5 mr-2" />
              Move {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-hidden">
            {/* Selected Items Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Items to Move</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedItems.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex items-center text-sm">
                      <Badge variant="outline" className="mr-2 text-xs">
                        {item.type}
                      </Badge>
                      <span className="truncate">{item.name}</span>
                    </div>
                  ))}
                  {selectedItems.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {selectedItems.length - 10} more items
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Destination Selection */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Destination</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search folders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {onCreateFolder && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCreateParentId(null);
                        setShowCreateFolder(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Folder
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-64">
                  <div className="p-4">
                    {/* Root Option */}
                    <div
                      className={cn(
                        "flex items-center py-2 px-2 rounded cursor-pointer transition-colors mb-2",
                        selectedFolderId === null && "bg-accent text-accent-foreground",
                        "hover:bg-muted"
                      )}
                      onClick={() => setSelectedFolderId(null)}
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      <span className="font-medium">Root (No folder)</span>
                    </div>

                    {/* Folder Tree */}
                    {treeData.length > 0 ? (
                      <div className="space-y-1">
                        {treeData.map(folder => renderFolderTree(folder))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Folder className="mx-auto h-8 w-8 mb-2" />
                        <p className="text-sm">
                          {searchQuery ? 'No folders match your search' : 'No folders available'}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Selected Destination Display */}
            {selectedFolderId && selectedFolder && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center">
                    <span className="text-sm text-muted-foreground mr-2">Moving to:</span>
                    <Folder className="h-4 w-4 mr-2" style={{ color: selectedFolder.color }} />
                    <span className="font-medium">{selectedFolder.path}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={isMoving || selectedItems.length === 0}
              className="min-w-[100px]"
            >
              {isMoving ? 'Moving...' : 'Move Items'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
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
                  setShowCreateFolder(false);
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
            <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}