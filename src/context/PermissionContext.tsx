
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
    if (!firestore) return [];
    console.log(`[PermissionContext] Fetching permissions for UID: ${userUid}`);
    try {
      const userPermsDocRef = doc(firestore, 'user_permissions', userUid);
      const userPermsDoc = await getDoc(userPermsDocRef);
      if (userPermsDoc.exists()) {
        const individualPerms = userPermsDoc.data() as UserPermission;
        console.log('[PermissionContext] Found individual permissions:', individualPerms.permissions);
        return individualPerms.permissions || [];
      }
      
      const userDocRef = doc(firestore, 'users', userUid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        console.log('[PermissionContext] User document not found.');
        return [];
      }
      
      const userData = userDoc.data() as Member;
      const roleDocRef = doc(firestore, 'roles', userData.role);
      const roleDoc = await getDoc(roleDocRef);
      
      const rolePerms = roleDoc.exists() ? (roleDoc.data() as Role).permissions : [];
      console.log(`[PermissionContext] Found role '${userData.role}' with permissions:`, rolePerms);
      return rolePerms;
    } catch (error) {
      console.error("[PermissionContext] Error fetching permissions:", error);
      return [];
    }
  }, [firestore]);

  useEffect(() => {
    if (isUserLoading) {
      console.log('[PermissionContext] Waiting for user loading to finish...');
      return;
    }
    if (user) {
      console.log('[PermissionContext] User is authenticated, fetching permissions.');
      setIsCheckingPermissions(true);
      fetchUserPermissions(user.uid).then(perms => {
        console.log('[PermissionContext] Permissions fetched, updating state.');
        setUserPermissions(perms);
        setIsCheckingPermissions(false);
      });
    } else {
      console.log('[PermissionContext] No user, clearing permissions.');
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
