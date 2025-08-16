'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { 
  MessageSquare,
  Send,
  Reply,
  Check,
  X,
  Edit,
  Trash2,
  Users,
  UserPlus,
  UserMinus,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  ThumbsUp,
  ThumbsDown,
  Pin,
  PinOff,
  Share,
  Copy,
  Filter,
  Search,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  AtSign,
  Bell,
  BellOff,
  History,
  Activity,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  type: z.enum(['comment', 'suggestion', 'question', 'approval']),
  mentions: z.array(z.string()),
});

type CommentFormData = z.infer<typeof commentSchema>;

export interface CollaboratorComment {
  id: string;
  content: string;
  type: 'comment' | 'suggestion' | 'question' | 'approval';
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  position?: {
    line: number;
    column: number;
    length?: number;
  };
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  mentions: string[];
  reactions: Array<{
    emoji: string;
    users: string[];
  }>;
  isPinned: boolean;
  replies: Array<{
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: string;
    mentions: string[];
  }>;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  cursor?: {
    line: number;
    column: number;
  };
}

interface PromptCollaborationProps {
  comments: CollaboratorComment[];
  collaborators: Collaborator[];
  currentUserId: string;
  currentUserName: string;
  promptContent: string;
  onCommentsChange: (comments: CollaboratorComment[]) => void;
  onCollaboratorsChange: (collaborators: Collaborator[]) => void;
  onContentChange: (content: string) => void;
  readonly?: boolean;
  showPresence?: boolean;
}

