
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
    try {
      const userPermsDocRef = doc(firestore, 'user_permissions', userUid);
      const userPermsDoc = await getDoc(userPermsDocRef);
      if (userPermsDoc.exists()) {
        const individualPerms = userPermsDoc.data() as UserPermission;
        return individualPerms.permissions || [];
      }
      
      const userDocRef = doc(firestore, 'users', userUid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        return [];
      }
      
      const userData = userDoc.data() as Member;
      const roleDocRef = doc(firestore, 'roles', userData.role);
      const roleDoc = await getDoc(roleDocRef);
      
      return roleDoc.exists() ? (roleDoc.data() as Role).permissions : [];
    } catch (error) {
      console.error("[PermissionContext] Error fetching permissions:", error);
      return [];
    }
  }, [firestore]);

  useEffect(() => {
    // Keep isCheckingPermissions true while Firebase SDK is loading its user state
    if (isUserLoading) {
      setIsCheckingPermissions(true);
      return;
    }

    if (user) {
      // User is authenticated, start fetching their permissions
      setIsCheckingPermissions(true);
      fetchUserPermissions(user.uid).then(perms => {
        setUserPermissions(perms);
        setIsCheckingPermissions(false); // Permissions fetch is complete
      });
    } else {
      // No user is logged in (or they just logged out)
      setUserPermissions([]);
      setIsCheckingPermissions(false); // No permissions to check, so we're done.
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
