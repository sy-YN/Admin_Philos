
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { AppHeader } from '@/components/app-header';
import { BottomNav } from '@/components/bottom-nav';
import { NotificationPanel, type Notification } from '@/components/notification-panel';
import { HomeTab } from '@/components/tabs/home-tab';
import { PhilosophyTab } from '@/components/tabs/philosophy-tab';
import { DashboardTab } from '@/components/tabs/dashboard-tab';
import { RankingTab } from '@/components/tabs/ranking-tab';
import { OtherTab } from '@/components/tabs/other-tab';
import { PastGoalsTab } from '@/components/tabs/past-goals-tab';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const notifications: Notification[] = [
  { id: 1, title: '新しい経営陣メッセージ', message: '第4四半期の目標について', time: '5分前', fullContent: '社員の皆様、CEOの田中です。第4四半期に向けて、私たちは「顧客満足度の向上」と「新市場への展開」という2つの大きな目標を掲げます。皆様の協力が不可欠です。詳細は添付資料をご確認ください。' },
  { id: 2, title: '掲示板の更新', message: '新しい投稿があります', time: '15分前', fullContent: '山田さんが「新製品アイデア募集」という投稿をしました。素晴らしいアイデアだと思いますので、ぜひご覧いただき、コメントで議論を深めてください。' },
  { id: 3, title: 'ダッシュボード更新', message: '週間レポートの準備ができました', time: '1時間前', fullContent: '先週の全部門のパフォーマンスをまとめた週間レポートが確認可能になりました。各自、目標達成率や進捗を確認してください。' },
];

export default function EmpowerUApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showPastGoals, setShowPastGoals] = useState(false);
  const [pastGoalsDepartment, setPastGoalsDepartment] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // This component can be mounted on the client side, so we can check localStorage.
    const darkModeValue = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(darkModeValue);
    
    // Listen for changes from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'darkMode') {
        setIsDarkMode(event.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleNotificationSelect = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowNotifications(false);
  };

  const handleShowPastGoals = (department: string) => {
    setPastGoalsDepartment(department);
    setShowPastGoals(true);
  };

  const handleHidePastGoals = () => {
    setShowPastGoals(false);
  };

  const renderContent = () => {
    const tabs: { [key: string]: JSX.Element } = {
      home: <HomeTab isDarkMode={isDarkMode} />,
      philosophy: <PhilosophyTab />,
      dashboard: <DashboardTab onShowPastGoals={handleShowPastGoals} />,
      ranking: <RankingTab />,
      other: <OtherTab />,
    };

    return (
      <>
        {Object.entries(tabs).map(([tabId, content]) => (
          <div key={tabId} style={{ display: activeTab === tabId && !showPastGoals ? 'block' : 'none' }} className="h-full">
            {content}
          </div>
        ))}
      </>
    );
  };

  return (
    <div className={cn("mx-auto h-full", isDarkMode && 'dark')}>
      <AppShell>
        <AppHeader
          notificationCount={notifications.length}
          onNotificationClick={() => setShowNotifications(!showNotifications)}
        />

        <NotificationPanel
          isOpen={showNotifications}
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onNotificationSelect={handleNotificationSelect}
        />

        <Dialog open={!!selectedNotification} onOpenChange={(isOpen) => !isOpen && setSelectedNotification(null)}>
          <DialogContent className={cn("max-w-md", isDarkMode && 'dark')}>
            {selectedNotification && (
              <>
                <DialogHeader>
                  <DialogTitle className="dark:text-white">{selectedNotification.title}</DialogTitle>
                  <DialogDescription>{selectedNotification.time}</DialogDescription>
                </DialogHeader>
                <div className="text-sm text-muted-foreground dark:text-gray-300 max-h-[60vh] overflow-y-auto">
                  <p>{selectedNotification.fullContent}</p>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>


        <main
          className="flex-1 relative overflow-hidden"
          onClick={() => showNotifications && setShowNotifications(false)}
        >
          {renderContent()}
          <PastGoalsTab 
            show={showPastGoals} 
            departmentName={pastGoalsDepartment} 
            onNavigateBack={handleHidePastGoals} 
          />
        </main>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </AppShell>
    </div>
  );
}
