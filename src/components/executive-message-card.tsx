
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Message = {
  id: number;
  author: string;
  avatar: string;
  title: string;
  preview: string;
  time: string;
  priority: 'high' | 'medium';
};

type ExecutiveMessageCardProps = React.HTMLAttributes<HTMLDivElement> & {
  message: Message;
};

export function ExecutiveMessageCard({ message, className, ...props }: ExecutiveMessageCardProps) {
  return (
    <Card className={cn("p-4 cursor-pointer hover:bg-muted/50 transition-colors", className)} {...props}>
      <div className="flex items-start gap-4">
        <Image
          src={message.avatar}
          alt={message.author}
          width={40}
          height={40}
          className="rounded-full"
          data-ai-hint="person portrait"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-card-foreground">{message.author}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{message.time}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={message.priority === "high" ? "destructive" : "secondary"}>
              {message.priority === "high" ? "重要" : "更新"}
            </Badge>
          </div>
          <h3 className="font-medium text-card-foreground mb-1 whitespace-normal">{message.title}</h3>
          <p className="text-sm text-muted-foreground whitespace-normal">{message.preview}</p>
        </div>
      </div>
    </Card>
  );
}
