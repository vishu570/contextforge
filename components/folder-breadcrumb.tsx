'use client';

import React from 'react';
import { ChevronRight, Home, Folder, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface BreadcrumbSegment {
  id: string;
  name: string;
  path: string;
  color?: string;
  icon?: string;
}

interface FolderBreadcrumbProps {
  segments: BreadcrumbSegment[];
  onNavigate: (segment: BreadcrumbSegment | null) => void; // null for root
  maxVisibleSegments?: number;
  showRoot?: boolean;
  rootLabel?: string;
  className?: string;
}

export function FolderBreadcrumb({
  segments,
  onNavigate,
  maxVisibleSegments = 4,
  showRoot = true,
  rootLabel = 'All Items',
  className
}: FolderBreadcrumbProps) {
  const handleNavigate = (segment: BreadcrumbSegment | null) => {
    onNavigate(segment);
  };

  // Calculate which segments to show
  const shouldCollapse = segments.length > maxVisibleSegments;
  const visibleSegments = shouldCollapse 
    ? [
        ...segments.slice(0, 1), // First segment
        ...segments.slice(segments.length - (maxVisibleSegments - 1)) // Last few segments
      ]
    : segments;
  
  const hiddenSegments = shouldCollapse 
    ? segments.slice(1, segments.length - (maxVisibleSegments - 1))
    : [];

  return (
    <nav 
      className={cn("flex items-center space-x-1 text-sm", className)}
      aria-label="Breadcrumb"
    >
      {/* Root/Home */}
      {showRoot && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => handleNavigate(null)}
          >
            <Home className="h-4 w-4 mr-1" />
            {rootLabel}
          </Button>
          {segments.length > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
        </>
      )}

      {/* Breadcrumb Segments */}
      {visibleSegments.map((segment, index) => {
        const isLast = index === visibleSegments.length - 1;
        const isFirst = index === 0;
        
        return (
          <React.Fragment key={segment.id}>
            {/* Collapsed indicator */}
            {shouldCollapse && isFirst && hiddenSegments.length > 0 && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      ...
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {hiddenSegments.map((hiddenSegment) => (
                      <DropdownMenuItem
                        key={hiddenSegment.id}
                        onClick={() => handleNavigate(hiddenSegment)}
                        className="flex items-center"
                      >
                        <Folder 
                          className="h-4 w-4 mr-2" 
                          style={{ color: hiddenSegment.color }}
                        />
                        {hiddenSegment.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </>
            )}

            {/* Segment Button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2 max-w-[200px]",
                isLast 
                  ? "text-foreground font-medium" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => !isLast && handleNavigate(segment)}
              disabled={isLast}
            >
              <div className="flex items-center space-x-1 min-w-0">
                {isLast ? (
                  <FolderOpen 
                    className="h-4 w-4 flex-shrink-0" 
                    style={{ color: segment.color }}
                  />
                ) : (
                  <Folder 
                    className="h-4 w-4 flex-shrink-0" 
                    style={{ color: segment.color }}
                  />
                )}
                <span className="truncate">{segment.name}</span>
              </div>
            </Button>

            {/* Separator */}
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// Hook to build breadcrumb segments from a folder path
export function useFolderBreadcrumb(
  currentFolder: BreadcrumbSegment | null,
  allFolders: BreadcrumbSegment[]
): BreadcrumbSegment[] {
  if (!currentFolder) return [];

  const segments: BreadcrumbSegment[] = [];
  let current: BreadcrumbSegment | null = currentFolder;

  // Build path from current folder to root
  while (current) {
    segments.unshift(current);
    
    // Find parent folder
    const parentPath: string = current.path.split('/').slice(0, -1).join('/') || '/';
    current = allFolders.find(f => f.path === parentPath) || null;
  }

  return segments;
}

// Alternative breadcrumb component for compact spaces
export function CompactFolderBreadcrumb({
  segments,
  onNavigate,
  className
}: Pick<FolderBreadcrumbProps, 'segments' | 'onNavigate' | 'className'>) {
  const currentFolder = segments[segments.length - 1];
  
  if (!currentFolder) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-8 px-2 text-muted-foreground", className)}
        onClick={() => onNavigate(null)}
      >
        <Home className="h-4 w-4 mr-1" />
        All Items
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 px-2 text-foreground font-medium max-w-[200px]", className)}
        >
          <FolderOpen 
            className="h-4 w-4 mr-1 flex-shrink-0" 
            style={{ color: currentFolder.color }}
          />
          <span className="truncate">{currentFolder.name}</span>
          <ChevronRight className="h-4 w-4 ml-1 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onNavigate(null)}>
          <Home className="h-4 w-4 mr-2" />
          All Items
        </DropdownMenuItem>
        {segments.slice(0, -1).map((segment) => (
          <DropdownMenuItem
            key={segment.id}
            onClick={() => onNavigate(segment)}
          >
            <Folder 
              className="h-4 w-4 mr-2" 
              style={{ color: segment.color }}
            />
            {segment.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}