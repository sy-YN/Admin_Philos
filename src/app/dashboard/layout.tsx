
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
  Palette,
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
import { useBranding } from '@/context/BrandingProvider';
import { DynamicIcon } from '@/components/philosophy/dynamic-icon';


type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: React.FC<any>;
  requiredPermissions?: string[];
  children?: Omit<NavItem, 'icon' | 'children'>[];
};

const allNavItems: NavItem[] = [
  { href: '/dashboard/members', label: 'メンバー管理', icon: Users, id: 'members', requiredPermissions: ['members'] },
  { href: '/dashboard/organization', label: '組織管理', icon: Network, id: 'organization', requiredPermissions: ['organization'] },
  { href: '/dashboard/permissions', label: '権限管理', icon: Shield, id: 'permissions', requiredPermissions: ['permissions'] },
  { href: '/dashboard/appearance', label: '外観設定', icon: Palette, id: 'appearance', requiredPermissions: ['appearance_management'] },
  {
    href: '/dashboard/contents',
    label: 'コンテンツ管理',
    icon: Film,
    id: 'contents',
    requiredPermissions: ['video_management', 'message_management', 'proxy_post_video', 'proxy_post_message', 'tag_management'],
    children: [
      { href: '/dashboard/contents?tab=videos', label: 'ビデオ管理', id: 'video_management', requiredPermissions: ['video_management', 'proxy_post_video'] },
      { href: '/dashboard/contents?tab=messages', label: 'メッセージ管理', id: 'message_management', requiredPermissions: ['message_management', 'proxy_post_message'] },
    ],
  },
  { href: '/dashboard/philosophy', label: '理念管理', icon: BookOpen, id: 'philosophy', requiredPermissions: ['philosophy'] },
  {
    href: '/dashboard/calendar',
    label: 'カレンダー設定',
    icon: CalendarDays,
    id: 'calendar',
    requiredPermissions: ['calendar'],
    children: [
        { href: '/dashboard/calendar?tab=daily', label: '日替わりメッセージ', id: 'calendar', requiredPermissions: ['calendar'] },
        { href: '/dashboard/calendar?tab=scheduled', label: '期間指定メッセージ', id: 'calendar', requiredPermissions: ['calendar'] },
    ]
  },
  {
    href: '/dashboard/dashboard',
    label: '目標設定',
    icon: BarChart3,
    id: 'dashboard',
    requiredPermissions: ['company_goal_setting', 'org_personal_goal_setting'],
    children: [
        { href: '/dashboard/dashboard?tab=company', label: '会社単位', id: 'company_goal_setting', requiredPermissions: ['company_goal_setting'] },
        { href: '/dashboard/dashboard?tab=team', label: '組織単位', id: 'org_personal_goal_setting', requiredPermissions: ['org_personal_goal_setting'] },
        { href: '/dashboard/dashboard?tab=personal', label: '個人単位', id: 'org_personal_goal_setting', requiredPermissions: ['org_personal_goal_setting'] },
    ]
  },
  { href: '/dashboard/ranking', label: 'ランキング設定', icon: Trophy, id: 'ranking', requiredPermissions: ['ranking'] },
];

function hasRequiredPermissions(userPerms: string[], requiredPerms: string[] | undefined): boolean {
    if (!requiredPerms || requiredPerms.length === 0) {
        return true;
    }
    return requiredPerms.some(p => userPerms.includes(p));
}

function DashboardNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const auth = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { userPermissions } = usePermissions();
  const { settings: brandingSettings } = useBranding();


  const activeTab = searchParams.get('tab');

  const navItems = useMemo(() => {
    return allNavItems.filter(item => hasRequiredPermissions(userPermissions, item.requiredPermissions));
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
            <DynamicIcon name={brandingSettings.logoIcon} className="h-6 w-6 text-primary" />
            {!isCollapsed && <span className="">{brandingSettings.appName} Admin</span>}
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
                                .filter(child => hasRequiredPermissions(userPermissions, child.requiredPermissions))
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
                          'flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:no-underline hover:text-primary',
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
                                .filter(child => hasRequiredPermissions(userPermissions, child.requiredPermissions))
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
    if (isUserLoading) {
      return;
    }

    if (!user) {
      if (pathname !== '/login') {
        window.location.replace('/login');
      }
      return;
    }

    if (isCheckingPermissions) {
        return;
    }
    
    const managementPermissions = userPermissions.filter(p => p !== 'can_comment');

    if (managementPermissions.length === 0) {
      useAuth().signOut().then(() => {
        window.location.replace('/login');
      });
    } else if (pathname === '/dashboard' || pathname === '/') {
      const firstAllowedPage = allNavItems.find(item => hasRequiredPermissions(userPermissions, item.requiredPermissions));
      
      if (firstAllowedPage) {
        window.location.replace(firstAllowedPage.href);
      } else {
      }
    }
  }, [user, isUserLoading, isCheckingPermissions, userPermissions, pathname]);

  if (isUserLoading || isCheckingPermissions) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">権限を確認しています...</p>
      </div>
    );
  }
  
  if (!user && pathname !== '/login') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">リダイレクトしています...</p>
      </div>
    );
  }

  // Render children only when auth and permission checks are fully complete
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
