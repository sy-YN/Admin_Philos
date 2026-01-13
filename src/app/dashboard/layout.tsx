
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Building2,
  Users,
  Film,
  BookOpen,
  BarChart3,
  Trophy,
  LogOut,
  ChevronLeft,
  CalendarDays,
  User,
  Network,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { useState, useMemo, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { PermissionProvider, usePermissions } from '@/context/PermissionContext';

type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: React.FC<any>;
  requiredPermissions?: string[];
  children?: Omit<NavItem, 'icon' | 'children'>[];
};

const allNavItems: NavItem[] = [
  { href: '/dashboard/members', label: 'メンバー管理', icon: Users, id: 'members' },
  { href: '/dashboard/organization', label: '組織管理', icon: Network, id: 'organization' },
  { href: '/dashboard/permissions', label: '権限管理', icon: Shield, id: 'permissions' },
  {
    href: '/dashboard/contents',
    label: 'コンテンツ管理',
    icon: Film,
    id: 'contents',
    requiredPermissions: ['video_management', 'message_management', 'proxy_post_video', 'proxy_post_message'],
    children: [
      { href: '/dashboard/contents?tab=videos', label: 'ビデオ管理', id: 'video_management' },
      { href: '/dashboard/contents?tab=messages', label: 'メッセージ管理', id: 'message_management' },
    ],
  },
  { href: '/dashboard/philosophy', label: '理念管理', icon: BookOpen, id: 'philosophy' },
  {
    href: '/dashboard/calendar',
    label: 'カレンダー設定',
    icon: CalendarDays,
    id: 'calendar',
    children: [
        { href: '/dashboard/calendar?tab=daily', label: '日替わりメッセージ', id: 'calendar' },
        { href: '/dashboard/calendar?tab=scheduled', label: '期間指定メッセージ', id: 'calendar' },
    ]
  },
  {
    href: '/dashboard/dashboard',
    label: '目標設定',
    icon: BarChart3,
    id: 'dashboard',
    requiredPermissions: ['company_goal_setting', 'org_personal_goal_setting'],
    children: [
        { href: '/dashboard/dashboard?tab=company', label: '会社単位', id: 'company_goal_setting'},
        { href: '/dashboard/dashboard?tab=team', label: '組織単位', id: 'org_personal_goal_setting'},
        { href: '/dashboard/dashboard?tab=personal', label: '個人単位', id: 'org_personal_goal_setting'},
    ]
  },
  { href: '/dashboard/ranking', label: 'ランキング設定', icon: Trophy, id: 'ranking' },
];

function DashboardNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const auth = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { userPermissions } = usePermissions();

  const activeTab = searchParams.get('tab');

  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      if(!item.requiredPermissions) {
          return userPermissions.includes(item.id);
      }
      return item.requiredPermissions?.some(p => userPermissions.includes(p))
    });
  }, [userPermissions]);

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
  };

  const isLinkActive = (item: NavItem) => {
    if (item.children) {
      return pathname.startsWith(item.href);
    }
    return pathname === item.href;
  };

  const isSubLinkActive = (subItem: Omit<NavItem, 'icon' | 'children'>, parentItem: NavItem) => {
    const parentIsActive = pathname.startsWith(parentItem.href);
    const tab = subItem.href.split('tab=')[1];
    return parentIsActive && activeTab === tab;
  };
  
  return (
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
        <nav className="flex flex-col gap-1 py-4 text-sm font-medium flex-grow px-2">
         {isCollapsed ? (
              // Collapsed View: Popover for sub-items
              <TooltipProvider>
                  {navItems.map((item) =>
                  item.children ? (
                      <Popover key={item.id}>
                      <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                              <Button
                              variant={isLinkActive(item) ? 'secondary' : 'ghost'}
                              className="w-full justify-center h-12"
                              size="icon"
                              >
                              <item.icon className="h-5 w-5" />
                              <span className="sr-only">{item.label}</span>
                              </Button>
                          </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                      <PopoverContent side="right" className="w-48 p-1">
                          {item.children
                              .filter(child => userPermissions.includes(child.id))
                              .map((child) => (
                                  <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                      'flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary',
                                      isSubLinkActive(child, item) && 'bg-muted text-primary'
                                  )}
                                  >
                                  {child.label}
                                  </Link>
                          ))}
                      </PopoverContent>
                      </Popover>
                  ) : (
                      <Tooltip key={item.href} delayDuration={0}>
                      <TooltipTrigger asChild>
                          <Link href={item.href}>
                          <Button
                              variant={isLinkActive(item) ? 'secondary' : 'ghost'}
                              className="w-full justify-center h-12"
                              size="icon"
                          >
                              <item.icon className="h-5 w-5" />
                              <span className="sr-only">{item.label}</span>
                          </Button>
                          </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                  )
                  )}
              </TooltipProvider>
              ) : (
              // Expanded View: Accordion for sub-items
              <Accordion type="single" collapsible className="w-full" defaultValue={navItems.find(item => isLinkActive(item))?.id}>
                  {navItems.map((item) =>
                  item.children ? (
                      <AccordionItem value={item.id} key={item.id} className="border-b-0">
                      <AccordionTrigger
                          className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:no-underline hover:text-primary [&[data-state=open]>svg:not(.lucide-film)]:text-primary',
                          isLinkActive(item) && 'text-primary'
                          )}
                      >
                          <div className="flex items-center gap-3 flex-1">
                            <item.icon className="h-5 w-5" />
                            {item.label}
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-8 pb-1 space-y-1">
                          {item.children
                              .filter(child => userPermissions.includes(child.id))
                              .map((child) => (
                              <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                  'block rounded-md px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary',
                                  isSubLinkActive(child, item) && 'bg-muted text-primary'
                                  )}
                              >
                                  {child.label}
                              </Link>
                          ))}
                      </AccordionContent>
                      </AccordionItem>
                  ) : (
                      <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-primary',
                          pathname === item.href && 'bg-muted text-primary'
                      )}
                      >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                      </Link>
                  )
                  )}
              </Accordion>
          )}
        </nav>
        <div className={cn(
          "mt-auto p-4 transition-all duration-300 space-y-4",
          isCollapsed && "p-2"
          )}>
            
          <Separator />

          <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
              <TooltipProvider>
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
              </TooltipProvider>
            
              {!isCollapsed && user && (
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              )}
          </div>
          
          <TooltipProvider>
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
          </TooltipProvider>
        </div>
    </aside>
)
}

function LayoutAuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { userPermissions, isCheckingPermissions } = usePermissions();
  
  useEffect(() => {
    if (isUserLoading || isCheckingPermissions) {
      return;
    }

    if (!user) {
      if (pathname !== '/login') {
          window.location.replace('/login');
      }
      return;
    }
    
    const managementPermissions = userPermissions.filter(p => p !== 'can_comment');

    if (managementPermissions.length === 0 && user) {
      // No management permissions, sign out and redirect
      useAuth().signOut().then(() => {
        window.location.replace('/login');
      });
    } else {
      const firstAllowedPage = allNavItems.find(item => {
        if (!item.requiredPermissions) {
          return userPermissions.includes(item.id);
        }
        return item.requiredPermissions.some(p => userPermissions.includes(p));
      });

      if (pathname === '/dashboard' && firstAllowedPage) {
        window.location.replace(firstAllowedPage.href);
      }
    }
  }, [user, isUserLoading, isCheckingPermissions, userPermissions, pathname]);

  if (isUserLoading || isCheckingPermissions) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && pathname !== '/login') {
      return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
      <div className="flex h-screen w-full bg-muted/40">
        {pathname !== '/login' && <DashboardNav />}
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <PermissionProvider>
        <LayoutAuthWrapper>
          {children}
        </LayoutAuthWrapper>
      </PermissionProvider>
  );
}
