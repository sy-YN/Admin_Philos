
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { usePermissions } from '@/context/PermissionContext';


const allNavItems = [
  { href: '/dashboard/members', id: 'members' },
  { href: '/dashboard/organization', id: 'organization' },
  { href: '/dashboard/permissions', id: 'permissions' },
  { href: '/dashboard/contents', id: 'contents', requiredPermissions: ['video_management', 'message_management', 'proxy_post_video', 'proxy_post_message'] },
  { href: '/dashboard/philosophy', id: 'philosophy' },
  { href: '/dashboard/calendar', id: 'calendar' },
  { href: '/dashboard/dashboard', id: 'dashboard', requiredPermissions: ['company_goal_setting', 'org_personal_goal_setting'] },
  { href: '/dashboard/ranking', id: 'ranking' },
];

/**
 * This page acts as a temporary loading and redirect hub for the dashboard.
 * The actual permission checking and redirection logic is handled by the DashboardLayout.
 * This component simply ensures the user is authenticated and then allows the layout
 * to determine the correct destination.
 */
export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { userPermissions, isCheckingPermissions } = usePermissions();

  useEffect(() => {
    if (isUserLoading || isCheckingPermissions) {
      return; 
    }
    
    if (!user) {
      router.replace('/login');
      return;
    }

    const firstAllowedPage = allNavItems.find(item => {
        if (!item.requiredPermissions) {
          return userPermissions.includes(item.id);
        }
        return item.requiredPermissions.some(p => userPermissions.includes(p));
    });

    if (firstAllowedPage) {
        router.replace(firstAllowedPage.href);
    } else {
        // If no pages are allowed, maybe redirect to a specific "no access" page or logout.
        // For now, let's keep them on a loading-like screen which will be handled by layout.
    }

  }, [user, isUserLoading, router, userPermissions, isCheckingPermissions]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
