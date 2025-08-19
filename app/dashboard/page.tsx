import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Bot, FileCode, Webhook, Plus, TrendingUp, Clock, Archive, Brain, Zap, Activity } from 'lucide-react';
import Link from 'next/link';
import { SmartContextBoard } from '@/components/smart-context-board';
import { WorkflowStream } from '@/components/workflow-stream';
import { QuickActionsPanel } from '@/components/quick-actions-panel';
import { VisualContextBuilder } from '@/components/visual-context-builder';

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-3">
              <Brain className="h-8 w-8 text-primary" />
              <span>AI Context Command Center</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Intelligent context management powered by AI. Monitor, optimize, and deploy your context at scale.
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/import">
                <Plus className="mr-2 h-4 w-4" />
                Import
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/collections">
                <Zap className="mr-2 h-4 w-4" />
                Quick Start
              </Link>
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Grid with AI Focus */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Contexts</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                Currently processing
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Archive className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-green-600">
                +{Math.floor(stats.total * 0.12)} this week
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Optimizations</CardTitle>
              <Zap className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Pending review
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <p className="text-xs text-orange-600">
                +5% improvement
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Command Center Interface */}
        <Tabs defaultValue="board" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="board" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Context Board</span>
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Live Stream</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Quick Actions</span>
            </TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center space-x-2">
              <FileCode className="h-4 w-4" />
              <span>Visual Builder</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="board">
            <SmartContextBoard />
          </TabsContent>

          <TabsContent value="workflow">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <WorkflowStream />
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <CardDescription>
                      Latest context updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentItems.length > 0 ? (
                      <div className="space-y-3">
                        {recentItems.slice(0, 3).map((item) => {
                          const Icon = typeIcons[item.type as keyof typeof typeIcons] || FileText;
                          return (
                            <Link 
                              key={item.id}
                              href={`/dashboard/${item.type}s/${item.id}/edit`}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                            >
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(item.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">No recent activity</p>
                        <Button size="sm" asChild>
                          <Link href="/dashboard/import">
                            <Plus className="mr-2 h-3 w-3" />
                            Import Items
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actions">
            <QuickActionsPanel />
          </TabsContent>

          <TabsContent value="builder">
            <VisualContextBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}