
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Share2, Trash2, Calendar as CalendarIcon, Flag, Repeat, Info, CheckCircle2, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PersonalGoal } from '@/types/personal-goal';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface PersonalGoalCardProps {
    goal: PersonalGoal;
}

export function PersonalGoalCard({ goal }: PersonalGoalCardProps) {
  const { title, startDate, endDate, progress, status } = goal;

  const getStatusColor = () => {
    switch (status) {
      case '達成済':
        return 'text-green-500';
      case '未達成':
        return 'text-red-500';
      default: // 進行中
        if (progress > 80) return 'text-blue-500';
        if (progress > 50) return 'text-sky-500';
        return 'text-yellow-500';
    }
  };

  const getBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case '達成済': return "default";
        case '未達成': return "destructive";
        default: return "secondary";
    }
  }

  const statusColor = getStatusColor();
  const StatusIcon = status === '達成済' ? CheckCircle2 : status === '未達成' ? XCircle : null;
  
  const formattedStartDate = startDate ? format(startDate.toDate(), 'yyyy/MM/dd', { locale: ja }) : 'N/A';
  const formattedEndDate = endDate ? format(endDate.toDate(), 'yyyy/MM/dd', { locale: ja }) : 'N/A';


  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between">
        <div className="flex flex-col space-y-1.5">
          <CardTitle className="text-lg font-bold">個人目標</CardTitle>
          <CardDescription>あなたの個人目標の進捗です。</CardDescription>
        </div>
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
                className={cn("stroke-current", statusColor)}
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
              <span className="text-3xl font-bold text-foreground">{progress}%</span>
              <span className="text-xs text-muted-foreground">進捗</span>
            </div>
          </div>
          <div className="text-center">
             <div className="flex items-center justify-center gap-2">
                {StatusIcon && <StatusIcon className={cn("h-5 w-5", statusColor)} />}
                <p className="font-semibold text-foreground text-lg">{title}</p>
            </div>
            <Badge variant={getBadgeVariant()} className="mt-1">{status}</Badge>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-4 w-4" />
            <span>期間: {formattedStartDate} ~ {formattedEndDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <Flag className="h-4 w-4" />
            <span>ステータス: {status}</span>
          </div>
          <div className="flex items-center gap-3">
            <Repeat className="h-4 w-4" />
            <span>最終更新: 3日前</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4">
        {status === '進行中' && (
          <>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
              目標を保存してメッセージを生成！
            </Button>
            <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                メッセージは、あなたの目標達成に向けたポジティブな言葉や、次にとるべきアクションのヒントをAIが提案します。
              </p>
            </div>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
