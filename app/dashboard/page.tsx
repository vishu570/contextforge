import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Bot, FileCode, Webhook, Plus, TrendingUp, Clock, Archive } from 'lucide-react';
import Link from 'next/link';

async function getDashboardData(userId: string) {
  const [items, recentItems, collections, imports] = await Promise.all([
    prisma.item.groupBy({
      by: ['type'],
      where: { userId },
      _count: true,
    }),
    prisma.item.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    }),
    prisma.collection.count({
      where: { userId },
    }),
    prisma.import.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ]);

  const stats = {
    prompts: items.find(i => i.type === 'prompt')?._count || 0,
    agents: items.find(i => i.type === 'agent')?._count || 0,
    rules: items.find(i => i.type === 'rule')?._count || 0,
    templates: items.find(i => i.type === 'template')?._count || 0,
    total: items.reduce((sum, item) => sum + item._count, 0),
    collections,
  };

  return { stats, recentItems, imports };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  const { stats, recentItems, imports } = await getDashboardData(user.id);

  const typeIcons = {
    prompt: FileText,
    agent: Bot,
    rule: FileCode,
    template: Webhook,
  };

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back to ContextForge. Manage your AI development context in one place.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Across all categories
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prompts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.prompts}</div>
              <p className="text-xs text-muted-foreground">
                Ready to use prompts
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agents</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.agents}</div>
              <p className="text-xs text-muted-foreground">
                Agent definitions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collections</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.collections}</div>
              <p className="text-xs text-muted-foreground">
                Organized workspaces
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Tabs defaultValue="recent" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recent">Recent Items</TabsTrigger>
            <TabsTrigger value="imports">Recent Imports</TabsTrigger>
          </TabsList>
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recently Updated</CardTitle>
                <CardDescription>
                  Your most recently modified context items
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentItems.length > 0 ? (
                  <div className="space-y-4">
                    {recentItems.map((item) => {
                      const Icon = typeIcons[item.type as keyof typeof typeIcons] || FileText;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline">{item.type}</Badge>
                                {item.tags.map((itemTag) => (
                                  <Badge key={itemTag.id} variant="secondary">
                                    {itemTag.tag.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {new Date(item.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No items yet</p>
                    <Button asChild>
                      <Link href="/dashboard/import">
                        <Plus className="mr-2 h-4 w-4" />
                        Import your first item
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="imports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import History</CardTitle>
                <CardDescription>
                  Recent imports from various sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                {imports.length > 0 ? (
                  <div className="space-y-4">
                    {imports.map((imp) => (
                      <div
                        key={imp.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">Import #{imp.id.slice(-8)}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={imp.status === 'completed' ? 'default' : 'secondary'}>
                              {imp.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {imp.processedFiles}/{imp.totalFiles} files
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(imp.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No imports yet</p>
                    <Button asChild>
                      <Link href="/dashboard/import">
                        <Plus className="mr-2 h-4 w-4" />
                        Start importing
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}