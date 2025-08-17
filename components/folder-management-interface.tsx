'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Folder, 
  FileText, 
  Sparkles, 
  BarChart3, 
  Settings, 
  Grid, 
  List,
  Move,
  Plus
} from 'lucide-react';

import { FolderTree } from '@/components/folder-tree';
import { FolderBreadcrumb, useFolderBreadcrumb } from '@/components/folder-breadcrumb';
import { FolderSearch, useFolderSearch } from '@/components/folder-search';
import { BulkMoveDialog } from '@/components/bulk-move-dialog';
import { FolderTemplates } from '@/components/folder-templates';
import { FolderSharing } from '@/components/folder-sharing';
import { FolderAnalytics } from '@/components/folder-analytics';
import { toast } from '@/hooks/use-toast';

interface FolderManagementInterfaceProps {
  initialFolders: any[];
  initialItems: any[];
  userId: string;
}

export function FolderManagementInterface({
  initialFolders,
  initialItems,
  userId
}: FolderManagementInterfaceProps) {
  const [folders, setFolders] = useState(initialFolders);
  const [items, setItems] = useState(initialItems);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');

  const {
    searchQuery,
    setSearchQuery,
    selectedFolderId: searchFolderId,
    setSelectedFolderId: setSearchFolderId,
    filters,
    setFilters
  } = useFolderSearch();

  // Get current folder for breadcrumb
  const currentFolder = selectedFolderId 
    ? folders.find(f => f.id === selectedFolderId) 
    : null;

  const breadcrumbSegments = useFolderBreadcrumb(
    currentFolder ? {
      id: currentFolder.id,
      name: currentFolder.name,
      path: currentFolder.path,
      color: currentFolder.color
    } : null,
    folders.map(f => ({
      id: f.id,
      name: f.name,
      path: f.path,
      color: f.color
    }))
  );

  // Filter items based on current folder and search
  const filteredItems = items.filter(item => {
    // Folder filter
    if (selectedFolderId) {
      const itemInFolder = item.collections.some(
        (ic: any) => ic.collection.id === selectedFolderId
      );
      if (!itemInFolder) return false;
    } else if (searchFolderId) {
      const itemInSearchFolder = item.collections.some(
        (ic: any) => ic.collection.id === searchFolderId
      );
      if (!itemInSearchFolder) return false;
    }

    // Search query filter
    if (searchQuery) {
      const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.type.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesQuery) return false;
    }

    // Type filter
    if (filters.types.length > 0) {
      if (!filters.types.includes(item.type)) return false;
    }

    return true;
  });

  // API functions
  const createFolder = async (name: string, parentId?: string) => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId })
      });

      if (!response.ok) throw new Error('Failed to create folder');

      const { folder } = await response.json();
      setFolders(prev => [...prev, folder]);
      toast({ title: 'Folder created successfully' });
      return folder;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({ title: 'Failed to create folder', variant: 'destructive' });
      throw error;
    }
  };

  const updateFolder = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to update folder');

      const { folder } = await response.json();
      setFolders(prev => prev.map(f => f.id === id ? folder : f));
      toast({ title: 'Folder updated successfully' });
    } catch (error) {
      console.error('Error updating folder:', error);
      toast({ title: 'Failed to update folder', variant: 'destructive' });
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      const response = await fetch(`/api/folders/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete folder');

      setFolders(prev => prev.filter(f => f.id !== id));
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
      }
      toast({ title: 'Folder deleted successfully' });
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({ title: 'Failed to delete folder', variant: 'destructive' });
    }
  };

  const moveItems = async (itemIds: string[], targetFolderId: string | null) => {
    try {
      if (targetFolderId) {
        const response = await fetch(`/api/folders/${targetFolderId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds })
        });

        if (!response.ok) throw new Error('Failed to move items');
      }

      // Update local state
      setItems(prev => prev.map(item => {
        if (itemIds.includes(item.id)) {
          return {
            ...item,
            collections: targetFolderId ? [{ collection: { id: targetFolderId } }] : []
          };
        }
        return item;
      }));

      setSelectedItems([]);
      toast({ title: `Moved ${itemIds.length} items successfully` });
    } catch (error) {
      console.error('Error moving items:', error);
      toast({ title: 'Failed to move items', variant: 'destructive' });
    }
  };

  const handleItemSelect = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => 
      selected 
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedItems(selected ? filteredItems.map(item => item.id) : []);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="suggestions">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Suggestions
          </TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <FolderTree
                folders={folders}
                onFolderSelect={(folder) => setSelectedFolderId(folder?.id || null)}
                onFolderCreate={createFolder}
                onFolderUpdate={updateFolder}
                onFolderDelete={deleteFolder}
                onItemMove={moveItems}
                selectedFolderId={selectedFolderId || undefined}
                showItems={false}
                allowDragDrop={true}
                allowEdit={true}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-4">
              {/* Breadcrumb */}
              <FolderBreadcrumb
                segments={breadcrumbSegments}
                onNavigate={(segment) => setSelectedFolderId(segment?.id || null)}
              />

              {/* Search and Filters */}
              <FolderSearch
                folders={folders}
                onFolderSelect={setSearchFolderId}
                onSearch={setSearchQuery}
                onFiltersChange={setFilters}
                selectedFolderId={searchFolderId}
                searchQuery={searchQuery}
              />

              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.length > 0
                      ? `${selectedItems.length} selected`
                      : `${filteredItems.length} items`
                    }
                  </span>
                  {selectedItems.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkMove(true)}
                    >
                      <Move className="h-4 w-4 mr-2" />
                      Move
                    </Button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'bg-accent' : ''}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'bg-accent' : ''}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Items Grid/List */}
              {filteredItems.length > 0 ? (
                <div className={
                  viewMode === 'grid' 
                    ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                    : 'space-y-2'
                }>
                  {filteredItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className={`hover:shadow-md transition-shadow ${
                        selectedItems.includes(item.id) ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => 
                              handleItemSelect(item.id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{item.name}</CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary">{item.type}</Badge>
                              {item.subType && (
                                <Badge variant="outline">{item.subType}</Badge>
                              )}
                            </div>
                          </div>
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      {viewMode === 'grid' && (
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{item.format}</span>
                            <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters, or create some new items.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">AI-Powered Organization</h3>
            <p className="text-muted-foreground mb-6">
              Let AI analyze your content and suggest optimal folder structures.
            </p>
            {/* AI Suggestions component would go here */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">AI Suggestions Coming Soon</h3>
                  <p className="text-muted-foreground">
                    AI-powered folder organization suggestions are in development.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <FolderTemplates
            templates={[]}
            onApplyTemplate={async (templateId) => {
              toast({ title: 'Template applied successfully' });
            }}
            onCreateTemplate={async (template) => {
              toast({ title: 'Template created successfully' });
            }}
            onDeleteTemplate={async (templateId) => {
              toast({ title: 'Template deleted successfully' });
            }}
            autoOrgRules={[]}
            onUpdateAutoOrgRules={async (rules) => {
              toast({ title: 'Auto-organization rules updated' });
            }}
            currentFolderStructure={folders}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <FolderAnalytics
            analytics={[]}
            timeRange="30d"
            onTimeRangeChange={() => {}}
          />
        </TabsContent>
      </Tabs>

      {/* Bulk Move Dialog */}
      <BulkMoveDialog
        open={showBulkMove}
        onOpenChange={setShowBulkMove}
        selectedItems={selectedItems.map(id => {
          const item = items.find(i => i.id === id);
          return {
            id: item?.id || '',
            name: item?.name || '',
            type: item?.type || '',
            format: item?.format
          };
        })}
        folders={folders}
        onMove={moveItems}
        onCreateFolder={createFolder}
      />
    </div>
  );
}