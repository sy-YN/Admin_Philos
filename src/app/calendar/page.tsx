
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { valuesItems } from '@/lib/company-philosophy';
import { ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/app-shell';

export default function CalendarPage() {
  const router = useRouter();
  const [today, setToday] = useState(new Date());
  const [currentValue, setCurrentValue] = useState(valuesItems[0]);
  const [likes, setLikes] = useState(111);
  const [isLiked, setIsLiked] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const darkModeValue = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(darkModeValue);
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'darkMode') {
        setIsDarkMode(event.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const date = new Date();
    setToday(date);
    const valueIndex = (date.getDate() - 1) % valuesItems.length;
    setCurrentValue(valuesItems[valueIndex]);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikes(l => isLiked ? l - 1 : l + 1);
  };
  
  const handlePageFlip = () => {
    setIsExiting(true);
    setTimeout(() => router.push('/home'), 700); 
  };

  const dayOfWeek = today.toLocaleDateString('ja-JP', { weekday: 'long' });
  const day = today.getDate();
  const month = today.toLocaleString('en-US', { month: 'long' });
  const year = today.getFullYear();

  return (
    <main className={cn("flex min-h-screen w-full items-center justify-center bg-white dark:bg-background", isDarkMode && 'dark')}>
      <div 
        className="relative h-full w-full flex flex-col items-center justify-center cursor-pointer bg-background"
        onClick={handlePageFlip}
      >
        <div 
          className="relative w-full max-w-sm h-[600px]"
          style={{ perspective: '1000px' }}
        >
          {/* Stacked pages */}
          <div className="absolute inset-0 bg-card rounded-lg shadow-lg rotate-[-4deg]"></div>
          <div className="absolute inset-0 bg-card rounded-lg shadow-lg rotate-[3deg]"></div>

          <div className={cn(
            "absolute inset-0 w-full h-full bg-card rounded-lg shadow-2xl flex flex-col p-8 transition-all duration-700 ease-in-out font-serif",
            isExiting && 'opacity-0 [transform:rotate(-30deg)_translate(100%,-50%)_scale(0.5)]'
          )}
          style={{ transformOrigin: 'bottom left' }}
          >
            {/* Rings */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-4">
              <div className="w-3 h-3 rounded-full bg-muted ring-2 ring-gray-400"></div>
              <div className="w-3 h-3 rounded-full bg-muted ring-2 ring-gray-400"></div>
            </div>

            <header className="text-center pt-8 pb-1 relative z-10">
              <p className="text-lg font-medium text-muted-foreground tracking-widest">{dayOfWeek}</p>
            </header>
            
            <div className="relative -mt-1 h-4 w-full overflow-hidden">
              <svg viewBox="0 0 320 16" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full text-card fill-current">
                <path d="M0 4 Q 5 10, 10 4 Q 15 10, 20 4 Q 25 10, 30 4 Q 35 10, 40 4 Q 45 10, 50 4 Q 55 10, 60 4 Q 65 10, 70 4 Q 75 10, 80 4 Q 85 10, 90 4 Q 95 10, 100 4 Q 105 10, 110 4 Q 115 10, 120 4 Q 125 10, 130 4 Q 135 10, 140 4 Q 145 10, 150 4 Q 155 10, 160 4 Q 165 10, 170 4 Q 175 10, 180 4 Q 185 10, 190 4 Q 195 10, 200 4 Q 205 10, 210 4 Q 215 10, 220 4 Q 225 10, 230 4 Q 235 10, 240 4 Q 245 10, 250 4 Q 255 10, 260 4 Q 265 10, 270 4 Q 275 10, 280 4 Q 285 10, 290 4 Q 295 10, 300 4 Q 305 10, 310 4 Q 315 10, 320 4 L 320 0 L 0 0 Z" />
              </svg>
            </div>


            <main className="flex-1 flex flex-col items-center justify-center text-center bg-card z-0 pt-4">
              <p className="text-8xl font-bold text-foreground tracking-tighter">{day}</p>
              <p className="text-2xl font-medium text-muted-foreground -mt-2">{month}, {year}</p>
              
              <div className="my-10">
                <p className="text-sm font-medium text-muted-foreground mb-2">理念</p>
                <h1 className="text-4xl font-bold text-foreground mb-3 leading-snug">
                  {currentValue.title}
                </h1>
                <p className="text-base text-muted-foreground px-4 leading-relaxed">
                  〜{currentValue.content}〜
                </p>
              </div>
            </main>

            <footer className="text-center bg-card pb-4">
              <div className="flex flex-col items-center gap-2">
                <button onClick={handleLike} className="transition-transform transform active:scale-125">
                  <ThumbsUp className={cn("h-8 w-8 text-muted-foreground", isLiked && "fill-primary text-primary")} />
                </button>
                <span className="text-lg font-bold text-muted-foreground">{likes}</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
