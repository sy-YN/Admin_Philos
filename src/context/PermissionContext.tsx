
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Member } from '@/types/member';
import type { Role } from '@/types/role';
import type { UserPermission } from '@/types/user-permission';

interface PermissionContextType {
  userPermissions: string[];
  isCheckingPermissions: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  userPermissions: [],
  isCheckingPermissions: true,
});

export const usePermissions = () => {
  return useContext(PermissionContext);
};

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  const fetchUserPermissions = useCallback(async (userUid: string): Promise<string[]> => {
    console.log(`[PermissionProvider] fetchUserPermissions: Starting for UID: ${userUid}`);
    if (!firestore) {
        console.error('[PermissionProvider] fetchUserPermissions: Firestore not available!');
        return [];
    };
    try {
      const userPermsDocRef = doc(firestore, 'user_permissions', userUid);
      const userPermsDoc = await getDoc(userPermsDocRef);
      if (userPermsDoc.exists()) {
        const individualPerms = userPermsDoc.data() as UserPermission;
        console.log('[PermissionProvider] fetchUserPermissions: Found individual permissions.', individualPerms.permissions);
        return individualPerms.permissions || [];
      }
      
      console.log('[PermissionProvider] fetchUserPermissions: No individual permissions found. Checking role-based permissions.');
      const userDocRef = doc(firestore, 'users', userUid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        console.warn('[PermissionProvider] fetchUserPermissions: User document not found.');
        return [];
      }
      
      const userData = userDoc.data() as Member;
      const roleDocRef = doc(firestore, 'roles', userData.role);
      const roleDoc = await getDoc(roleDocRef);
      
      const permissions = roleDoc.exists() ? (roleDoc.data() as Role).permissions : [];
      console.log(`[PermissionProvider] fetchUserPermissions: Found role '${userData.role}' with permissions:`, permissions);
      return permissions;

    } catch (error) {
      console.error("[PermissionProvider] Error fetching permissions:", error);
      return [];
    }
  }, [firestore]);

  useEffect(() => {
    console.log('[PermissionProvider] useEffect triggered', { isUserLoading, hasUser: !!user });
    
    if (isUserLoading) {
      console.log('[PermissionProvider] Auth state is loading, setting isCheckingPermissions to true.');
      setIsCheckingPermissions(true);
      return;
    }

    if (user) {
      console.log('[PermissionProvider] User is authenticated. Starting to fetch permissions...');
      setIsCheckingPermissions(true);
      fetchUserPermissions(user.uid).then(perms => {
        console.log('[PermissionProvider] Permissions fetch complete. Setting state.');
        setUserPermissions(perms);
        setIsCheckingPermissions(false);
      });
    } else {
      console.log('[PermissionProvider] No user found. Clearing permissions and finishing check.');
      setUserPermissions([]);
      setIsCheckingPermissions(false);
    }
  }, [user, isUserLoading, fetchUserPermissions]);

  const value = useMemo(() => ({
    userPermissions,
    isCheckingPermissions,
  }), [userPermissions, isCheckingPermissions]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};
