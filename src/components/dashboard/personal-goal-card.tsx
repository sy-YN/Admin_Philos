
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Share2, Trash2, Calendar as CalendarIcon, Flag, Repeat, Info } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// This is a placeholder component that mimics the UI provided in the image.
// Data is currently hardcoded and not connected to Firestore.

export function PersonalGoalCard() {
  const [progress, setProgress] = useState(65);
  const goal = {
    title: "新規資格を1つ取得する",
    startDate: "2024/08/01",
    endDate: "2025/01/31",
    status: "進行中",
  };

  const progressColor = progress > 80 ? "bg-green-500" : progress > 50 ? "bg-blue-500" : "bg-yellow-500";

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold">個人目標</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              編集
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 className="mr-2 h-4 w-4" />
              共有する
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <svg className="h-32 w-32" viewBox="0 0 100 100">
              <circle
                className="stroke-current text-gray-200 dark:text-gray-700"
                strokeWidth="10"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
              ></circle>
              <circle
                className={`stroke-current ${
                  progress > 80 ? "text-green-500" : progress > 50 ? "text-blue-500" : "text-yellow-500"
                }`}
                strokeWidth="10"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40 * (progress / 100)} ${2 * Math.PI * 40 * (1 - progress / 100)}`}
                strokeDashoffset={`${2 * Math.PI * 40 * 0.25}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{progress}%</span>
              <span className="text-xs text-muted-foreground">進捗</span>
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{goal.title}</p>
            <Badge variant="secondary" className="mt-1">{goal.status}</Badge>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-4 w-4" />
            <span>期間: {goal.startDate} ~ {goal.endDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <Flag className="h-4 w-4" />
            <span>ステータス: {goal.status}</span>
          </div>
          <div className="flex items-center gap-3">
            <Repeat className="h-4 w-4" />
            <span>最終更新: 3日前</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4">
        <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
          目標を保存してメッセージを生成！
        </Button>
        <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            メッセージは、あなたの目標達成に向けたポジティブな言葉や、次にとるべきアクションのヒントをAIが提案します。
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
