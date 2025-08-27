import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemCard } from '@/components/item-card';
import { Webhook, Search, Filter, Plus } from 'lucide-react';
import Link from 'next/link';

async function getTemplates(userId: string) {
  return await prisma.item.findMany({
    where: { 
      userId,
      type: 'template',
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

export default async function TemplatesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  const templates = await getTemplates(user.id);

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
            <p className="text-muted-foreground">
              Manage code templates, boilerplates, and reusable snippets
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/templates/new">
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Link>
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Templates Grid */}
        {templates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <ItemCard key={template.id} item={{
                id: template.id,
                name: template.name,
                content: template.content,
                type: template.type as 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'other',
                format: template.format,
                updatedAt: template.updatedAt,
                tags: template.tags,
                source: template.source ? {
                  type: template.source.type,
                  repoName: template.source.repoName
                } : undefined
              }} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Webhook className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Import code templates and boilerplates or create new ones
            </p>
            <div className="flex justify-center space-x-4">
              <Button asChild>
                <Link href="/dashboard/import">
                  <Plus className="mr-2 h-4 w-4" />
                  Import Templates
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/templates/new">
                  Create New
                </Link>
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}