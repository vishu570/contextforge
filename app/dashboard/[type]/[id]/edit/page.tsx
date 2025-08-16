import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardLayout } from '@/components/dashboard-layout';
import { EditItemForm } from '@/components/edit-item-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EditPageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

async function getItem(id: string, userId: string) {
  return await prisma.item.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 10,
      },
      optimizations: {
        where: { status: 'suggested' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      conversions: {
        where: { status: 'suggested' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      source: true,
      canonical: true,
      duplicates: {
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      },
    },
  });
}

async function getAllTags() {
  return await prisma.tag.findMany({
    orderBy: { name: 'asc' },
  });
}

const validTypes = ['prompts', 'agents', 'rules', 'templates', 'snippets'];

export default async function EditItemPage({ params }: EditPageProps) {
  const { type, id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  // Validate type parameter
  if (!validTypes.includes(type)) {
    redirect('/dashboard');
  }

  const item = await getItem(id, user.id);
  if (!item) {
    redirect(`/dashboard/${type}`);
  }

  // Verify item type matches URL type
  const typeMapping = {
    prompts: 'prompt',
    agents: 'agent',
    rules: 'rule',
    templates: 'template',
    snippets: 'snippet',
  };

  if (item.type !== typeMapping[type as keyof typeof typeMapping]) {
    redirect(`/dashboard/${type}`);
  }

  const allTags = await getAllTags();

  const capitalizedType = type.charAt(0).toUpperCase() + type.slice(0, -1);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/${type}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Edit {capitalizedType}
            </h1>
            <p className="text-muted-foreground">
              Modify your {type.slice(0, -1)} content and settings
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <EditItemForm 
          item={item} 
          availableTags={allTags}
          type={type}
          userId={user.id}
        />
      </div>
    </DashboardLayout>
  );
}