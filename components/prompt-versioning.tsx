'use client';

import React, { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitBranch,
  GitCommit,
  GitMerge,
  History,
  Tag,
  ArrowRight,
  ArrowLeft,
  Eye,
  Copy,
  Trash2,
  Plus,
  Check,
  X,
  Clock,
  User,
  MessageSquare,
  Star,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  FileText,
  Code2,
  Download,
  Upload,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Diff,
  AlignLeft,
  AlignRight,
  MoreVertical,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const versionSchema = z.object({
  name: z.string().min(1, 'Version name is required'),
  description: z.string().optional(),
  changeReason: z.string().min(1, 'Change reason is required'),
  tags: z.array(z.string()),
  isStable: z.boolean(),
});

type VersionFormData = z.infer<typeof versionSchema>;

export interface PromptVersion {
  id: string;
  versionNumber: string;
  name: string;
  description?: string;
  content: string;
  changeReason: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  parentVersionId?: string;
  branchName: string;
  tags: string[];
  isStable: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  metrics?: {
    tokenCount: number;
    estimatedCost: number;
    performanceScore?: number;
    testResults?: Array<{
      model: string;
      score: number;
      latency: number;
    }>;
  };
  changes?: {
    added: number;
    removed: number;
    modified: number;
  };
}

export interface PromptBranch {
  id: string;
  name: string;
  description?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  baseBranchId?: string;
  isMain: boolean;
  isActive: boolean;
  latestVersionId: string;
  versionsCount: number;
  mergeRequestId?: string;
}

interface MergeRequest {
  id: string;
  sourceBranchId: string;
  targetBranchId: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  createdAt: string;
  reviewers: Array<{
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    comment?: string;
  }>;
  conflicting: boolean;
}

interface PromptVersioningProps {
  versions: PromptVersion[];
  branches: PromptBranch[];
  mergeRequests: MergeRequest[];
  currentVersionId: string;
  currentBranchId: string;
  onVersionsChange: (versions: PromptVersion[]) => void;
  onBranchesChange: (branches: PromptBranch[]) => void;
  onMergeRequestsChange: (mergeRequests: MergeRequest[]) => void;
  onVersionSelect: (versionId: string) => void;
  onBranchSelect: (branchId: string) => void;
  currentUserId: string;
  currentUserName: string;
  readonly?: boolean;
}

const VERSION_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'review', label: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { value: 'stable', label: 'Stable', color: 'bg-blue-100 text-blue-800' },
  { value: 'deprecated', label: 'Deprecated', color: 'bg-red-100 text-red-800' },
];

