'use client';

import { useState, useEffect } from 'react';
import { Folder, FolderPlus, Edit3, Trash2, Move, MoreHorizontal, Tag, Grid, List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  parentId?: string;
  itemCount: number;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

interface Tag {
  name: string;
  count: number;
  color: string;
  recentUsage: string;
}

export function CategoryOrganizer({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'folder',
    parentId: ''
  });

  const iconOptions = [
    { value: 'folder', label: 'Folder' },
    { value: 'tag', label: 'Tag' },
    { value: 'star', label: 'Star' },
    { value: 'heart', label: 'Heart' },
    { value: 'bookmark', label: 'Bookmark' },
    { value: 'flag', label: 'Flag' },
    { value: 'archive', label: 'Archive' },
    { value: 'box', label: 'Box' }
  ];

  const colorOptions = [
    '#3b82f6', '#ef4444', '#f59e0b', '#10b981',
    '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/categories?stats=true&format=' + viewMode),
        fetch('/api/tags?limit=20&sort=usage')
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData.tags || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, viewMode]);

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: 'Error',
        description: 'Category name is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Category created successfully'
        });
        setShowCreateDialog(false);
        setNewCategory({ name: '', description: '', color: '#3b82f6', icon: 'folder', parentId: '' });
        await fetchData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to create category',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create category',
        variant: 'destructive'
      });
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory) return;

    try {
      const response = await fetch(`/api/categories?id=${selectedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Category updated successfully'
        });
        setShowEditDialog(false);
        setSelectedCategory(null);
        await fetchData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update category',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      const response = await fetch(`/api/categories?id=${selectedCategory.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Category deleted successfully'
        });
        setShowDeleteDialog(false);
        setSelectedCategory(null);
        await fetchData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete category',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete category',
        variant: 'destructive'
      });
    }
  };

  const renderCategoryTree = (cats: Category[], level = 0) => {
    return cats.map(category => (
      <div key={category.id} className={`ml-${level * 4}`}>
        <Card className="mb-2">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: category.color }}
                >
                  <Folder className="w-3 h-3" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{category.name}</h3>
                  {category.description && (
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {category.itemCount} items
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedCategory(category);
                        setNewCategory({
                          name: category.name,
                          description: category.description || '',
                          color: category.color,
                          icon: category.icon,
                          parentId: category.parentId || ''
                        });
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedCategory(category);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
        {category.children && category.children.length > 0 && renderCategoryTree(category.children, level + 1)}
      </div>
    ));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Organization & Categories
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex gap-6">
            {/* Categories Section */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Categories</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'tree' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('tree')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'flat' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('flat')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => setShowCreateDialog(true)} size="sm">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Category
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 h-[400px]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    Loading categories...
                  </div>
                ) : categories.length > 0 ? (
                  <div>
                    {viewMode === 'tree' ? renderCategoryTree(categories) : (
                      <div className="grid grid-cols-2 gap-3">
                        {categories.map(category => (
                          <Card key={category.id} className="cursor-pointer hover:shadow-md">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded flex items-center justify-center text-white text-xs"
                                    style={{ backgroundColor: category.color }}
                                  >
                                    <Folder className="w-3 h-3" />
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-sm">{category.name}</h3>
                                    <Badge variant="secondary" className="text-xs">
                                      {category.itemCount} items
                                    </Badge>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedCategory(category);
                                        setNewCategory({
                                          name: category.name,
                                          description: category.description || '',
                                          color: category.color,
                                          icon: category.icon,
                                          parentId: category.parentId || ''
                                        });
                                        setShowEditDialog(true);
                                      }}
                                    >
                                      <Edit3 className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Folder className="h-8 w-8 mb-2" />
                    <p>No categories yet</p>
                    <p className="text-xs">Create your first category to organize your items</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            <Separator orientation="vertical" />

            {/* Tags Section */}
            <div className="w-80">
              <h3 className="text-lg font-semibold mb-4">Popular Tags</h3>
              <ScrollArea className="h-[400px]">
                {tags.length > 0 ? (
                  <div className="space-y-2">
                    {tags.map(tag => (
                      <Card key={tag.name} className="cursor-pointer hover:shadow-sm">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="text-sm font-medium">{tag.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {tag.count}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Tag className="h-8 w-8 mb-2" />
                    <p>No tags yet</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Category name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={newCategory.description}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border-2 ${newCategory.color === color ? 'border-gray-900' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Select value={newCategory.icon} onValueChange={(value) => setNewCategory(prev => ({ ...prev, icon: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(icon => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory}>
                Create Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={newCategory.description}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border-2 ${newCategory.color === color ? 'border-gray-900' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="edit-icon">Icon</Label>
                <Select value={newCategory.icon} onValueChange={(value) => setNewCategory(prev => ({ ...prev, icon: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(icon => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditCategory}>
                Update Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? 
              Items in this category will be uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}