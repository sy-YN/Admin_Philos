
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LucideIcon, Heart, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, query, Timestamp, doc, getDoc, getDocs, writeBatch, orderBy, where, limit } from 'firebase/firestore';
import * as LucideIcons from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { isToday, startOfDay, format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';

type Message = {
  id: string;
  title: string;
  content: string;
  icon: string;
  authorName?: string;
};

type CalendarMessage = Message & {
  order: number;
};

type FixedCalendarMessage = Message & {
  startDate: Timestamp;
  endDate: Timestamp;
  order: number;
};

type Settings = {
  dailyLoopCounter: number;
  lastUpdatedDate?: Timestamp;
};

const getIcon = (name: string): LucideIcon => {
  const Icon = (LucideIcons as any)[name];
  return Icon || LucideIcons.HelpCircle;
};

export default function CalendarPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [today] = useState(new Date());

  const [displayItem, setDisplayItem] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);

  const [isFlipping, setIsFlipping] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [likes, setLikes] = useState(111);
  const [isLiked, setIsLiked] = useState(false);
  
  useEffect(() => {
    const handleDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    handleDarkMode(); // Initial check
    const observer = new MutationObserver(handleDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!firestore) {
      setLoading(true);
      return;
    };
    
    const fetchDailyContent = async () => {
      const settingsRef = doc(firestore, 'settings', 'calendarDisplay');
      const settingsSnap = await getDoc(settingsRef);
      
      if (!settingsSnap.exists()) {
        console.warn("Settings document 'calendarDisplay' not found!");
        const fallbackQuery = query(collection(firestore, 'calendarMessages'), orderBy('order'), limit(1));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        if(!fallbackSnapshot.empty) {
            const fallbackMessage = { id: fallbackSnapshot.docs[0].id, ...fallbackSnapshot.docs[0].data() } as CalendarMessage;
            setDisplayItem(fallbackMessage);
        } else {
            setDisplayItem(null);
        }
        setLoading(false);
        return;
      }

      let settings = settingsSnap.data() as Settings;
      let currentCounter = settings.dailyLoopCounter;

      const lastUpdated = settings.lastUpdatedDate?.toDate();
      if (!lastUpdated || !isToday(lastUpdated)) {
        const dailyMessagesQuery = query(collection(firestore, 'calendarMessages'));
        const dailyMessagesSnap = await getDocs(dailyMessagesQuery);
        const totalMessages = dailyMessagesSnap.size;

        if (totalMessages > 0) {
          const newCounter = (currentCounter + 1);
          try {
            const batch = writeBatch(firestore);
            batch.update(settingsRef, {
              dailyLoopCounter: newCounter,
              lastUpdatedDate: Timestamp.now(),
            });
            await batch.commit();
            currentCounter = newCounter;
          } catch (error) {
            console.error("Error updating counter:", error);
          }
        }
      }
      
      const messagesSnapshot = await getDocs(query(collection(firestore, 'calendarMessages'), orderBy('order')));
      if(!messagesSnapshot.empty) {
        const messageToShow = messagesSnapshot.docs[currentCounter % messagesSnapshot.size];
        const dailyMessage = { id: messageToShow.id, ...messageToShow.data() } as CalendarMessage;
        setDisplayItem(dailyMessage);
      } else {
        setDisplayItem(null);
      }
      
      setLoading(false);
    };

    const fetchContent = async () => {
      setLoading(true);

      const todayStart = startOfDay(today);
      const fixedQuery = query(
        collection(firestore, 'fixedCalendarMessages'),
        where('startDate', '<=', today),
        orderBy('startDate', 'desc')
      );
      
      const fixedSnapshot = await getDocs(fixedQuery);
      let activeFixedMessages: (FixedCalendarMessage)[] = [];
      
      if (!fixedSnapshot.empty) {
        for (const doc of fixedSnapshot.docs) {
          const msg = { id: doc.id, ...doc.data() } as FixedCalendarMessage;
          if (msg.endDate.toDate() >= todayStart) {
            activeFixedMessages.push(msg);
          }
        }
      }
      
      if (activeFixedMessages.length > 0) {
        // Sort by order (lower is higher priority)
        activeFixedMessages.sort((a, b) => a.order - b.order);
        setDisplayItem(activeFixedMessages[0]);
        setLoading(false);
      } else {
        await fetchDailyContent();
      }
    };

    fetchContent();
  }, [firestore, today]);

  const handlePageFlip = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 700);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikes(l => isLiked ? l - 1 : l + 1);
  };

  const formattedDate = format(today, 'yyyy年M月d日 (E)', { locale: ja });
  
  const RenderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4 text-center">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-24 mx-auto mt-2" />
        </div>
      );
    }

    if (!displayItem) {
       return <div className="text-center text-muted-foreground">表示するコンテンツがありません。</div>;
    }

    const IconComponent = getIcon(displayItem.icon);
    return (
      <>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <IconComponent className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground leading-snug">
                {displayItem.title}
            </h1>
          </div>
          <div
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: displayItem.content }}
          />
        </div>
        <div className="mt-6 w-full flex justify-between items-center text-xs text-muted-foreground">
          {displayItem.authorName ? (
             <p>作成者: {displayItem.authorName}</p>
           ) : <div />}
           <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleLike}>
                    <Heart className={cn("h-5 w-5 text-muted-foreground", isLiked && "fill-primary text-primary")} />
                </Button>
                <span className="font-semibold text-sm">{likes}</span>
            </div>
        </div>
      </>
    );
  }

  return (
    <main
      className={cn(
        'flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 gap-4',
        isDarkMode && 'dark'
      )}
    >
      <div className="phone-bezel">
        <div className="phone-screen">
          <div 
            className="relative h-full w-full flex flex-col items-center justify-center cursor-pointer bg-background"
            onClick={handlePageFlip}
          >
            <div 
              className="relative w-full max-w-sm h-[600px]"
              style={{ perspective: '1000px' }}
            >
              <div className="absolute inset-0 bg-card rounded-lg shadow-lg rotate-[-2deg] opacity-70"></div>
              <div
                className={cn(
                  "absolute inset-0 w-full h-full bg-card rounded-lg shadow-2xl flex flex-col p-8 font-serif",
                  isFlipping && 'page-flip-right',
                )}
              >
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-4">
                  <div className="w-3 h-3 rounded-full bg-muted ring-2 ring-gray-400"></div>
                  <div className="w-3 h-3 rounded-full bg-muted ring-2 ring-gray-400"></div>
                </div>

                <header className="text-center pt-8 pb-1 relative z-10">
                   <p className="text-lg font-medium text-muted-foreground tracking-widest">{formattedDate}</p>
                </header>
                
                <div className="relative -mt-1 h-4 w-full overflow-hidden">
                  <svg viewBox="0 0 320 16" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full text-card fill-current">
                    <path d="M0 4 Q 5 10, 10 4 Q 15 10, 20 4 Q 25 10, 30 4 Q 35 10, 40 4 Q 45 10, 50 4 Q 55 10, 60 4 Q 65 10, 70 4 Q 75 10, 80 4 Q 85 10, 90 4 Q 95 10, 100 4 Q 105 10, 110 4 Q 115 10, 120 4 Q 125 10, 130 4 Q 135 10, 140 4 Q 145 10, 150 4 Q 155 10, 160 4 Q 165 10, 170 4 Q 175 10, 180 4 Q 185 10, 190 4 Q 195 10, 200 4 Q 205 10, 210 4 Q 215 10, 220 4 Q 225 10, 230 4 Q 235 10, 240 4 Q 245 10, 250 4 Q 255 10, 260 4 Q 265 10, 270 4 Q 275 10, 280 4 Q 285 10, 290 4 Q 295 10, 300 4 Q 305 10, 310 4 Q 315 10, 320 4 L 320 0 L 0 0 Z" />
                  </svg>
                </div>

                <main className="flex-1 flex flex-col items-center justify-start text-center bg-card z-0 pt-8">
                  <div className="w-full">
                     <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
                        今日の行動指針
                     </p>
                    <RenderContent />
                  </div>
                </main>
                
                <footer className="h-10 text-center bg-card pb-4">
                    <div className="absolute bottom-6 text-xs text-muted-foreground animate-pulse w-full text-center">
                          タップして進む
                    </div>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
