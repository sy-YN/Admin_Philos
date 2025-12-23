
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Users, Film, BookOpen, BarChart3, Trophy, LogOut, ChevronLeft, CalendarDays, User, Network, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import type { Member } from '@/types/member';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const allNavItems = [
  { href: '/dashboard/members', label: 'メンバー管理', icon: Users, id: 'members', requiredPermissions: ['members'] },
  { href: '/dashboard/organization', label: '組織管理', icon: Network, id: 'organization', requiredPermissions: ['organization'] },
  { href: '/dashboard/permissions', label: '権限管理', icon: Shield, id: 'permissions', requiredPermissions: ['permissions'] },
  { href: '/dashboard/contents', label: 'コンテンツ管理', icon: Film, id: 'contents', requiredPermissions: ['video_management', 'message_management'] },
  { href: '/dashboard/philosophy', label: '理念管理', icon: BookOpen, id: 'philosophy', requiredPermissions: ['philosophy'] },
  { href: '/dashboard/calendar', label: 'カレンダー設定', icon: CalendarDays, id: 'calendar', requiredPermissions: ['calendar'] },
  { href: '/dashboard/dashboard', label: '目標設定', icon: BarChart3, id: 'dashboard', requiredPermissions: ['company_goal_setting', 'org_personal_goal_setting'] },
  { href: '/dashboard/ranking', label: 'ランキング設定', icon: Trophy, id: 'ranking', requiredPermissions: ['ranking'] },
];

const rolePermissions: Record<Member['role'], string[]> = {
  admin: ['members', 'organization', 'permissions', 'video_management', 'message_management', 'philosophy', 'calendar', 'company_goal_setting', 'org_personal_goal_setting', 'ranking'],
  executive: ['video_management', 'message_management', 'philosophy', 'calendar', 'company_goal_setting', 'org_personal_goal_setting', 'ranking'],
  manager: ['org_personal_goal_setting'],
  employee: [],
};


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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<Member['role'] | null>(null);

  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!firestore) {
      setIsAuthorized(false);
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    getDoc(userDocRef).then(userDoc => {
      if (userDoc.exists()) {
        const userData = userDoc.data() as Member;
        const userRole = userData.role;
        setCurrentUserRole(userRole);
        
        // TODO: ここで一時的な権限も考慮に入れる
        const permanentPermissions = rolePermissions[userRole] || [];
        const currentPermissions = [...new Set(permanentPermissions)];
        setUserPermissions(currentPermissions);

        if (currentPermissions.length > 0) {
          setIsAuthorized(true);
        } else {
           auth?.signOut().then(() => {
            router.replace('/login');
          });
        }
      } else {
        auth?.signOut().then(() => {
          router.replace('/login');
        });
      }
    }).catch(() => {
      auth?.signOut().then(() => {
        router.replace('/login');
      });
    });

  }, [user, isUserLoading, router, firestore, auth]);
  
  const navItems = useMemo(() => {
    if (!currentUserRole) return [];
    return allNavItems.filter(item => 
      item.requiredPermissions.some(p => userPermissions.includes(p))
    );
  }, [currentUserRole, userPermissions]);


  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
    router.push('/login');
  };

  if (isUserLoading || !isAuthorized || !currentUserRole) {
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
