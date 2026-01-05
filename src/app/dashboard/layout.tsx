
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Users, Film, BookOpen, BarChart3, Trophy, LogOut, ChevronLeft, CalendarDays, User, Network, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import type { Member } from '@/types/member';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import type { Role } from '@/types/role';
import type { UserPermission } from '@/types/user-permission';

const allNavItems = [
  { href: '/dashboard/members', label: 'メンバー管理', icon: Users, id: 'members' },
  { href: '/dashboard/organization', label: '組織管理', icon: Network, id: 'organization' },
  { href: '/dashboard/permissions', label: '権限管理', icon: Shield, id: 'permissions' },
  { href: '/dashboard/contents', label: 'コンテンツ管理', icon: Film, id: 'contents', requiredPermissions: ['video_management', 'message_management', 'proxy_post_video', 'proxy_post_message'] },
  { href: '/dashboard/philosophy', label: '理念管理', icon: BookOpen, id: 'philosophy' },
  { href: '/dashboard/calendar', label: 'カレンダー設定', icon: CalendarDays, id: 'calendar' },
  { href: '/dashboard/dashboard', label: '目標設定', icon: BarChart3, id: 'dashboard', requiredPermissions: ['company_goal_setting', 'org_personal_goal_setting'] },
  { href: '/dashboard/ranking', label: 'ランキング設定', icon: Trophy, id: 'ranking' },
];


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  const fetchUserPermissions = useCallback(async (userUid: string): Promise<string[]> => {
    if (!firestore) return [];

    try {
      const userPermsDocRef = doc(firestore, 'user_permissions', userUid);
      const userPermsDoc = await getDoc(userPermsDocRef);

      // 1. Check for individual permissions first
      if (userPermsDoc.exists()) {
        const individualPerms = userPermsDoc.data() as UserPermission;
        return individualPerms.permissions || [];
      }
      
      // 2. If no individual permissions, fall back to role-based permissions
      const userDocRef = doc(firestore, 'users', userUid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error("User document not found.");
        return [];
      }
      
      const userData = userDoc.data() as Member;
      const userRole = userData.role;

      const roleDocRef = doc(firestore, 'roles', userRole);
      const roleDoc = await getDoc(roleDocRef);
      
      return roleDoc.exists() ? (roleDoc.data() as Role).permissions : [];

    } catch (error) {
      console.error("Error fetching permissions:", error);
      return [];
    }
  }, [firestore]);
  

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until Firebase Auth state is resolved.
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    fetchUserPermissions(user.uid).then(perms => {
      const managementPermissions = perms.filter(p => p !== 'can_comment');
      if (managementPermissions.length === 0) {
        // If no management permissions, sign out and redirect to login
        if(auth) auth.signOut();
        router.replace('/login');
      } else {
        setUserPermissions(perms);
        setIsCheckingPermissions(false);
      }
    });
  }, [user, isUserLoading, router, auth, fetchUserPermissions]);
  
  const navItems = useMemo(() => {
    if (isCheckingPermissions) {
      return [];
    }
    return allNavItems.filter(item => {
      if(!item.requiredPermissions) {
          // If the item doesn't require any specific permission, we assume it's a general one
          // that should be checked by its ID. Example: 'members'
          return userPermissions.includes(item.id);
      }
      // If it requires permissions, check if the user has at least one of them
      return item.requiredPermissions?.some(p => userPermissions.includes(p))
    });
  }, [userPermissions, isCheckingPermissions]);


  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
    router.push('/login');
  };

  if (isUserLoading || isCheckingPermissions) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="flex h-screen w-full bg-muted/40">
        <aside className={cn(
          "hidden md:flex flex-col border-r bg-background transition-all duration-300",
           isCollapsed ? "w-20" : "w-72"
        )}>
           <div className={cn(
              "flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 relative transition-all duration-300",
               isCollapsed && "px-2 justify-center"
              )}>
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <Building2 className="h-6 w-6 text-primary" />
                {!isCollapsed && <span className="">Philos Admin</span>}
              </Link>
               <Button 
                variant="ghost" 
                size="icon" 
                className="absolute -right-5 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 border bg-background hover:bg-muted"
                onClick={() => setIsCollapsed(!isCollapsed)}
               >
                <ChevronLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
              </Button>
            </div>
            <nav className={cn(
              "flex flex-col gap-1 py-4 text-sm font-medium transition-all duration-300 flex-grow",
                isCollapsed ? "px-2" : "px-4"
              )}>
              {navItems.map((item) => (
                   <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                       <Link
                          href={item.href}
                           className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-primary",
                            pathname.startsWith(item.href) && 'bg-muted text-primary',
                            isCollapsed && "justify-center"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span>{item.label}</span>}
                          <span className="sr-only">{item.label}</span>
                        </Link>
                    </TooltipTrigger>
                     {isCollapsed && (
                      <TooltipContent side="right">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
            </nav>
            <div className={cn(
              "mt-auto p-4 transition-all duration-300 space-y-4",
              isCollapsed && "p-2"
              )}>
                
              <Separator />

              <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                 <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.photoURL || undefined} />
                      <AvatarFallback>
                        <User className="h-5 w-5"/>
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                   {isCollapsed && user && (
                    <TooltipContent side="right">
                       <p>{user.displayName}</p>
                       <p className="text-muted-foreground">{user.email}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                 {!isCollapsed && user && (
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold truncate">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                 )}
              </div>
              
              <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                     <Button 
                        size={isCollapsed ? 'icon' : 'default'}
                        className="w-full"
                        variant="outline" 
                        onClick={handleLogout}
                      >
                      <LogOut className="h-5 w-5" />
                      {!isCollapsed && <span className="ml-2">ログアウト</span>}
                       <span className="sr-only">ログアウト</span>
                    </Button>
                  </TooltipTrigger>
                   {isCollapsed && (
                    <TooltipContent side="right">
                      ログアウト
                    </TooltipContent>
                  )}
              </Tooltip>
            </div>
        </aside>
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Mobile Header will go here */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
