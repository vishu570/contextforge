'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ImportPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard with import mode
    router.replace('/dashboard?mode=import');
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="h-screen flex items-center justify-center bg-[#0F1117]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to import...</p>
      </div>
    </div>
  );
}