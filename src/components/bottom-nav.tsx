
import { Button } from "@/components/ui/button";
import { Home, BookOpen, BarChart3, Trophy, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type BottomNavProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

const navItems = [
  { id: 'home', label: 'ホーム', icon: Home },
  { id: 'philosophy', label: '理念', icon: BookOpen },
  { id: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
  { id: 'ranking', label: 'ランキング', icon: Trophy },
  { id: 'other', label: 'その他', icon: MoreHorizontal },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bg-card/80 backdrop-blur-sm border-t border-border/50 px-2 py-1 z-20 shrink-0">
      <div className="flex items-center justify-around max-w-2xl mx-auto">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "secondary" : "ghost"}
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-lg"
            onClick={() => onTabChange(item.id)}
          >
            <item.icon className={cn("h-5 w-5", activeTab !== item.id && "text-foreground/80")} />
            <span className={cn("text-xs font-medium", activeTab !== item.id && "text-foreground/80")}>{item.label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}
