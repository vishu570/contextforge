import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  History, 
  Search, 
  Filter, 
  Upload, 
  FileText, 
  Bot, 
  FileCode, 
  Webhook,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  GitBranch
} from 'lucide-react';

async function getHistoryData(userId: string) {
  const [auditLogs, imports, versions] = await Promise.all([
    prisma.auditLog.findMany({
      where: { userId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.import.findMany({
      where: { userId },
      include: {
        source: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.version.findMany({
      where: {
        item: {
          userId,
        },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return { auditLogs, imports, versions };
}

const actionIcons = {
  import: Upload,
  create: FileText,
  update: FileText,
  delete: XCircle,
  approve: CheckCircle,
  reject: XCircle,
  optimize: Bot,
  convert: GitBranch,
  finalize_import: CheckCircle,
};

const typeIcons = {
  prompt: FileText,
  agent: Bot,
  rule: FileCode,
  template: Webhook,
  snippet: FileCode,
  other: FileText,
};

const statusColors = {
  completed: 'text-green-600',
  processing: 'text-yellow-600',
  failed: 'text-red-600',
  pending: 'text-orange-600',
};

export default async function HistoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  const { auditLogs, imports, versions } = await getHistoryData(user.id);

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">History</h1>
            <p className="text-muted-foreground">
              View your import history, version changes, and system activity
            </p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        <Tabs defaultValue="imports" className="space-y-6">
          <TabsList>
            <TabsTrigger value="imports">
              <Upload className="mr-2 h-4 w-4" />
              Imports
            </TabsTrigger>
            <TabsTrigger value="activity">
              <History className="mr-2 h-4 w-4" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="versions">
              <GitBranch className="mr-2 h-4 w-4" />
              Version History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="imports" className="space-y-4">
            {imports.length > 0 ? (
              <div className="space-y-4">
                {imports.map((importRecord) => (
                  <Card key={importRecord.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <CardTitle className="text-base">
                              Import #{importRecord.id.slice(-8)}
                            </CardTitle>
                            <CardDescription>
                              {importRecord.source ? (
                                <>
                                  From {importRecord.source.type}
                                  {importRecord.source.repoName && (
                                    <>: {importRecord.source.repoOwner}/{importRecord.source.repoName}</>
                                  )}
                                  {importRecord.source.url && !importRecord.source.repoName && (
                                    <>: {importRecord.source.url}</>
                                  )}
                                </>
                              ) : (
                                'Unknown source'
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge 
                          variant={importRecord.status === 'completed' ? 'default' : 'secondary'}
                          className={statusColors[importRecord.status as keyof typeof statusColors]}
                        >
                          {importRecord.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-muted-foreground">
                            {importRecord.processedFiles} / {importRecord.totalFiles} files processed
                          </span>
                          {importRecord.failedFiles > 0 && (
                            <span className="text-red-600">
                              {importRecord.failedFiles} failed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {new Date(importRecord.createdAt).toLocaleDateString()} at{' '}
                            {new Date(importRecord.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      {importRecord.errorLog && (
                        <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                          <AlertCircle className="h-4 w-4 inline mr-2" />
                          {importRecord.errorLog}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No imports yet</h3>
                <p className="text-muted-foreground">
                  Import history will appear here as you add content
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log) => {
                  const ActionIcon = actionIcons[log.action as keyof typeof actionIcons] || History;
                  const ItemIcon = log.item ? typeIcons[log.item.type as keyof typeof typeIcons] : FileText;
                  
                  return (
                    <Card key={log.id} className="p-4">
                      <div className="flex items-center space-x-3">
                        <ActionIcon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium capitalize">
                              {log.action.replace('_', ' ')}
                            </span>
                            {log.item && (
                              <>
                                <ItemIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {log.item.name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {log.item.type}
                                </Badge>
                              </>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.entityType} • {new Date(log.createdAt).toLocaleDateString()} at{' '}
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No activity yet</h3>
                <p className="text-muted-foreground">
                  Your activity history will appear here
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="versions" className="space-y-4">
            {versions.length > 0 ? (
              <div className="space-y-3">
                {versions.map((version) => {
                  const ItemIcon = typeIcons[version.item.type as keyof typeof typeIcons];
                  
                  return (
                    <Card key={version.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <GitBranch className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <ItemIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{version.item.name}</span>
                              <Badge variant="outline" className="text-xs">
                                v{version.versionNumber}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {version.changeReason || 'No reason provided'}
                              {version.changedBy && ` • by ${version.changedBy}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>{new Date(version.createdAt).toLocaleDateString()}</div>
                          <div>{new Date(version.createdAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <GitBranch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No version history</h3>
                <p className="text-muted-foreground">
                  Version history will appear when you edit items
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}