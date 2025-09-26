'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, GitBranch, Github, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TrackedRepository {
  sourceId: string;
  owner: string;
  name: string;
  branch: string;
  url: string;
  lastSyncAt: Date | null;
  isUpToDate: boolean;
  behindBy: number;
}

interface SourceTrackingPanelProps {
  onRefreshRepo?: (sourceId: string) => void;
  onDeleteRepo?: (sourceId: string) => void;
}

export function SourceTrackingPanel({ onRefreshRepo, onDeleteRepo }: SourceTrackingPanelProps) {
  const [repositories, setRepositories] = useState<TrackedRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTrackedRepositories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sources/tracked', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRepositories(data.repositories || []);
        if (data.message && data.repositories.length === 0) {
          setError(data.message);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 500 && errorData.message?.includes('decrypt')) {
          setError('GitHub API key needs to be reconfigured in Settings. The stored key cannot be decrypted.');
        } else {
          setError(errorData.message || 'Failed to fetch tracked repositories');
        }
      }
    } catch (err) {
      setError('Error loading repositories');
      console.error('Failed to fetch tracked repositories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackedRepositories();
  }, []);

  const handleRefresh = async (sourceId: string) => {
    if (onRefreshRepo) {
      await onRefreshRepo(sourceId);
      fetchTrackedRepositories(); // Refresh list after sync
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (onDeleteRepo && confirm('Are you sure you want to stop tracking this repository?')) {
      await onDeleteRepo(sourceId);
      fetchTrackedRepositories(); // Refresh list after deletion
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Tracked Repositories
          </CardTitle>
          <CardDescription>Loading your tracked GitHub repositories...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Tracked Repositories
          </CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchTrackedRepositories} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Tracked Repositories
        </CardTitle>
        <CardDescription>
          {repositories.length === 0
            ? 'No repositories are currently being tracked.'
            : `Tracking ${repositories.length} GitHub ${repositories.length === 1 ? 'repository' : 'repositories'}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {repositories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Github className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No tracked repositories</p>
            <p>Import from GitHub to start tracking repositories for automatic updates.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {repositories.map((repo) => (
              <div key={repo.sourceId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {repo.owner}/{repo.name}
                      </span>
                      <Badge variant={repo.isUpToDate ? 'default' : 'secondary'}>
                        {repo.isUpToDate
                          ? 'Up to date'
                          : `${repo.behindBy} commit${repo.behindBy !== 1 ? 's' : ''} behind`
                        }
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {repo.branch}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last sync: {formatLastSync(repo.lastSyncAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefresh(repo.sourceId)}
                      className="h-8"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(repo.sourceId)}
                      className="h-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    View on GitHub →
                  </a>
                  <span>Source ID: {repo.sourceId.slice(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}