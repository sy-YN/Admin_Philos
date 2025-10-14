
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Users, Film, BookOpen, BarChart3, Trophy, LogOut, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import type { Member } from '@/types/member';

const navItems = [
  { href: '/dashboard/members', label: 'メンバー管理', icon: Users },
  { href: '/dashboard/contents', label: 'コンテンツ管理', icon: Film },
  { href: '/dashboard/philosophy', label: '理念管理', icon: BookOpen },
  { href: '/dashboard/dashboard', label: 'ダッシュボード設定', icon: BarChart3 },
  { href: '/dashboard/ranking', label: 'ランキング設定', icon: Trophy },
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
  const [isAuthorized, setIsAuthorized] = useState(false); // New state to track authorization

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until Firebase auth state is loaded
    }

    if (!user) {
      router.replace('/login'); // No user, redirect to login
      return;
    }

    if (!firestore) {
      // Firestore might not be ready, handle this case if necessary
      return;
    }

    // Check user role in Firestore
    const userDocRef = doc(firestore, 'users', user.uid);
    getDoc(userDocRef).then(userDoc => {
      if (userDoc.exists() && (userDoc.data() as Member).role === 'admin') {
        setIsAuthorized(true); // User is an admin, grant access
      } else {
        // Not an admin or doc doesn't exist, sign out and redirect
        auth.signOut().then(() => {
          router.replace('/login');
        });
      }
    }).catch(() => {
      // Error fetching document, sign out and redirect
      auth.signOut().then(() => {
        router.replace('/login');
      });
    });

  }, [user, isUserLoading, router, firestore, auth]);

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
    router.push('/login');
  };

  // While checking auth or authorization, show a loader
  if (isUserLoading || !isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If authorized, render the dashboard
  return (
    <TooltipProvider>
      <div className={cn(
        "grid min-h-screen w-full transition-all duration-300",
        isCollapsed ? "md:grid-cols-[80px_1fr]" : "md:grid-cols-[280px_1fr]"
        )}>
        <div className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
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
            <div className="flex-1">
              <nav className={cn(
                "grid items-start text-sm font-medium transition-all duration-300",
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
            </div>
            <div className={cn(
              "mt-auto p-4 transition-all duration-300",
              isCollapsed && "p-2"
              )}>
              <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                     <Button 
                        size="icon" 
                        className={cn("w-full", !isCollapsed && "w-full")}
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
          </div>
        </div>
        <div className="flex flex-col">
          {/* Mobile Header will go here */}
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
