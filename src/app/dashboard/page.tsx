
'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Member } from '@/types/member';
import type { Role } from '@/types/role';
import type { UserPermission } from '@/types/user-permission';


// This list should be kept in sync with the one in layout.tsx
const allNavItems = [
  { href: '/dashboard/members', id: 'members' },
  { href: '/dashboard/organization', id: 'organization' },
  { href: '/dashboard/permissions', id: 'permissions' },
  { href: '/dashboard/contents', id: 'contents', requiredPermissions: ['video_management', 'message_management', 'proxy_post'] },
  { href: '/dashboard/philosophy', id: 'philosophy' },
  { href: '/dashboard/calendar', id: 'calendar' },
  { href: '/dashboard/dashboard', id: 'dashboard', requiredPermissions: ['company_goal_setting', 'org_personal_goal_setting'] },
  { href: '/dashboard/ranking', id: 'ranking' },
];


export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const fetchUserPermissions = useCallback(async (userUid: string): Promise<string[]> => {
    if (!firestore) return [];
    try {
      const userPermsDocRef = doc(firestore, 'user_permissions', userUid);
      const userPermsDoc = await getDoc(userPermsDocRef);

      if (userPermsDoc.exists()) {
        const individualPerms = userPermsDoc.data() as UserPermission;
        return individualPerms.permissions || [];
      }
      
      const userDocRef = doc(firestore, 'users', userUid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) return [];
      
      const userData = userDoc.data() as Member;
      const roleDocRef = doc(firestore, 'roles', userData.role);

      const roleDoc = await getDoc(roleDocRef);
      return roleDoc.exists() ? (roleDoc.data() as Role).permissions : [];

    } catch (error) {
      console.error("Error fetching permissions for redirect:", error);
      return [];
    }
  }, [firestore]);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }
    if (!user) {
      router.replace('/login');
      return;
    }

    fetchUserPermissions(user.uid).then(permissions => {
      const firstAllowedPage = allNavItems.find(item => {
         if(!item.requiredPermissions) {
          return permissions.includes(item.id);
        }
        return item.requiredPermissions?.some(p => permissions.includes(p))
      });

      if (firstAllowedPage) {
        router.replace(firstAllowedPage.href);
      } else {
        // If user has no accessible pages, maybe redirect to a specific page or show an error
        // For now, let's keep them on a safe page, or redirect to login.
        router.replace('/login'); 
      }
    });
  }, [user, isUserLoading, router, fetchUserPermissions]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
