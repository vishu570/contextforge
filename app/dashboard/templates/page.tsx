import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Webhook, Search, Filter, Plus, Edit, Trash2, Copy } from 'lucide-react';
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
    <DashboardLayout user={user}>
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
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Webhook className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon">
                        <Copy className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/templates/${template.id}/edit`}>
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
                    {template.content.substring(0, 150)}...
                  </CardDescription>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">{template.format}</Badge>
                      {template.language && (
                        <Badge variant="secondary" className="text-xs">
                          {template.language}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((itemTag) => (
                        <Badge key={itemTag.id} variant="secondary" className="text-xs">
                          {itemTag.tag.name}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {template.source && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center">
                      <span>Source: {template.source.type}</span>
                      {template.source.repoName && (
                        <span className="ml-1">• {template.source.repoName}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
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
    </DashboardLayout>
  );
}