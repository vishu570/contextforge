import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardLayout } from '@/components/dashboard-layout';
import { FolderManagementInterface } from '@/components/folder-management-interface';

async function getFolders(userId: string) {
  return await prisma.collection.findMany({
    where: { userId },
    include: {
      children: {
        include: {
          _count: {
            select: {
              children: true,
              items: true
            }
          }
        }
      },
      parent: true,
      items: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              type: true,
              subType: true,
              format: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      },
      _count: {
        select: {
          children: true,
          items: true
        }
      }
    },
    orderBy: [
      { level: 'asc' },
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  });
}

async function getItems(userId: string) {
  return await prisma.item.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      type: true,
      subType: true,
      format: true,
      createdAt: true,
      updatedAt: true,
      collections: {
        include: {
          collection: {
            select: {
              id: true,
              name: true,
              path: true
            }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
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

  const [folders, items] = await Promise.all([
    getFolders(user.id),
    getItems(user.id)
  ]);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Folder Management</h1>
            <p className="text-muted-foreground">
              Organize your context items with AI-powered folder structures
            </p>
          </div>
        </div>

        <FolderManagementInterface 
          initialFolders={folders}
          initialItems={items}
          userId={user.id}
        />
      </div>
    </DashboardLayout>
  );
}