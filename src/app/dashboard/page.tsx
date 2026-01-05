
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

/**
 * This page acts as a temporary loading and redirect hub for the dashboard.
 * The actual permission checking and redirection logic is handled by the DashboardLayout.
 * This component simply ensures the user is authenticated and then allows the layout
 * to determine the correct destination.
 */
export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // The parent layout (DashboardLayout) will handle the redirect to the correct page
  // once it determines the user's permissions. This component just shows a spinner.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
