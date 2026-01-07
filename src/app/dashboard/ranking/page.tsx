
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Loader2, Trophy, Crown, Medal, Award } from 'lucide-react';
import type { RankingResult } from '@/types/ranking';
import type { Member } from '@/types/member';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Video } from '@/types/video';
import type { ExecutiveMessage } from '@/types/executive-message';
import type { Like } from '@/types/like';
import type { Comment } from '@/types/comment';

type RankItem = {
    userId: string;
    score: number;
    rank: number;
};

function RankingList({ category, scope }: { category: 'overall' | 'likes' | 'comments' | 'goal_progress'; scope: 'all' | 'department' }) {
    const firestore = useFirestore();
    const { user: currentUser } = useUser();
    
    const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]));
    const { data: videos, isLoading: isLoadingVideos } = useCollection<Video>(useMemoFirebase(() => firestore ? query(collection(firestore, 'videos')) : null, [firestore]));
    const { data: messages, isLoading: isLoadingMessages } = useCollection<ExecutiveMessage>(useMemoFirebase(() => firestore ? query(collection(firestore, 'executiveMessages')) : null, [firestore]));

    const [rankingData, setRankingData] = useState<RankItem[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    const membersMap = useMemo(() => new Map(members?.map(m => [m.uid, m])), [members]);

    useEffect(() => {
        const calculateRankings = async () => {
            if (!firestore || isLoadingMembers || isLoadingVideos || isLoadingMessages) {
                return;
            }
            if (!videos || !messages) {
                setIsCalculating(false);
                return;
            }
            
            setIsCalculating(true);
            
            const userScores = new Map<string, number>();

            if (category === 'likes') {
                const allContent = [...videos, ...messages];
                for (const content of allContent) {
                    const collectionName = 'src' in content ? 'videos' : 'executiveMessages';
                    const likesSnapshot = await getDocs(collection(firestore, collectionName, content.id, 'likes'));
                    likesSnapshot.forEach(likeDoc => {
                        const userId = likeDoc.id; // User ID is the doc ID in 'likes' subcollection
                        userScores.set(userId, (userScores.get(userId) || 0) + 1);
                    });
                }
            } else if (category === 'comments') {
                const allContent = [...videos, ...messages];
                 for (const content of allContent) {
                    const collectionName = 'src' in content ? 'videos' : 'executiveMessages';
                    const commentsSnapshot = await getDocs(collection(firestore, collectionName, content.id, 'comments'));
                    commentsSnapshot.forEach(commentDoc => {
                        const authorId = commentDoc.data().authorId;
                        if (authorId) {
                            userScores.set(authorId, (userScores.get(authorId) || 0) + 1);
                        }
                    });
                }
            }

            const sortedScores = Array.from(userScores.entries())
                .sort(([, a], [, b]) => b - a);

            const rankedList: RankItem[] = sortedScores.map(([userId, score], index) => ({
                userId,
                score,
                rank: index + 1,
            }));
            
            setRankingData(rankedList);
            setIsCalculating(false);
        };

        if(category === 'likes' || category === 'comments') {
            calculateRankings();
        } else {
            setRankingData([]); // Clear for categories not yet implemented
        }

    }, [category, firestore, videos, messages, isLoadingMembers, isLoadingVideos, isLoadingMessages]);


    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
        if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
        return <span className="text-sm font-medium w-5 text-center">{rank}</span>;
    }

    if (isCalculating || isLoadingMembers) {
        return (
             <div className="text-center py-10 text-muted-foreground">
                <Loader2 className="mx-auto h-12 w-12 animate-spin mb-4" />
                <p>ランキングを集計中です...</p>
            </div>
        )
    }

    if (category !== 'likes' && category !== 'comments' || rankingData.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <Trophy className="mx-auto h-12 w-12 mb-4" />
                <p>ランキングデータは現在集計中です。</p>
                <p className="text-sm">集計が完了するか、対象のデータが存在するとここにランキングが表示されます。</p>
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
                {rankingData.map(item => {
                    const member = membersMap.get(item.userId);
                    const userName = member?.displayName || '不明なユーザー';
                    const avatarUrl = member?.avatarUrl;
                    
                    return (
                        <TableRow key={item.userId}>
                            <TableCell>
                                <div className="flex items-center justify-center h-full">
                                {getRankIcon(item.rank)}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={avatarUrl} />
                                        <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{userName}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{item.score.toLocaleString()} pt</TableCell>
                        </TableRow>
                    );
                })}
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
