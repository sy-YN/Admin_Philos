
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Trophy } from 'lucide-react';
import type { RankingSettings } from '@/types/ranking';

// This is a placeholder component for now.
// It will be expanded to show actual ranking data.
function RankingList() {
    return (
        <div className="text-center py-10 text-muted-foreground">
            <Trophy className="mx-auto h-12 w-12 mb-4" />
            <p>ランキングデータは現在集計中です。</p>
            <p className="text-sm">集計が完了すると、ここにランキングが表示されます。</p>
        </div>
    )
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
        <main className="flex min-h-screen w-full flex-col items-center p-4 md:p-8">
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
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="all" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="all">全社</TabsTrigger>
                                        <TabsTrigger value="my-department">自部署</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="all">
                                        <RankingList />
                                    </TabsContent>
                                    <TabsContent value="my-department">
                                        <RankingList />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="department">
                         <Card>
                            <CardHeader>
                                <CardTitle>部署ランキング</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RankingList />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}

