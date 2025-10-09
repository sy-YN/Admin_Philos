
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  const handleStart = () => {
    setIsExiting(true);
    setTimeout(() => {
      router.push('/calendar');
    }, 500);
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background">
      <div
          className={cn(
              "relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background text-foreground transition-all duration-500 ease-in-out",
              isExiting && "scale-95 opacity-0"
          )}
          onClick={handleStart}
          style={{height: '100vh'}}
      >
          <div className="absolute inset-0 z-0">
              <div className="absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-primary/10 blur-3xl animate-pulse-slow"></div>
              <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-accent/10 blur-3xl animate-pulse-slow animation-delay-2000"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center text-center">
              <h1 className="mb-4 font-headline text-6xl font-bold tracking-tighter text-foreground animate-fade-in-down">
              Philos
              </h1>
              <p className="font-body text-lg text-muted-foreground animate-fade-in-up">
              タップで始める
              </p>
          </div>

          <style jsx>{`
              @keyframes fade-in-down {
              0% {
                  opacity: 0;
                  transform: translateY(-20px);
              }
              100% {
                  opacity: 1;
                  transform: translateY(0);
              }
              }
              @keyframes fade-in-up {
              0% {
                  opacity: 0;
                  transform: translateY(20px);
              }
              100% {
                  opacity: 1;
                  transform: translateY(0);
              }
              }
              @keyframes pulse-slow {
                0%, 100% {
                  transform: scale(1);
                  opacity: 0.8;
                }
                50% {
                  transform: scale(1.1);
                  opacity: 1;
                }
              }
              .animate-fade-in-down {
                animation: fade-in-down 0.8s ease-out both;
                animation-delay: 0.2s;
              }
              .animate-fade-in-up {
                animation: fade-in-up 0.8s ease-out both;
                animation-delay: 0.4s;
              }
              .animate-pulse-slow {
                animation: pulse-slow 8s infinite ease-in-out;
              }
              .animation-delay-2000 {
                animation-delay: 2s;
              }
          `}</style>
      </div>
    </main>
  );
}
