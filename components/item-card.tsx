'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, Bot, FileCode, Webhook, Edit, Trash2, Copy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface ItemCardProps {
  item: {
    id: string;
    name: string;
    content: string;
    type: 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'other';
    format: string;
    updatedAt: Date;
    tags?: Array<{
      id: string;
      tag: {
        name: string;
      };
    }>;
    source?: {
      type: string;
      repoName?: string | null;
    };
  };
}

const typeIcons = {
  prompt: FileText,
  agent: Bot,
  rule: FileCode,
  template: Webhook,
  snippet: FileCode,
  other: FileText,
};

export function ItemCard({ item }: ItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const Icon = typeIcons[item.type];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      toast({
        title: 'Item deleted',
        description: `"${item.name}" has been deleted successfully.`,
      });

      // Refresh the page to show updated list
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg truncate">{item.name}</CardTitle>
            </div>
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(item.content);
                  toast({
                    title: 'Copied!',
                    description: `${item.type} content copied to clipboard`,
                  });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/dashboard/${item.type}s/${item.id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-3 line-clamp-3">
            {item.content.substring(0, 150)}...
          </CardDescription>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">{item.format}</Badge>
              {item.tags?.map((itemTag) => (
                <Badge key={itemTag.id} variant="secondary" className="text-xs">
                  {itemTag.tag.name}
                </Badge>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(item.updatedAt).toLocaleDateString()}
            </span>
          </div>
          {item.source && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center">
              <span>Source: {item.source.type}</span>
              {item.source.repoName && (
                <span className="ml-1">• {item.source.repoName}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{item.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}