import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileCode, Search, Filter, Plus, Edit, Trash2, Download } from 'lucide-react';
import Link from 'next/link';

async function getRules(userId: string) {
  return await prisma.item.findMany({
    where: { 
      userId,
      type: 'rule',
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      source: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export default async function RulesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  const rules = await getRules(user.id);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rules</h1>
            <p className="text-muted-foreground">
              Manage IDE rules, linting configs, and development guidelines
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/rules/new">
              <Plus className="mr-2 h-4 w-4" />
              New Rule
            </Link>
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Rules Grid */}
        {rules.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => {
              const metadata = JSON.parse(rule.metadata || '{}');
              return (
                <Card key={rule.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <FileCode className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg truncate">{rule.name}</CardTitle>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/rules/${rule.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3 line-clamp-3">
                      {metadata.description || rule.content.substring(0, 150) + '...'}
                    </CardDescription>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">{rule.format}</Badge>
                        {rule.language && (
                          <Badge variant="secondary" className="text-xs">
                            {rule.language}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {metadata.globs && (
                      <div className="mb-2 text-xs text-muted-foreground">
                        <span className="font-medium">Applies to:</span> {metadata.globs.join(', ')}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {rule.tags.map((itemTag) => (
                          <Badge key={itemTag.id} variant="secondary" className="text-xs">
                            {itemTag.tag.name}
                          </Badge>
                        ))}
                        {metadata.alwaysApply && (
                          <Badge variant="default" className="text-xs">
                            Always Apply
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(rule.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {rule.source && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center">
                        <span>Source: {rule.source.type}</span>
                        {rule.source.repoName && (
                          <span className="ml-1">• {rule.source.repoName}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileCode className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No rules yet</h3>
            <p className="text-muted-foreground mb-4">
              Import IDE rules and configs or create new ones
            </p>
            <div className="flex justify-center space-x-4">
              <Button asChild>
                <Link href="/dashboard/import">
                  <Plus className="mr-2 h-4 w-4" />
                  Import Rules
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/rules/new">
                  Create New
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}