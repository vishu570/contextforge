'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Users, Lock, Globe, Copy, Eye, Edit, Trash2, UserPlus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FolderPermissions {
  isPublic: boolean;
  shareUrl?: string;
  allowDownload: boolean;
  requireAuth: boolean;
  inheritanceEnabled: boolean;
  users: Array<{
    id: string;
    email: string;
    name?: string;
    role: 'viewer' | 'editor' | 'admin';
    addedAt: string;
    addedBy: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    role: 'viewer' | 'editor' | 'admin';
    memberCount: number;
  }>;
}

interface FolderSharingProps {
  folderId: string;
  folderName: string;
  folderPath: string;
  permissions: FolderPermissions;
  onUpdatePermissions: (permissions: FolderPermissions) => Promise<void>;
  onGenerateShareUrl: () => Promise<string>;
  onRevokeShareUrl: () => Promise<void>;
  availableUsers?: Array<{ id: string; email: string; name?: string }>;
  availableTeams?: Array<{ id: string; name: string; memberCount: number }>;
}

const roleDescriptions = {
  viewer: 'Can view folder contents and download items if allowed',
  editor: 'Can view, download, and add/edit items in the folder',
  admin: 'Full access including sharing and permission management'
};

export function FolderSharing({
  folderId,
  folderName,
  folderPath,
  permissions,
  onUpdatePermissions,
  onGenerateShareUrl,
  onRevokeShareUrl,
  availableUsers = [],
  availableTeams = []
}: FolderSharingProps) {
  const [showSharingDialog, setShowSharingDialog] = useState(false);
  const [localPermissions, setLocalPermissions] = useState<FolderPermissions>(permissions);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  const updatePermissions = async (updates: Partial<FolderPermissions>) => {
    const newPermissions = { ...localPermissions, ...updates };
    setLocalPermissions(newPermissions);
    try {
      await onUpdatePermissions(newPermissions);
      toast({ title: 'Permissions updated successfully' });
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({ title: 'Failed to update permissions', variant: 'destructive' });
      setLocalPermissions(permissions); // Revert on error
    }
  };

  const handleGenerateShareUrl = async () => {
    setIsGeneratingLink(true);
    try {
      const shareUrl = await onGenerateShareUrl();
      await updatePermissions({ shareUrl });
      toast({ title: 'Share link generated successfully' });
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({ title: 'Failed to generate share link', variant: 'destructive' });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleRevokeShareUrl = async () => {
    try {
      await onRevokeShareUrl();
      await updatePermissions({ shareUrl: undefined });
      toast({ title: 'Share link revoked successfully' });
    } catch (error) {
      console.error('Error revoking share link:', error);
      toast({ title: 'Failed to revoke share link', variant: 'destructive' });
    }
  };

  const copyShareUrl = () => {
    if (localPermissions.shareUrl) {
      navigator.clipboard.writeText(localPermissions.shareUrl);
      toast({ title: 'Share link copied to clipboard' });
    }
  };

  const addUserPermission = (userId: string, role: 'viewer' | 'editor' | 'admin') => {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return;

    const newUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      addedAt: new Date().toISOString(),
      addedBy: 'current-user' // This should be the current user's ID
    };

    updatePermissions({
      users: [...localPermissions.users.filter(u => u.id !== userId), newUser]
    });
  };

  const removeUserPermission = (userId: string) => {
    updatePermissions({
      users: localPermissions.users.filter(u => u.id !== userId)
    });
  };

  const updateUserRole = (userId: string, role: 'viewer' | 'editor' | 'admin') => {
    updatePermissions({
      users: localPermissions.users.map(u => 
        u.id === userId ? { ...u, role } : u
      )
    });
  };

  const inviteUserByEmail = () => {
    if (!inviteEmail.trim()) return;

    // Check if user exists
    const existingUser = availableUsers.find(u => u.email === inviteEmail);
    if (existingUser) {
      addUserPermission(existingUser.id, inviteRole);
    } else {
      // For now, we'll add a placeholder user - in real implementation,
      // this would send an invitation email
      const newUser = {
        id: `pending-${Date.now()}`,
        email: inviteEmail,
        role: inviteRole,
        addedAt: new Date().toISOString(),
        addedBy: 'current-user'
      };

      updatePermissions({
        users: [...localPermissions.users, newUser]
      });

      toast({ 
        title: 'Invitation sent', 
        description: `Invitation sent to ${inviteEmail}` 
      });
    }

    setInviteEmail('');
    setInviteRole('viewer');
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSharingDialog(true)}
        className="flex items-center"
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share
        {(localPermissions.isPublic || localPermissions.users.length > 0) && (
          <Badge variant="secondary" className="ml-2">
            {localPermissions.isPublic ? 'Public' : localPermissions.users.length}
          </Badge>
        )}
      </Button>

      <Dialog open={showSharingDialog} onOpenChange={setShowSharingDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Share2 className="h-5 w-5 mr-2" />
              Share "{folderName}"
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{folderPath}</p>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              {/* Public Access */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <CardTitle className="text-base">Public Access</CardTitle>
                    </div>
                    <Switch
                      checked={localPermissions.isPublic}
                      onCheckedChange={(checked) => updatePermissions({ isPublic: checked })}
                    />
                  </div>
                </CardHeader>
                {localPermissions.isPublic && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Anyone with the link can access this folder
                    </p>
                    
                    {/* Share Link */}
                    <div className="space-y-2">
                      {localPermissions.shareUrl ? (
                        <div className="flex space-x-2">
                          <Input
                            value={localPermissions.shareUrl}
                            readOnly
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={copyShareUrl}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleRevokeShareUrl}
                          >
                            Revoke
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleGenerateShareUrl}
                          disabled={isGeneratingLink}
                          className="w-full"
                        >
                          {isGeneratingLink ? 'Generating...' : 'Generate Share Link'}
                        </Button>
                      )}
                    </div>

                    {/* Public Access Options */}
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="allow-download">Allow downloads</Label>
                        <Switch
                          id="allow-download"
                          checked={localPermissions.allowDownload}
                          onCheckedChange={(checked) => updatePermissions({ allowDownload: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="require-auth">Require authentication</Label>
                        <Switch
                          id="require-auth"
                          checked={localPermissions.requireAuth}
                          onCheckedChange={(checked) => updatePermissions({ requireAuth: checked })}
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{localPermissions.users.length} users</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {localPermissions.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              {/* Add Users */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={inviteUserByEmail} disabled={!inviteEmail.trim()}>
                      Invite
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Users */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Current Access</CardTitle>
                </CardHeader>
                <CardContent>
                  {localPermissions.users.length > 0 ? (
                    <div className="space-y-3">
                      {localPermissions.users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`/avatars/${user.id}.jpg`} />
                              <AvatarFallback>
                                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {user.name || user.email}
                              </p>
                              {user.name && (
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Select
                              value={user.role}
                              onValueChange={(value: any) => updateUserRole(user.id, value)}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeUserPermission(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No users have been given access to this folder
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Role Descriptions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Role Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(roleDescriptions).map(([role, description]) => (
                      <div key={role} className="flex items-start space-x-2">
                        <Badge variant="outline" className="mt-0.5 capitalize">
                          {role}
                        </Badge>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              {/* Inheritance Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Permission Inheritance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="inheritance">Apply to subfolders</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically apply these permissions to all subfolders
                        </p>
                      </div>
                      <Switch
                        id="inheritance"
                        checked={localPermissions.inheritanceEnabled}
                        onCheckedChange={(checked) => updatePermissions({ inheritanceEnabled: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Access History */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {localPermissions.users.slice(0, 3).map((user) => (
                      <div key={user.id} className="text-sm">
                        <span className="font-medium">{user.name || user.email}</span>
                        <span className="text-muted-foreground"> was added as {user.role}</span>
                        <span className="text-muted-foreground"> • {new Date(user.addedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                    {localPermissions.users.length === 0 && (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        updatePermissions({
                          isPublic: false,
                          shareUrl: undefined,
                          users: [],
                          teams: []
                        });
                      }}
                    >
                      Remove All Access
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      This will remove all sharing permissions and make the folder private
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button onClick={() => setShowSharingDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}