import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemCard } from '@/components/item-card';
import { FileText, Search, Filter, Plus } from 'lucide-react';
import Link from 'next/link';

async function getPrompts(userId: string) {
  return await prisma.item.findMany({
    where: { 
      userId,
      type: 'prompt',
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

export default async function PromptsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  const prompts = await getPrompts(user.id);

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
            <p className="text-muted-foreground">
              Manage your AI prompts and instructions
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/prompts/new">
              <Plus className="mr-2 h-4 w-4" />
              New Prompt
            </Link>
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Prompts Grid */}
        {prompts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prompts.map((prompt) => (
              <ItemCard key={prompt.id} item={{
                id: prompt.id,
                name: prompt.name,
                content: prompt.content,
                type: prompt.type as 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'other',
                format: prompt.format,
                updatedAt: prompt.updatedAt,
                tags: prompt.tags,
                source: prompt.source ? {
                  type: prompt.source.type,
                  repoName: prompt.source.repoName
                } : undefined
              }} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No prompts yet</h3>
            <p className="text-muted-foreground mb-4">
              Import prompts from files or create new ones to get started
            </p>
            <div className="flex justify-center space-x-4">
              <Button asChild>
                <Link href="/dashboard/import">
                  <Plus className="mr-2 h-4 w-4" />
                  Import Prompts
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/prompts/new">
                  Create New
                </Link>
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}