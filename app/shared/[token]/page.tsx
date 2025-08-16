import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  User, 
  Calendar, 
  Tag, 
  Eye, 
  Clock,
  Share,
  Lock,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface SharedPageProps {
  params: Promise<{
    token: string;
  }>;
}

async function getSharedItem(token: string) {
  // Find item with matching share token
  const items = await prisma.item.findMany({
    where: {
      metadata: {
        contains: `"token":"${token}"`,
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      source: true,
    },
  });

  if (items.length === 0) {
    return null;
  }

  const item = items[0];
  const metadata = JSON.parse(item.metadata || '{}');
  const shareConfig = metadata.shareConfig;

  if (!shareConfig || shareConfig.token !== token) {
    return null;
  }

  // Check if share link has expired
  if (shareConfig.expiresAt && new Date(shareConfig.expiresAt) < new Date()) {
    return null;
  }

  return {
    ...item,
    shareConfig,
  };
}

function renderContent(content: string, format: string) {
  switch (format) {
    case '.md':
    case '.markdown':
      return (
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    
    case '.json':
      try {
        const parsed = JSON.parse(content);
        return (
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
            <code>{JSON.stringify(parsed, null, 2)}</code>
          </pre>
        );
      } catch {
        return (
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
            <code>{content}</code>
          </pre>
        );
      }
    
    default:
      return (
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
          <code>{content}</code>
        </pre>
      );
  }
}

export default async function SharedItemPage({ params }: SharedPageProps) {
  const { token } = await params;
  const item = await getSharedItem(token);

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Link Not Found</CardTitle>
            <CardDescription>
              This shared link is invalid, expired, or has been revoked.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/">
                Go to ContextForge
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if authentication is required
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  let currentUser = null;

  if (authToken) {
    currentUser = await getUserFromToken(authToken);
  }

  if (item.shareConfig.requireAuth && !currentUser) {
    redirect(`/login?returnTo=/shared/${token}`);
  }

  const metadata = JSON.parse(item.metadata || '{}');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold">
                ContextForge
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Share className="h-4 w-4" />
                <span>Shared Content</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!currentUser && (
                <Button variant="outline" asChild>
                  <Link href="/login">
                    Sign In
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Go to App
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Item Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <CardTitle className="text-2xl">{item.name}</CardTitle>
                  </div>
                  {metadata.description && (
                    <CardDescription className="text-base">
                      {metadata.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge variant="outline">{item.format}</Badge>
                  <Badge variant="secondary">{item.type}</Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Item Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Author:</span>
                  <span className="text-sm font-medium">
                    {item.author || item.user.name || 'Unknown'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Updated:</span>
                  <span className="text-sm font-medium">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {item.language && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Language:</span>
                    <span className="text-sm font-medium capitalize">
                      {item.language}
                    </span>
                  </div>
                )}

                {item.targetModels && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Target Models:</span>
                    <div className="flex space-x-1">
                      {item.targetModels.split(',').map((model) => (
                        <Badge key={model} variant="outline" className="text-xs">
                          {model}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {item.tags.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((itemTag) => (
                      <Badge key={itemTag.id} variant="secondary" className="text-xs">
                        {itemTag.tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Item Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content</CardTitle>
            </CardHeader>
            <CardContent>
              {renderContent(item.content, item.format)}
            </CardContent>
          </Card>

          {/* Share Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Share Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Shared on:</span>
                  <span>{new Date(item.shareConfig.createdAt).toLocaleString()}</span>
                </div>
                
                {item.shareConfig.expiresAt && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Expires on:</span>
                    <span>{new Date(item.shareConfig.expiresAt).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Permissions:</span>
                  <Badge variant="outline" className="text-xs">
                    {item.shareConfig.permissions}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}