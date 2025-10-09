
'use client';

import { Home, BookOpen, BarChart3, Trophy, Settings, HelpCircle, LogOut, Bell, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

type SidebarProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  notificationCount: number;
  onNotificationClick: () => void;
  className?: string;
};

const navItems = [
  { id: 'home', label: 'ホーム', icon: Home },
  { id: 'philosophy', label: '理念', icon: BookOpen },
  { id: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
  { id: 'ranking', label: 'ランキング', icon: Trophy },
];

const bottomNavItems = [
    { id: 'settings', label: '設定', icon: Settings, href: '/settings' },
    { id: 'help', label: 'ヘルプ', icon: HelpCircle, href: '#' },
];

export function Sidebar({ activeTab, onTabChange, notificationCount, onNotificationClick, className }: SidebarProps) {
  const router = useRouter();

  const handleNav = (id: string, href?: string) => {
    if (href) {
      router.push(href);
    } else {
      onTabChange(id);
    }
  }

  return (
    <aside className={cn("w-64 flex-shrink-0 border-r bg-card flex flex-col p-4", className)}>
       <div className="flex items-center gap-2 mb-8 px-2">
        <Building2 className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-bold text-foreground font-headline">Philos</h1>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "secondary" : "ghost"}
            className="w-full justify-start text-base py-6"
            onClick={() => handleNav(item.id)}
          >
            <item.icon className={cn("h-5 w-5 mr-4", activeTab === item.id ? "text-primary" : "text-foreground/80")} />
            <span className={cn("text-base font-medium", activeTab !== item.id && "text-foreground/80")}>{item.label}</span>
          </Button>
        ))}

        <Button
          variant="ghost"
          className="w-full justify-start text-base py-6 relative"
          onClick={onNotificationClick}
        >
          <Bell className="h-5 w-5 mr-4 text-foreground/80" />
          <span className="text-base font-medium text-foreground/80">通知</span>
          {notificationCount > 0 && (
             <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
              {notificationCount}
            </span>
          )}
        </Button>
      </nav>

      <div className="flex flex-col gap-2">
         {bottomNavItems.map((item) => (
            <Button
                key={item.id}
                variant={'ghost'}
                className="w-full justify-start text-base py-6"
                onClick={() => handleNav(item.id, item.href)}
            >
                <item.icon className="h-5 w-5 mr-4 text-foreground/80" />
                <span className="text-base font-medium text-foreground/80">{item.label}</span>
            </Button>
         ))}
        <Button
            variant={'ghost'}
            className="w-full justify-start text-base py-6 text-red-500/80 hover:text-red-500"
        >
            <LogOut className="h-5 w-5 mr-4" />
            <span className="text-base font-medium">ログアウト</span>
        </Button>
      </div>
    </aside>
  );
}
