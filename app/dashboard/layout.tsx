import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    redirect('/login');
  }

  // The new EditorLayout handles all UI layout, so we just pass through children
  return <>{children}</>;
}