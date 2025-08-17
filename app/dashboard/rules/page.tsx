import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemCard } from '@/components/item-card';
import { FileCode, Search, Filter, Plus } from 'lucide-react';
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
            {rules.map((rule) => (
              <ItemCard key={rule.id} item={{
                id: rule.id,
                name: rule.name,
                content: rule.content,
                type: rule.type as 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'other',
                format: rule.format,
                updatedAt: rule.updatedAt,
                tags: rule.tags,
                source: rule.source ? {
                  type: rule.source.type,
                  repoName: rule.source.repoName
                } : undefined
              }} />
            ))}
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