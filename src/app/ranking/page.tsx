
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Trophy, Crown, Medal, Award } from 'lucide-react';
import type { RankingSettings } from '@/types/ranking';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


function RankingList({ category, scope }: { category: string; scope: 'all' | 'my-department' | 'department' }) {
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
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    
    const settingsRef = useMemoFirebase(() => 
        firestore ? doc(firestore, 'settings', 'ranking') : null
    , [firestore]);
    const { data: settings, isLoading: isLoadingSettings } = useDoc<RankingSettings>(settingsRef);

    const isLoading = isUserLoading || isLoadingSettings;

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const getPeriodText = () => {
        if (!settings) return '';
        switch (settings.period) {
            case 'monthly': return '月間';
            case 'quarterly': return '四半期';
            case 'yearly': return '年間';
            default: return '';
        }
    }

    return (
        <main className="flex min-h-screen w-full flex-col items-center p-4 md:p-8 bg-muted/40">
            <div className="w-full max-w-6xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">ランキング</h1>
                    <p className="text-muted-foreground mt-2">
                        エンゲージメントと目標達成のトップランナーを見てみよう！
                        ({getPeriodText()}集計)
                    </p>
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
                                <CardDescription>個人の活動に基づいたランキングです。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="overall" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="all">全社</TabsTrigger>
                                        <TabsTrigger value="my-department">自部署</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="all">
                                        <RankingList category="overall" scope="all" />
                                    </TabsContent>
                                    <TabsContent value="my-department">
                                         <RankingList category="overall" scope="my-department" />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="department">
                         <Card>
                            <CardHeader>
                                <CardTitle>部署ランキング</CardTitle>
                                <CardDescription>部署全体の活動に基づいたランキングです。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RankingList category="overall" scope="department" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}
