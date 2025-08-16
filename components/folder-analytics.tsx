'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Eye, Download, Calendar, Activity, Folder, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface FolderAnalytics {
  folderId: string;
  folderName: string;
  folderPath: string;
  metrics: {
    totalItems: number;
    viewCount: number;
    downloadCount: number;
    shareCount: number;
    lastAccessed: string;
    topViewers: Array<{
      userId: string;
      userName: string;
      viewCount: number;
      lastViewed: string;
    }>;
    itemTypeDistribution: Record<string, number>;
    activityTimeline: Array<{
      date: string;
      views: number;
      downloads: number;
      additions: number;
    }>;
  };
  insights: {
    growthRate: number;
    popularityRank: number;
    organizationScore: number;
    recommendations: string[];
  };
}

interface FolderAnalyticsProps {
  analytics: FolderAnalytics[];
  timeRange: '7d' | '30d' | '90d' | '1y';
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | '1y') => void;
  className?: string;
}

export function FolderAnalytics({
  analytics,
  timeRange,
  onTimeRangeChange,
  className
}: FolderAnalyticsProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | 'all'>('all');

  // Calculate aggregate statistics
  const aggregateStats = useMemo(() => {
    const stats = analytics.reduce(
      (acc, folder) => ({
        totalFolders: acc.totalFolders + 1,
        totalItems: acc.totalItems + folder.metrics.totalItems,
        totalViews: acc.totalViews + folder.metrics.viewCount,
        totalDownloads: acc.totalDownloads + folder.metrics.downloadCount,
        totalShares: acc.totalShares + folder.metrics.shareCount,
      }),
      { totalFolders: 0, totalItems: 0, totalViews: 0, totalDownloads: 0, totalShares: 0 }
    );

    const avgItemsPerFolder = stats.totalFolders > 0 ? stats.totalItems / stats.totalFolders : 0;
    const avgViewsPerFolder = stats.totalFolders > 0 ? stats.totalViews / stats.totalFolders : 0;

    return {
      ...stats,
      avgItemsPerFolder: Math.round(avgItemsPerFolder),
      avgViewsPerFolder: Math.round(avgViewsPerFolder),
    };
  }, [analytics]);

  // Find top performing folders
  const topFolders = useMemo(() => {
    return [...analytics]
      .sort((a, b) => b.metrics.viewCount - a.metrics.viewCount)
      .slice(0, 5);
  }, [analytics]);

  // Find least used folders
  const underutilizedFolders = useMemo(() => {
    return [...analytics]
      .sort((a, b) => a.metrics.viewCount - b.metrics.viewCount)
      .slice(0, 5);
  }, [analytics]);

  const selectedFolderData = selectedFolder === 'all' 
    ? null 
    : analytics.find(f => f.folderId === selectedFolder);

  const timeRangeLabels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    '1y': 'Last year'
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Folder Analytics</h2>
          <p className="text-muted-foreground">
            Insights into folder usage and organization
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {analytics.map((folder) => (
                <SelectItem key={folder.folderId} value={folder.folderId}>
                  {folder.folderName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="1y">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Folders</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats.totalFolders}</div>
            <p className="text-xs text-muted-foreground">
              {aggregateStats.avgItemsPerFolder} avg items per folder
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {aggregateStats.avgViewsPerFolder} avg per folder
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats.totalDownloads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {timeRangeLabels[timeRange]}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shares</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats.totalShares}</div>
            <p className="text-xs text-muted-foreground">
              Public and private shares
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          {selectedFolderData && <TabsTrigger value="details">Folder Details</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Performing Folders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Top Performing Folders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topFolders.map((folder, index) => (
                    <div key={folder.folderId} className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{folder.folderName}</p>
                        <p className="text-xs text-muted-foreground truncate">{folder.folderPath}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{folder.metrics.viewCount}</p>
                        <p className="text-xs text-muted-foreground">views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Content Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Content Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    analytics.reduce((acc, folder) => {
                      Object.entries(folder.metrics.itemTypeDistribution).forEach(([type, count]) => {
                        acc[type] = (acc[type] || 0) + count;
                      });
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{type}</span>
                        <span>{count} items</span>
                      </div>
                      <Progress 
                        value={(count / aggregateStats.totalItems) * 100} 
                        className="h-2" 
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end space-x-1">
                {/* Simplified timeline - in a real app you'd use a charting library */}
                {analytics[0]?.metrics.activityTimeline.slice(-14).map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center space-y-1">
                    <div className="space-y-1 w-full">
                      <div 
                        className="bg-primary rounded-t"
                        style={{ height: `${(day.views / 100) * 100}px` }}
                      />
                      <div 
                        className="bg-secondary rounded-t"
                        style={{ height: `${(day.downloads / 20) * 30}px` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(day.date).getDate()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary rounded" />
                  <span className="text-xs">Views</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-secondary rounded" />
                  <span className="text-xs">Downloads</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Organization Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organization Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.slice(0, 5).map((folder) => (
                    <div key={folder.folderId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate">{folder.folderName}</span>
                        <span>{folder.insights.organizationScore}/100</span>
                      </div>
                      <Progress 
                        value={folder.insights.organizationScore} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Underutilized Folders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Underutilized Folders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {underutilizedFolders.map((folder) => (
                    <div key={folder.folderId} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{folder.folderName}</p>
                        <p className="text-xs text-muted-foreground">
                          {folder.metrics.totalItems} items, {folder.metrics.viewCount} views
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Optimize
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            {analytics.slice(0, 3).map((folder) => (
              <Card key={folder.folderId}>
                <CardHeader>
                  <CardTitle className="text-lg">{folder.folderName}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      Rank #{folder.insights.popularityRank}
                    </Badge>
                    <Badge 
                      variant={folder.insights.growthRate > 0 ? "default" : "secondary"}
                    >
                      {folder.insights.growthRate > 0 ? '+' : ''}{folder.insights.growthRate}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Recommendations:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {folder.insights.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {selectedFolderData && (
          <TabsContent value="details" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Folder Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Path:</span>
                      <span className="text-sm font-medium">{selectedFolderData.folderPath}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Items:</span>
                      <span className="text-sm font-medium">{selectedFolderData.metrics.totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last Accessed:</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedFolderData.metrics.lastAccessed).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Organization Score:</span>
                      <span className="text-sm font-medium">
                        {selectedFolderData.insights.organizationScore}/100
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Viewers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedFolderData.metrics.topViewers.map((viewer) => (
                      <div key={viewer.userId} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{viewer.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            Last viewed: {new Date(viewer.lastViewed).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {viewer.viewCount} views
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}