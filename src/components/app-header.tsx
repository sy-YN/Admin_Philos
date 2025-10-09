
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type AppHeaderProps = {
  onNotificationClick: () => void;
};

export function AppHeader({ onNotificationClick }: AppHeaderProps) {
  return (
    <header className="bg-background border-b px-4 py-3 flex items-center justify-between shrink-0 z-20">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-10 h-9" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* User avatar can go here */}
      </div>
    </header>
  );
}
