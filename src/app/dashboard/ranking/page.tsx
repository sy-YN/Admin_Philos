
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Loader2, Trophy, Crown, Medal, Award } from 'lucide-react';
import type { RankingResult } from '@/types/ranking';
import type { Member } from '@/types/member';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


function RankingList({ category, scope }: { category: string; scope: 'all' | 'department' }) {
    // This is a placeholder. In a real implementation, you would fetch
    // data based on the category and scope props.
    // For now, we show a placeholder message.
    
    // Example data structure
    const sampleRanks = [
        { rank: 1, userId: 'user1', userName: '山田 太郎', avatarUrl: 'https://picsum.photos/seed/user1/40/40', score: 1250 },
        { rank: 2, userId: 'user2', userName: '佐藤 花子', avatarUrl: 'https://picsum.photos/seed/user2/40/40', score: 1100 },
        { rank: 3, userId: 'user3', userName: '鈴木 一郎', avatarUrl: 'https://picsum.photos/seed/user3/40/40', score: 980 },
        { rank: 4, userId: 'user4', userName: '田中 美咲', avatarUrl: 'https://picsum.photos/seed/user4/40/40', score: 950 },
        { rank: 5, userId: 'user5', userName: '高橋 健太', avatarUrl: 'https://picsum.photos/seed/user5/40/40', score: 820 },
    ];
    
    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
        if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
        return <span className="text-sm font-medium w-5 text-center">{rank}</span>;
    }

    // For now, we will just display a placeholder message
    // as the ranking calculation logic is not yet implemented.
    if (true) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <Trophy className="mx-auto h-12 w-12 mb-4" />
                <p>ランキングデータは現在集計中です。</p>
                <p className="text-sm">集計が完了すると、ここにランキングが表示されます。</p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[60px]">順位</TableHead>
                    <TableHead>メンバー</TableHead>
                    <TableHead className="text-right">スコア</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sampleRanks.map(item => (
                    <TableRow key={item.userId}>
                        <TableCell>
                            <div className="flex items-center justify-center h-full">
                               {getRankIcon(item.rank)}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={item.avatarUrl} />
                                    <AvatarFallback>{item.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{item.userName}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{item.score.toLocaleString()} pt</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export default function RankingPage() {
    const { user, isUserLoading } = useUser();
    
    const isLoading = isUserLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
  
    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">ランキング閲覧</h1>
            </div>
            
            <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="personal">個人ランキング</TabsTrigger>
                    <TabsTrigger value="department">部署ランキング</TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal">
                    <Card>
                        <CardHeader>
                            <CardTitle>個人ランキング</CardTitle>
                            <CardDescription>個人のエンゲージメント活動に基づいたランキングです。</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Tabs defaultValue="overall" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="overall">総合</TabsTrigger>
                                    <TabsTrigger value="likes">いいね数</TabsTrigger>
                                    <TabsTrigger value="comments">コメント数</TabsTrigger>
                                    <TabsTrigger value="goal_progress">目標達成</TabsTrigger>
                                </TabsList>
                                <TabsContent value="overall">
                                    <RankingList category="overall" scope="all" />
                                </TabsContent>
                                 <TabsContent value="likes">
                                    <RankingList category="likes" scope="all" />
                                </TabsContent>
                                 <TabsContent value="comments">
                                    <RankingList category="comments" scope="all" />
                                </TabsContent>
                                <TabsContent value="goal_progress">
                                    <RankingList category="goal_progress" scope="all" />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="department">
                    <Card>
                        <CardHeader>
                            <CardTitle>部署ランキング</CardTitle>
                            <CardDescription>部署ごとの活動量に基づいたランキングです。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RankingList category="overall" scope="department" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
