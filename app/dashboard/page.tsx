import { prisma } from '@/lib/db';
import { EditorLayout } from '@/components/features/editor/EditorLayout';

async function getDashboardData(userId: string) {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  // Get tags that are associated with the user's items
  const tags = await prisma.tag.findMany({
    where: {
      items: {
        some: {
          item: {
            userId: userId
          }
        }
      }
    },
  });

  return { items, tags };
}

export default async function DashboardPage() {
  // Client-side data fetching, no server-side props needed
  return (
    <EditorLayout />
  );
}