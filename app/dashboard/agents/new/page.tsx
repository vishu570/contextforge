import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CreateItemForm } from '@/components/create-item-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

async function getAllTags() {
  return await prisma.tag.findMany({
    orderBy: { name: 'asc' },
  });
}

export default async function NewAgentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  const allTags = await getAllTags();

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/agents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              New Agent
            </h1>
            <p className="text-muted-foreground">
              Create a new AI agent definition
            </p>
          </div>
        </div>

        {/* Create Form */}
        <CreateItemForm 
          availableTags={allTags}
          type="agents"
          itemType="agent"
          userId={user.id}
        />
      </div>
  );
}