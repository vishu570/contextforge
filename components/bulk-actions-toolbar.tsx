'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  CheckCircle, 
  XCircle, 
  Trash2,
  RotateCcw,
  CheckCheck,
  X
} from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalPendingCount: number;
  isProcessing: boolean;
  progress: { current: number; total: number };
  onSelectAll: (checked: boolean) => void;
  onClearSelection: () => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onApproveAll: () => void;
  allSelected: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  totalPendingCount,
  isProcessing,
  progress,
  onSelectAll,
  onClearSelection,
  onBulkApprove,
  onBulkReject,
  onApproveAll,
  allSelected
}: BulkActionsToolbarProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  if (selectedCount === 0 && !isProcessing) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              disabled={isProcessing || totalPendingCount === 0}
            />
            <span className="text-sm font-medium">
              Select All Pending ({totalPendingCount})
            </span>
          </div>
          
          {selectedCount > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <Badge variant="secondary" className="font-medium">
                {selectedCount} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center space-x-2">
            <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Selected ({selectedCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve Selected Items</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to approve {selectedCount} selected item{selectedCount > 1 ? 's' : ''}? 
                    This action will add them to your library and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onBulkApprove();
                      setShowApproveDialog(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve {selectedCount} Item{selectedCount > 1 ? 's' : ''}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Selected ({selectedCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject Selected Items</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to reject {selectedCount} selected item{selectedCount > 1 ? 's' : ''}? 
                    This action will remove them from the import and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onBulkReject();
                      setShowRejectDialog(false);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject {selectedCount} Item{selectedCount > 1 ? 's' : ''}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="outline"
              size="sm"
              onClick={onApproveAll}
              disabled={isProcessing || totalPendingCount === 0}
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Approve All Pending ({totalPendingCount})
            </Button>
          </div>
        )}
      </div>

      {isProcessing && progress.total > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Processing items... ({progress.current} of {progress.total})
            </span>
            <span className="font-medium">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <Progress 
            value={(progress.current / progress.total) * 100} 
            className="h-2"
          />
        </div>
      )}
    </div>
  );
}