export function PromptVersioning({
  versions,
  branches,
  mergeRequests,
  currentVersionId,
  currentBranchId,
  onVersionsChange,
  onBranchesChange,
  onMergeRequestsChange,
  onVersionSelect,
  onBranchSelect,
  currentUserId,
  currentUserName,
  readonly = false,
}: PromptVersioningProps) {
  const [showCreateVersionDialog, setShowCreateVersionDialog] = useState(false);
  const [showCreateBranchDialog, setShowCreateBranchDialog] = useState(false);
  const [showMergeRequestDialog, setShowMergeRequestDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'timeline'>('tree');
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set(['main']));

  const versionForm = useForm<VersionFormData>({
    resolver: zodResolver(versionSchema),
    defaultValues: {
      name: '',
      description: '',
      changeReason: '',
      tags: [],
      isStable: false,
    },
  });

  const currentVersion = versions.find(v => v.id === currentVersionId);
  const currentBranch = branches.find(b => b.id === currentBranchId);

  // Filter and organize versions
  const filteredVersions = useMemo(() => {
    return versions.filter(version => {
      const matchesSearch = !searchTerm || 
        version.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        version.changeReason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        version.authorName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBranch = !filterBranch || version.branchName === filterBranch;
      const matchesStatus = !filterStatus || 
        (filterStatus === 'stable' && version.isStable) ||
        (filterStatus === 'approved' && version.isApproved);
      
      return matchesSearch && matchesBranch && matchesStatus;
    });
  }, [versions, searchTerm, filterBranch, filterStatus]);

  // Organize versions by branch for tree view
  const versionsByBranch = useMemo(() => {
    const organized: Record<string, PromptVersion[]> = {};
    filteredVersions.forEach(version => {
      if (!organized[version.branchName]) {
        organized[version.branchName] = [];
      }
      organized[version.branchName].push(version);
    });
    
    // Sort versions within each branch by creation date
    Object.keys(organized).forEach(branchName => {
      organized[branchName].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    
    return organized;
  }, [filteredVersions]);

  const createVersion = (data: VersionFormData) => {
    if (!currentVersion) return;

    const newVersion: PromptVersion = {
      id: Math.random().toString(36).substr(2, 9),
      versionNumber: `v${versions.length + 1}`,
      name: data.name,
      description: data.description,
      content: currentVersion.content, // Would be current editor content
      changeReason: data.changeReason,
      authorId: currentUserId,
      authorName: currentUserName,
      createdAt: new Date().toISOString(),
      parentVersionId: currentVersionId,
      branchName: currentBranch?.name || 'main',
      tags: data.tags,
      isStable: data.isStable,
      isApproved: false,
      metrics: {
        tokenCount: Math.floor(Math.random() * 2000) + 500,
        estimatedCost: Math.random() * 0.1,
        performanceScore: Math.random() * 100,
      },
      changes: {
        added: Math.floor(Math.random() * 50),
        removed: Math.floor(Math.random() * 30),
        modified: Math.floor(Math.random() * 20),
      },
    };

    onVersionsChange([...versions, newVersion]);
    
    toast({
      title: 'Version created',
      description: `Version "${data.name}" has been created successfully.`,
    });

    versionForm.reset();
    setShowCreateVersionDialog(false);
  };

  const createBranch = (name: string, description?: string) => {
    const newBranch: PromptBranch = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      authorId: currentUserId,
      authorName: currentUserName,
      createdAt: new Date().toISOString(),
      baseBranchId: currentBranchId,
      isMain: false,
      isActive: true,
      latestVersionId: currentVersionId,
      versionsCount: 0,
    };

    onBranchesChange([...branches, newBranch]);
    
    toast({
      title: 'Branch created',
      description: `Branch "${name}" has been created successfully.`,
    });

    setShowCreateBranchDialog(false);
  };

  const createMergeRequest = (targetBranchId: string, title: string, description: string) => {
    const newMergeRequest: MergeRequest = {
      id: Math.random().toString(36).substr(2, 9),
      sourceBranchId: currentBranchId,
      targetBranchId,
      title,
      description,
      authorId: currentUserId,
      authorName: currentUserName,
      status: 'pending',
      createdAt: new Date().toISOString(),
      reviewers: [],
      conflicting: Math.random() > 0.7, // Random conflict simulation
    };

    onMergeRequestsChange([...mergeRequests, newMergeRequest]);
    
    toast({
      title: 'Merge request created',
      description: `Merge request "${title}" has been created.`,
    });

    setShowMergeRequestDialog(false);
  };

  const approveVersion = (versionId: string) => {
    const updatedVersions = versions.map(version =>
      version.id === versionId
        ? {
            ...version,
            isApproved: true,
            approvedBy: currentUserId,
            approvedAt: new Date().toISOString(),
          }
        : version
    );

    onVersionsChange(updatedVersions);
    
    toast({
      title: 'Version approved',
      description: 'The version has been approved successfully.',
    });
  };

  const revertToVersion = (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    const revertVersion: PromptVersion = {
      ...version,
      id: Math.random().toString(36).substr(2, 9),
      versionNumber: `v${versions.length + 1}`,
      name: `Revert to ${version.name}`,
      changeReason: `Reverted to version ${version.versionNumber}`,
      authorId: currentUserId,
      authorName: currentUserName,
      createdAt: new Date().toISOString(),
      parentVersionId: currentVersionId,
      isApproved: false,
    };

    onVersionsChange([...versions, revertVersion]);
    onVersionSelect(revertVersion.id);
    
    toast({
      title: 'Version reverted',
      description: `Reverted to version "${version.name}".`,
    });
  };

  const tagVersion = (versionId: string, tag: string) => {
    const updatedVersions = versions.map(version =>
      version.id === versionId
        ? { ...version, tags: [...version.tags, tag] }
        : version
    );

    onVersionsChange(updatedVersions);
  };

  const toggleBranchExpansion = (branchName: string) => {
    const newExpanded = new Set(expandedBranches);
    if (newExpanded.has(branchName)) {
      newExpanded.delete(branchName);
    } else {
      newExpanded.add(branchName);
    }
    setExpandedBranches(newExpanded);
  };

  const calculateVersionDiff = (version1: PromptVersion, version2: PromptVersion) => {
    // Simplified diff calculation
    const content1 = version1.content;
    const content2 = version2.content;
    
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    
    const added = lines2.filter(line => !lines1.includes(line)).length;
    const removed = lines1.filter(line => !lines2.includes(line)).length;
    
    return { added, removed, modified: Math.min(added, removed) };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const renderTreeView = () => (
    <div className="space-y-4">
      {Object.entries(versionsByBranch).map(([branchName, branchVersions]) => {
        const branch = branches.find(b => b.name === branchName);
        const isExpanded = expandedBranches.has(branchName);
        
        return (
          <div key={branchName} className="border rounded-lg">
            <div 
              className={`p-4 cursor-pointer hover:bg-muted transition-colors ${
                branchName === currentBranch?.name ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => toggleBranchExpansion(branchName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isExpanded ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                  <GitBranch className="h-4 w-4" />
                  <span className="font-medium">{branchName}</span>
                  {branch?.isMain && (
                    <Badge variant="default">Main</Badge>
                  )}
                  <Badge variant="outline">
                    {branchVersions.length} version{branchVersions.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  {branch && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBranchSelect(branch.id);
                      }}
                    >
                      Switch
                    </Button>
                  )}
                </div>
              </div>
              
              {branch?.description && (
                <p className="text-sm text-muted-foreground mt-2 ml-7">
                  {branch.description}
                </p>
              )}
            </div>
            
            {isExpanded && (
              <div className="border-t">
                {branchVersions.map((version, index) => (
                  <div 
                    key={version.id}
                    className={`p-4 border-b last:border-b-0 hover:bg-muted cursor-pointer ${
                      version.id === currentVersionId ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onVersionSelect(version.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            version.id === currentVersionId ? 'bg-blue-500' : 'bg-gray-300'
                          }`} />
                          {index < branchVersions.length - 1 && (
                            <div className="w-px h-8 bg-gray-300 mt-1" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{version.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {version.versionNumber}
                            </Badge>
                            {version.isStable && (
                              <Badge className="bg-blue-100 text-blue-800">Stable</Badge>
                            )}
                            {version.isApproved && (
                              <Badge className="bg-green-100 text-green-800">Approved</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.changeReason}
                          </p>
                          
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{version.authorName}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(version.createdAt)}</span>
                            </div>
                            {version.metrics && (
                              <div className="flex items-center space-x-1">
                                <BarChart3 className="h-3 w-3" />
                                <span>{version.metrics.tokenCount} tokens</span>
                              </div>
                            )}
                          </div>
                          
                          {version.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {version.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onVersionSelect(version.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {!readonly && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                revertToVersion(version.id);
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            
                            {!version.isApproved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approveVersion(version.id);
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-3">
      {filteredVersions.map((version) => (
        <Card 
          key={version.id}
          className={`cursor-pointer hover:shadow-md transition-shadow ${
            version.id === currentVersionId ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => onVersionSelect(version.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium">{version.name}</span>
                  <Badge variant="outline">{version.versionNumber}</Badge>
                  <Badge variant="outline">{version.branchName}</Badge>
                  {version.isStable && (
                    <Badge className="bg-blue-100 text-blue-800">Stable</Badge>
                  )}
                  {version.isApproved && (
                    <Badge className="bg-green-100 text-green-800">Approved</Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {version.changeReason}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>{version.authorName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(version.createdAt)}</span>
                  </div>
                  {version.metrics && (
                    <>
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-3 w-3" />
                        <span>{version.metrics.tokenCount} tokens</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span>${version.metrics.estimatedCost.toFixed(4)}</span>
                      </div>
                      {version.metrics.performanceScore && (
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>{Math.round(version.metrics.performanceScore)}%</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {version.changes && (
                  <div className="flex items-center space-x-3 mt-2 text-xs">
                    <span className="text-green-600">+{version.changes.added}</span>
                    <span className="text-red-600">-{version.changes.removed}</span>
                    <span className="text-blue-600">~{version.changes.modified}</span>
                  </div>
                )}
                
                {version.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {version.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVersionSelect(version.id);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                
                {!readonly && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        revertToVersion(version.id);
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    
                    {!version.isApproved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          approveVersion(version.id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderTimelineView = () => (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      
      <div className="space-y-6">
        {filteredVersions.map((version, index) => (
          <div key={version.id} className="relative flex items-start space-x-4">
            <div className={`w-8 h-8 rounded-full border-4 border-background flex items-center justify-center ${
              version.id === currentVersionId ? 'bg-blue-500' : 'bg-gray-300'
            }`}>
              <GitCommit className="h-4 w-4 text-white" />
            </div>
            
            <Card className={`flex-1 ${version.id === currentVersionId ? 'ring-2 ring-blue-500' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium">{version.name}</span>
                      <Badge variant="outline">{version.versionNumber}</Badge>
                      <Badge variant="outline">{version.branchName}</Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {version.changeReason}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{version.authorName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(version.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onVersionSelect(version.id)}
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Version Control</h3>
          <p className="text-sm text-muted-foreground">
            Track changes and manage versions of your prompt
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {!readonly && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowCreateBranchDialog(true)}
              >
                <GitBranch className="h-4 w-4 mr-2" />
                New Branch
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowMergeRequestDialog(true)}
              >
                <GitMerge className="h-4 w-4 mr-2" />
                Merge Request
              </Button>
              
              <Button onClick={() => setShowCreateVersionDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Version
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Current version info */}
      {currentVersion && (
        <Alert>
          <GitCommit className="h-4 w-4" />
          <AlertDescription>
            Currently viewing <strong>{currentVersion.name}</strong> ({currentVersion.versionNumber}) 
            on branch <strong>{currentVersion.branchName}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search versions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All branches</SelectItem>
              {branches.map(branch => (
                <SelectItem key={branch.id} value={branch.name}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tree')}
          >
            Tree
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('timeline')}
          >
            Timeline
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="min-h-96">
        {viewMode === 'tree' && renderTreeView()}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'timeline' && renderTimelineView()}
      </div>

      {/* Create Version Dialog */}
      <Dialog open={showCreateVersionDialog} onOpenChange={setShowCreateVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Create a new version of your prompt with the current changes
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={versionForm.handleSubmit(createVersion)} className="space-y-4">
            <div>
              <Label htmlFor="name">Version Name</Label>
              <Input
                id="name"
                {...versionForm.register('name')}
                placeholder="e.g., Enhanced system instructions"
              />
              {versionForm.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {versionForm.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...versionForm.register('description')}
                placeholder="Detailed description of changes..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="changeReason">Change Reason</Label>
              <Textarea
                id="changeReason"
                {...versionForm.register('changeReason')}
                placeholder="Why are you making this change?"
                rows={2}
              />
              {versionForm.formState.errors.changeReason && (
                <p className="text-sm text-destructive mt-1">
                  {versionForm.formState.errors.changeReason.message}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isStable"
                {...versionForm.register('isStable')}
                className="rounded"
              />
              <Label htmlFor="isStable">Mark as stable version</Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateVersionDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <GitCommit className="h-4 w-4 mr-2" />
                Create Version
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Branch Dialog */}
      <Dialog open={showCreateBranchDialog} onOpenChange={setShowCreateBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogDescription>
              Create a new branch to work on experimental features
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="branchName">Branch Name</Label>
              <Input
                id="branchName"
                placeholder="feature/new-enhancement"
              />
            </div>
            
            <div>
              <Label htmlFor="branchDescription">Description (Optional)</Label>
              <Textarea
                id="branchDescription"
                placeholder="What will you work on in this branch?"
                rows={2}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateBranchDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const nameEl = document.getElementById('branchName') as HTMLInputElement;
                  const descEl = document.getElementById('branchDescription') as HTMLTextAreaElement;
                  if (nameEl.value) {
                    createBranch(nameEl.value, descEl.value);
                  }
                }}
              >
                <GitBranch className="h-4 w-4 mr-2" />
                Create Branch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Request Dialog */}
      <Dialog open={showMergeRequestDialog} onOpenChange={setShowMergeRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Merge Request</DialogTitle>
            <DialogDescription>
              Request to merge changes from {currentBranch?.name} into another branch
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="targetBranch">Target Branch</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select target branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter(b => b.id !== currentBranchId)
                    .map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="mergeTitle">Title</Label>
              <Input
                id="mergeTitle"
                placeholder="Brief description of changes"
              />
            </div>
            
            <div>
              <Label htmlFor="mergeDescription">Description</Label>
              <Textarea
                id="mergeDescription"
                placeholder="Detailed description of changes and reasoning..."
                rows={4}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowMergeRequestDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Implementation would collect form data and call createMergeRequest
                  setShowMergeRequestDialog(false);
                }}
              >
                <GitMerge className="h-4 w-4 mr-2" />
                Create Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}