const COMMENT_TYPES = [
  { value: 'comment', label: 'Comment', icon: MessageSquare, color: 'bg-blue-100 text-blue-800' },
  { value: 'suggestion', label: 'Suggestion', icon: Edit, color: 'bg-green-100 text-green-800' },
  { value: 'question', label: 'Question', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approval', label: 'Approval', icon: CheckCircle, color: 'bg-purple-100 text-purple-800' },
];

const ROLE_PERMISSIONS = {
  owner: ['read', 'write', 'comment', 'approve', 'invite', 'manage'],
  editor: ['read', 'write', 'comment', 'approve'],
  commenter: ['read', 'comment'],
  viewer: ['read'],
};

export function PromptCollaboration({
  comments,
  collaborators,
  currentUserId,
  currentUserName,
  promptContent,
  onCommentsChange,
  onCollaboratorsChange,
  onContentChange,
  readonly = false,
  showPresence = true,
}: PromptCollaborationProps) {
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [selectedText, setSelectedText] = useState<{
    text: string;
    line: number;
    column: number;
    length: number;
  } | null>(null);
  const [commentFilter, setCommentFilter] = useState<string>('');
  const [commentTypeFilter, setCommentTypeFilter] = useState<string>('');
  const [showResolved, setShowResolved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<Collaborator['role']>('commenter');
  const [mentionSuggestions, setMentionSuggestions] = useState<Collaborator[]>([]);
  const [showMentions, setShowMentions] = useState(false);

  const commentFormRef = useRef<HTMLTextAreaElement>(null);
  const replyFormRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: '',
      type: 'comment',
      mentions: [],
    },
  });

  const currentUser = collaborators.find(c => c.id === currentUserId);
  const canComment = currentUser && ROLE_PERMISSIONS[currentUser.role].includes('comment');
  const canEdit = currentUser && ROLE_PERMISSIONS[currentUser.role].includes('write');
  const canInvite = currentUser && ROLE_PERMISSIONS[currentUser.role].includes('invite');

  // Filter comments
  const filteredComments = comments.filter(comment => {
    const matchesFilter = !commentFilter || 
      comment.content.toLowerCase().includes(commentFilter.toLowerCase()) ||
      comment.authorName.toLowerCase().includes(commentFilter.toLowerCase());
    
    const matchesType = !commentTypeFilter || comment.type === commentTypeFilter;
    const matchesResolved = showResolved || !comment.resolved;
    
    return matchesFilter && matchesType && matchesResolved;
  });

  // Sort comments by creation date
  const sortedComments = filteredComments.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Handle text selection for commenting
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (selectedText && canComment) {
      // Calculate line and column (simplified)
      const textBefore = promptContent.substring(0, range.startOffset);
      const lines = textBefore.split('\n');
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;
      
      setSelectedText({
        text: selectedText,
        line,
        column,
        length: selectedText.length,
      });
    }
  }, [promptContent, canComment]);

  // Add comment
  const onSubmitComment = (data: CommentFormData) => {
    const newComment: CollaboratorComment = {
      id: Math.random().toString(36).substr(2, 9),
      content: data.content,
      type: data.type,
      authorId: currentUserId,
      authorName: currentUserName,
      position: selectedText ? {
        line: selectedText.line,
        column: selectedText.column,
        length: selectedText.length,
      } : undefined,
      resolved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mentions: data.mentions,
      reactions: [],
      isPinned: false,
      replies: [],
    };

    onCommentsChange([...comments, newComment]);
    
    toast({
      title: 'Comment added',
      description: `Your ${data.type} has been added successfully.`,
    });

    form.reset();
    setSelectedText(null);
    setShowCommentDialog(false);
  };

  // Add reply
  const addReply = (commentId: string, content: string, mentions: string[] = []) => {
    const newReply = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      authorId: currentUserId,
      authorName: currentUserName,
      createdAt: new Date().toISOString(),
      mentions,
    };

    const updatedComments = comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, replies: [...comment.replies, newReply] }
        : comment
    );

    onCommentsChange(updatedComments);
    setReplyingTo(null);
    
    toast({
      title: 'Reply added',
      description: 'Your reply has been added successfully.',
    });
  };

  // Resolve comment
  const resolveComment = (commentId: string) => {
    const updatedComments = comments.map(comment => 
      comment.id === commentId 
        ? { 
            ...comment, 
            resolved: !comment.resolved,
            resolvedBy: !comment.resolved ? currentUserId : undefined,
            resolvedAt: !comment.resolved ? new Date().toISOString() : undefined,
          }
        : comment
    );

    onCommentsChange(updatedComments);
  };

  // Delete comment
  const deleteComment = (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    if (comment.authorId !== currentUserId && currentUser?.role !== 'owner') {
      toast({
        title: 'Permission denied',
        description: 'You can only delete your own comments.',
        variant: 'destructive',
      });
      return;
    }

    const updatedComments = comments.filter(c => c.id !== commentId);
    onCommentsChange(updatedComments);
    
    toast({
      title: 'Comment deleted',
      description: 'The comment has been deleted successfully.',
    });
  };

  // Pin/unpin comment
  const togglePinComment = (commentId: string) => {
    const updatedComments = comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, isPinned: !comment.isPinned }
        : comment
    );

    onCommentsChange(updatedComments);
  };

  // Add reaction
  const addReaction = (commentId: string, emoji: string) => {
    const updatedComments = comments.map(comment => {
      if (comment.id === commentId) {
        const existingReaction = comment.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          if (existingReaction.users.includes(currentUserId)) {
            // Remove reaction
            existingReaction.users = existingReaction.users.filter(u => u !== currentUserId);
            if (existingReaction.users.length === 0) {
              comment.reactions = comment.reactions.filter(r => r.emoji !== emoji);
            }
          } else {
            // Add reaction
            existingReaction.users.push(currentUserId);
          }
        } else {
          // New reaction
          comment.reactions.push({ emoji, users: [currentUserId] });
        }
      }
      return comment;
    });

    onCommentsChange(updatedComments);
  };

  // Invite collaborator
  const inviteCollaborator = () => {
    if (!newCollaboratorEmail) return;

    const newCollaborator: Collaborator = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCollaboratorEmail.split('@')[0],
      email: newCollaboratorEmail,
      role: newCollaboratorRole,
      status: 'offline',
      lastSeen: new Date().toISOString(),
    };

    onCollaboratorsChange([...collaborators, newCollaborator]);
    
    toast({
      title: 'Invitation sent',
      description: `Invitation sent to ${newCollaboratorEmail}`,
    });

    setNewCollaboratorEmail('');
    setNewCollaboratorRole('commenter');
    setShowInviteDialog(false);
  };

  // Update collaborator role
  const updateCollaboratorRole = (collaboratorId: string, newRole: Collaborator['role']) => {
    const updatedCollaborators = collaborators.map(collaborator =>
      collaborator.id === collaboratorId 
        ? { ...collaborator, role: newRole }
        : collaborator
    );

    onCollaboratorsChange(updatedCollaborators);
    
    toast({
      title: 'Role updated',
      description: 'Collaborator role has been updated successfully.',
    });
  };

  // Remove collaborator
  const removeCollaborator = (collaboratorId: string) => {
    const updatedCollaborators = collaborators.filter(c => c.id !== collaboratorId);
    onCollaboratorsChange(updatedCollaborators);
    
    toast({
      title: 'Collaborator removed',
      description: 'Collaborator has been removed from this prompt.',
    });
  };

  // Handle mention detection
  const handleMentionInput = (value: string, textarea: HTMLTextAreaElement) => {
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      const suggestions = collaborators.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.email.toLowerCase().includes(query)
      );
      setMentionSuggestions(suggestions);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention
  const insertMention = (collaborator: Collaborator, textarea: HTMLTextAreaElement) => {
    const value = textarea.value;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const newValue = textBeforeCursor.replace(/@(\w*)$/, `@${collaborator.name} `) + textAfterCursor;
      textarea.value = newValue;
      textarea.focus();
      
      const newPosition = textBeforeCursor.replace(/@(\w*)$/, `@${collaborator.name} `).length;
      textarea.setSelectionRange(newPosition, newPosition);
      
      setShowMentions(false);
    }
  };

  const getCommentTypeInfo = (type: string) => {
    return COMMENT_TYPES.find(t => t.value === type) || COMMENT_TYPES[0];
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Collaboration</h3>
          <p className="text-sm text-muted-foreground">
            Real-time editing and feedback with your team
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {canInvite && (
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
          
          {canComment && (
            <Button
              onClick={() => setShowCommentDialog(true)}
              disabled={readonly}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          )}
        </div>
      </div>

      {/* Collaborators */}
      {showPresence && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Collaborators ({collaborators.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collaborator.avatar} />
                        <AvatarFallback>
                          {collaborator.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
                        collaborator.status === 'online' ? 'bg-green-500' :
                        collaborator.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">{collaborator.name}</p>
                      <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                    </div>
                    
                    <Badge variant="outline" className="text-xs">
                      {collaborator.role}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      {collaborator.status === 'online' ? 'Online' : `Last seen ${formatTime(collaborator.lastSeen)}`}
                    </span>
                    
                    {canInvite && collaborator.id !== currentUserId && (
                      <div className="flex items-center space-x-1">
                        <Select
                          value={collaborator.role}
                          onValueChange={(value: Collaborator['role']) => 
                            updateCollaboratorRole(collaborator.id, value)
                          }
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="commenter">Commenter</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCollaborator(collaborator.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Comments ({filteredComments.length})</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={showResolved ? "default" : "outline"}
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
              >
                {showResolved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              
              <Select value={commentTypeFilter} onValueChange={setCommentTypeFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  {COMMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search comments..."
                value={commentFilter}
                onChange={(e) => setCommentFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {sortedComments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="mx-auto h-12 w-12 mb-4" />
                  <p>No comments yet</p>
                  <p className="text-sm">Start a conversation with your team</p>
                </div>
              ) : (
                sortedComments.map((comment) => {
                  const typeInfo = getCommentTypeInfo(comment.type);
                  const isSelected = selectedCommentId === comment.id;
                  
                  return (
                    <Card 
                      key={comment.id} 
                      className={`${comment.isPinned ? 'border-yellow-200 bg-yellow-50/50' : ''} ${
                        comment.resolved ? 'opacity-60' : ''
                      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => setSelectedCommentId(isSelected ? null : comment.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Comment Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.authorAvatar} />
                                <AvatarFallback>
                                  {comment.authorName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-medium">{comment.authorName}</p>
                                  <Badge className={typeInfo.color} variant="secondary">
                                    {typeInfo.label}
                                  </Badge>
                                  {comment.isPinned && (
                                    <Pin className="h-3 w-3 text-yellow-600" />
                                  )}
                                  {comment.resolved && (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatTime(comment.createdAt)}
                                  {comment.position && (
                                    <span className="ml-2">
                                      Line {comment.position.line}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              {(comment.authorId === currentUserId || currentUser?.role === 'owner') && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => togglePinComment(comment.id)}
                                  >
                                    {comment.isPinned ? 
                                      <PinOff className="h-4 w-4" /> : 
                                      <Pin className="h-4 w-4" />
                                    }
                                  </Button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteComment(comment.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resolveComment(comment.id)}
                              >
                                {comment.resolved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Comment Content */}
                          <div className="text-sm">
                            {comment.content}
                          </div>
                          
                          {/* Referenced Text */}
                          {comment.position && (
                            <div className="bg-muted p-2 rounded text-xs border-l-4 border-blue-500">
                              <p className="font-medium text-muted-foreground">Referenced text:</p>
                              <p className="mt-1">
                                {promptContent.substring(
                                  Math.max(0, comment.position.column - 1),
                                  Math.min(promptContent.length, comment.position.column + (comment.position.length || 0))
                                )}
                              </p>
                            </div>
                          )}
                          
                          {/* Reactions */}
                          {comment.reactions.length > 0 && (
                            <div className="flex items-center space-x-2">
                              {comment.reactions.map((reaction) => (
                                <Button
                                  key={reaction.emoji}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={() => addReaction(comment.id, reaction.emoji)}
                                >
                                  <span className="mr-1">{reaction.emoji}</span>
                                  <span className="text-xs">{reaction.users.length}</span>
                                </Button>
                              ))}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => addReaction(comment.id, '👍')}
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div className="flex items-center space-x-2 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReplyingTo(comment.id)}
                            >
                              <Reply className="h-4 w-4 mr-1" />
                              Reply
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addReaction(comment.id, '👍')}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Like
                            </Button>
                          </div>
                          
                          {/* Reply Form */}
                          {replyingTo === comment.id && (
                            <div className="mt-3 space-y-2">
                              <Textarea
                                ref={replyFormRef}
                                placeholder="Write a reply..."
                                rows={2}
                                onChange={(e) => 
                                  handleMentionInput(e.target.value, e.target)
                                }
                              />
                              
                              {showMentions && (
                                <div className="bg-white border rounded-md shadow-lg max-h-32 overflow-y-auto">
                                  {mentionSuggestions.map((collaborator) => (
                                    <button
                                      key={collaborator.id}
                                      className="flex items-center space-x-2 w-full px-3 py-2 hover:bg-muted text-left"
                                      onClick={() => insertMention(collaborator, replyFormRef.current!)}
                                    >
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={collaborator.avatar} />
                                        <AvatarFallback>
                                          {collaborator.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-sm font-medium">{collaborator.name}</p>
                                        <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const content = replyFormRef.current?.value;
                                    if (content) {
                                      addReply(comment.id, content);
                                      if (replyFormRef.current) {
                                        replyFormRef.current.value = '';
                                      }
                                    }
                                  }}
                                >
                                  Reply
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReplyingTo(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Replies */}
                          {comment.replies.length > 0 && (
                            <div className="mt-3 space-y-2 border-l-2 border-muted pl-4">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="flex items-start space-x-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={reply.authorAvatar} />
                                    <AvatarFallback>
                                      {reply.authorName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <p className="text-sm font-medium">{reply.authorName}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatTime(reply.createdAt)}
                                      </p>
                                    </div>
                                    <p className="text-sm mt-1">{reply.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              {selectedText ? 
                `Add a comment about: "${selectedText.text.substring(0, 50)}${selectedText.text.length > 50 ? '...' : ''}"` :
                'Add a general comment about this prompt'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmitComment)} className="space-y-4">
            <div>
              <Label htmlFor="type">Comment Type</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value: any) => form.setValue('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center space-x-2">
                        <type.icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="content">Comment</Label>
              <Textarea
                id="content"
                {...form.register('content')}
                placeholder="Write your comment..."
                rows={4}
                onChange={(e) => 
                  handleMentionInput(e.target.value, e.target)
                }
              />
              
              {showMentions && (
                <div className="bg-white border rounded-md shadow-lg max-h-32 overflow-y-auto mt-1">
                  {mentionSuggestions.map((collaborator) => (
                    <button
                      key={collaborator.id}
                      className="flex items-center space-x-2 w-full px-3 py-2 hover:bg-muted text-left"
                      onClick={() => insertMention(collaborator, commentFormRef.current!)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={collaborator.avatar} />
                        <AvatarFallback>
                          {collaborator.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{collaborator.name}</p>
                        <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {form.formState.errors.content && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.content.message}
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCommentDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Send className="h-4 w-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Collaborator Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Collaborator</DialogTitle>
            <DialogDescription>
              Invite someone to collaborate on this prompt
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={newCollaboratorEmail}
                onChange={(e) => setNewCollaboratorEmail(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={newCollaboratorRole}
                onValueChange={(value: Collaborator['role']) => setNewCollaboratorRole(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer - Can only view</SelectItem>
                  <SelectItem value="commenter">Commenter - Can view and comment</SelectItem>
                  <SelectItem value="editor">Editor - Can edit and comment</SelectItem>
                  <SelectItem value="owner">Owner - Full access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={inviteCollaborator}>
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}