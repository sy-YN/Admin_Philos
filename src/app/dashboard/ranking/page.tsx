
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { Loader2, Trophy, Crown, Medal, Award, Building } from 'lucide-react';
import type { Member } from '@/types/member';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Video } from '@/types/video';
import type { ExecutiveMessage } from '@/types/executive-message';
import type { PersonalGoal } from '@/types/personal-goal';
import type { Organization } from '@/types/organization';
import { subDays } from 'date-fns';

type RankItem = {
    id: string; // userId or organizationId
    name: string;
    avatarUrl?: string;
    score: number;
    rank: number;
};

type ScoreData = {
    likes: Map<string, number>;
    comments: Map<string, number>;
    goal_progress: Map<string, number>;
};

function RankingList({ category, scope }: { category: 'overall' | 'likes' | 'comments' | 'goal_progress'; scope: 'all' | 'department' }) {
    const firestore = useFirestore();
    
    const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]));
    const { data: videos, isLoading: isLoadingVideos } = useCollection<Video>(useMemoFirebase(() => firestore ? query(collection(firestore, 'videos')) : null, [firestore]));
    const { data: messages, isLoading: isLoadingMessages } = useCollection<ExecutiveMessage>(useMemoFirebase(() => firestore ? query(collection(firestore, 'executiveMessages')) : null, [firestore]));
    const { data: organizations, isLoading: isLoadingOrgs } = useCollection<Organization>(useMemoFirebase(() => firestore ? query(collection(firestore, 'organizations')) : null, [firestore]));

    const [rankingData, setRankingData] = useState<RankItem[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    const membersMap = useMemo(() => new Map(members?.map(m => [m.uid, m])), [members]);
    const orgsMap = useMemo(() => new Map(organizations?.map(o => [o.id, o])), [organizations]);

    const calculateScores = useCallback(async () => {
        if (!firestore || !members || !videos || !messages) {
            return null;
        }

        const scores: ScoreData = {
            likes: new Map(),
            comments: new Map(),
            goal_progress: new Map(),
        };

        const thirtyDaysAgo = subDays(new Date(), 30);

        // Likes & Comments
        const allContent = [...(videos || []), ...(messages || [])];
        for (const content of allContent) {
            const collectionName = 'src' in content ? 'videos' : 'executiveMessages';
            const [likesSnapshot, commentsSnapshot] = await Promise.all([
                getDocs(collection(firestore, collectionName, content.id, 'likes')),
                getDocs(collection(firestore, collectionName, content.id, 'comments'))
            ]);
            likesSnapshot.forEach(likeDoc => {
                const userId = likeDoc.id;
                scores.likes.set(userId, (scores.likes.get(userId) || 0) + 1);
            });
            commentsSnapshot.forEach(commentDoc => {
                const authorId = commentDoc.data().authorId;
                if (authorId) {
                    scores.comments.set(authorId, (scores.comments.get(authorId) || 0) + 1);
                }
            });
        }

        // Goal Progress
        for (const member of members) {
            const goalsSnapshot = await getDocs(collection(firestore, 'users', member.uid, 'personalGoals'));
            const completedGoalsInPeriod = goalsSnapshot.docs
                .map(doc => ({ ...doc.data() } as PersonalGoal))
                .filter(goal => 
                    (goal.status === '達成済' || goal.status === '未達成') &&
                    goal.updatedAt?.toDate() >= thirtyDaysAgo
                );

            if (completedGoalsInPeriod.length > 0) {
                const totalProgress = completedGoalsInPeriod.reduce((sum, goal) => sum + goal.progress, 0);
                const averageProgress = totalProgress / completedGoalsInPeriod.length;
                scores.goal_progress.set(member.uid, averageProgress);
            }
        }
        
        return scores;
    }, [firestore, members, videos, messages]);

    useEffect(() => {
        const processRankings = async () => {
            if (isLoadingMembers || isLoadingVideos || isLoadingMessages || isLoadingOrgs) {
                return;
            }
            setIsCalculating(true);

            const individualScores = await calculateScores();
            if (!individualScores) {
                 setIsCalculating(false);
                 return;
            }

            let finalScores: Map<string, number>;

            if (scope === 'department') {
                finalScores = new Map<string, number>();
                if (!members || !orgsMap.size) {
                    setIsCalculating(false);
                    return;
                }

                members.forEach(member => {
                    const orgId = member.organizationId;
                    if (!orgId) return;
                    
                    const likeScore = individualScores.likes.get(member.uid) || 0;
                    const commentScore = individualScores.comments.get(member.uid) || 0;
                    const goalScore = individualScores.goal_progress.get(member.uid) || 0;
                    
                    // Simple sum for department score for now. Could also be rank points.
                    const totalScore = likeScore + commentScore + (goalScore / 10);
                    
                    finalScores.set(orgId, (finalScores.get(orgId) || 0) + totalScore);
                });
            } else { // scope === 'all'
                if (category === 'overall') {
                    const rankPoints = new Map<string, number>();
                    const MAX_POINTS = members?.length || 50;
                    (Object.keys(individualScores) as Array<keyof ScoreData>).forEach(cat => {
                        const sortedScores = Array.from(individualScores[cat].entries()).sort(([, a], [, b]) => b - a);
                        sortedScores.forEach(([userId], index) => {
                            const points = Math.max(0, MAX_POINTS - index);
                            rankPoints.set(userId, (rankPoints.get(userId) || 0) + points);
                        });
                    });
                    finalScores = rankPoints;
                } else {
                    finalScores = individualScores[category];
                }
            }

            const sortedScores = Array.from(finalScores.entries()).sort(([, a], [, b]) => b - a);
            const rankedList: RankItem[] = sortedScores.map(([id, score], index) => {
                 if (scope === 'department') {
                    const org = orgsMap.get(id);
                    return {
                        id,
                        name: org?.name || '不明な部署',
                        score,
                        rank: index + 1
                    };
                } else {
                    const member = membersMap.get(id);
                    return {
                        id,
                        name: member?.displayName || '不明なユーザー',
                        avatarUrl: member?.avatarUrl,
                        score,
                        rank: index + 1,
                    };
                }
            });

            setRankingData(rankedList);
            setIsCalculating(false);
        };

        processRankings();

    }, [category, scope, calculateScores, membersMap, orgsMap, members, isLoadingMembers, isLoadingVideos, isLoadingMessages, isLoadingOrgs]);


    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
        if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
        return <span className="text-sm font-medium w-5 text-center">{rank}</span>;
    }
    
    const isLoading = isCalculating || isLoadingMembers || isLoadingVideos || isLoadingMessages || isLoadingOrgs;

    if (isLoading) {
         return (
             <div className="text-center py-10 text-muted-foreground">
                <Loader2 className="mx-auto h-12 w-12 animate-spin mb-4" />
                <p>ランキングを集計中です...</p>
            </div>
        )
    }

    if (rankingData.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <Trophy className="mx-auto h-12 w-12 mb-4" />
                <p>ランキングデータは現在集計中です。</p>
                <p className="text-sm">集計が完了するか、対象のデータが存在するとここにランキングが表示されます。</p>
            </div>
        )
    }

    const scoreUnit = category === 'goal_progress' ? '%' : 'pt';

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[60px]">順位</TableHead>
                    <TableHead>{scope === 'department' ? '部署' : 'メンバー'}</TableHead>
                    <TableHead className="text-right">スコア</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rankingData.map(item => (
                    <TableRow key={item.id}>
                        <TableCell>
                            <div className="flex items-center justify-center h-full">
                            {getRankIcon(item.rank)}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    {scope === 'department' ? (
                                        <AvatarFallback><Building className="h-4 w-4" /></AvatarFallback>
                                    ) : (
                                        <>
                                            <AvatarImage src={item.avatarUrl} />
                                            <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                                        </>
                                    )}
                                </Avatar>
                                <span className="font-medium">{item.name}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{Math.round(item.score).toLocaleString()}{scoreUnit}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export default function RankingPage() {
    const { isUserLoading } = useUser();
    
    if (isUserLoading) {
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
                            <CardDescription>部署全体の活動を合計した総合ランキングです。</CardDescription>
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
