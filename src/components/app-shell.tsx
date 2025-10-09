
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={cn("w-full h-svh bg-background flex flex-col")}>
      {children}
    </div>
  );
}
