import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, Search, Filter, Plus, Edit, Trash2, FileText } from 'lucide-react';
import Link from 'next/link';

async function getCollections(userId: string) {
  return await prisma.collection.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          item: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export default async function CollectionsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  const collections = await getCollections(user.id);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
            <p className="text-muted-foreground">
              Organize your context items into themed workspaces
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/collections/new">
              <Plus className="mr-2 h-4 w-4" />
              New Collection
            </Link>
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search collections..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Collections Grid */}
        {collections.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Card key={collection.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" style={{ color: collection.color || undefined }} />
                      <CardTitle className="text-lg truncate">{collection.name}</CardTitle>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/collections/${collection.id}/edit`}>
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
                  <CardDescription className="mb-3">
                    {collection.description || 'No description provided'}
                  </CardDescription>
                  
                  {/* Item Count and Types */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {collection.items.length} item{collection.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Item Type Distribution */}
                  {collection.items.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const typeCount: Record<string, number> = {};
                          collection.items.forEach(({ item }) => {
                            typeCount[item.type] = (typeCount[item.type] || 0) + 1;
                          });
                          
                          return Object.entries(typeCount).map(([type, count]) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {count} {type}{count !== 1 ? 's' : ''}
                            </Badge>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/collections/${collection.id}`}>
                        View Collection
                      </Link>
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {new Date(collection.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No collections yet</h3>
            <p className="text-muted-foreground mb-4">
              Create collections to organize your prompts, agents, and rules into themed workspaces
            </p>
            <div className="flex justify-center space-x-4">
              <Button asChild>
                <Link href="/dashboard/collections/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Collection
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}