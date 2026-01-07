
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, Timestamp, doc } from 'firebase/firestore';
import { Loader2, Trophy, Crown, Medal, Award, Building, Video as VideoIcon, MessageSquare } from 'lucide-react';
import type { RankingSettings } from '@/types/ranking';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Member } from '@/types/member';
import type { Video } from '@/types/video';
import type { ExecutiveMessage } from '@/types/executive-message';
import type { PersonalGoal } from '@/types/personal-goal';
import type { Organization } from '@/types/organization';
import { subDays, formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';
import { useDoc } from '@/firebase/firestore/use-doc';

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

function RankingList({ category, scope, personalScope }: { category: 'overall' | 'likes' | 'comments' | 'goal_progress'; scope: 'all' | 'department'; personalScope?: 'all' | 'my-department' }) {
    const firestore = useFirestore();
    const { user: currentUser } = useUser();
    
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
            let targetMembers = members;
            
            if (personalScope === 'my-department' && currentUser) {
                const currentUserData = membersMap.get(currentUser.uid);
                if (currentUserData?.organizationId) {
                    targetMembers = members?.filter(m => m.organizationId === currentUserData.organizationId);
                }
            }


            if (scope === 'department') {
                const departmentStats = new Map<string, { totalScore: number, memberCount: number }>();
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
                    const totalScore = likeScore + commentScore + (goalScore / 10);
                    
                    const stats = departmentStats.get(orgId) || { totalScore: 0, memberCount: 0 };
                    stats.totalScore += totalScore;
                    stats.memberCount += 1;
                    departmentStats.set(orgId, stats);
                });

                finalScores = new Map<string, number>();
                departmentStats.forEach((stats, orgId) => {
                    if (stats.memberCount > 0) {
                        finalScores.set(orgId, stats.totalScore / stats.memberCount);
                    }
                });
            } else { // scope === 'all' (personal)
                if (category === 'overall') {
                    const rankPoints = new Map<string, number>();
                    const MAX_POINTS = targetMembers?.length || 50;
                    (Object.keys(individualScores) as Array<keyof ScoreData>).forEach(cat => {
                        const sortedScores = Array.from(individualScores[cat].entries()).sort(([, a], [, b]) => b - a);
                        sortedScores.forEach(([userId], index) => {
                            if (targetMembers?.find(m => m.uid === userId)) {
                                const points = Math.max(0, MAX_POINTS - index);
                                rankPoints.set(userId, (rankPoints.get(userId) || 0) + points);
                            }
                        });
                    });
                    finalScores = rankPoints;
                } else {
                    finalScores = new Map<string, number>();
                    targetMembers?.forEach(member => {
                        const score = individualScores[category].get(member.uid);
                        if (score !== undefined) {
                            finalScores.set(member.uid, score);
                        }
                    })
                }
            }

            const sortedScores = Array.from(finalScores.entries()).sort(([, a], [, b]) => b - a);
            const rankedList: RankItem[] = sortedScores.map(([id, score], index) => {
                 if (scope === 'department') {
                    const org = orgsMap.get(id);
                    return { id, name: org?.name || '不明な部署', score, rank: index + 1 };
                } else {
                    const member = membersMap.get(id);
                    return { id, name: member?.displayName || '不明なユーザー', avatarUrl: member?.avatarUrl, score, rank: index + 1 };
                }
            });

            setRankingData(rankedList);
            setIsCalculating(false);
        };

        processRankings();

    }, [category, scope, personalScope, calculateScores, membersMap, orgsMap, members, currentUser, isLoadingMembers, isLoadingVideos, isLoadingMessages, isLoadingOrgs]);

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
                        <TableCell className="text-right font-mono">{Math.round(item.score).toLocaleString()}{scope === 'department' ? 'pt (平均)' : scoreUnit}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function ContentRankingList({ contentType }: { contentType: 'videos' | 'executiveMessages' }) {
    const firestore = useFirestore();
    const collectionName = contentType;

    const { data: content, isLoading: isLoadingContent } = useCollection<Video | ExecutiveMessage>(
        useMemoFirebase(() => firestore ? query(collection(firestore, collectionName)) : null, [firestore, collectionName])
    );
    
    const sortedContent = useMemo(() => {
        if (!content) return [];
        return [...content].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    }, [content]);

    const getRankIcon = (rank: number) => {
        if (rank === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
        if (rank === 1) return <Medal className="h-5 w-5 text-slate-400" />;
        if (rank === 2) return <Award className="h-5 w-5 text-amber-700" />;
        return <span className="text-sm font-medium w-5 text-center">{rank + 1}</span>;
    }
    
    const safeFormatDistanceToNow = (date: any) => {
        if (!date || typeof date.toDate !== 'function') {
            return '';
        }
        try {
            return formatDistanceToNow(date.toDate(), { addSuffix: true, locale: ja });
        } catch (e) {
            console.error('Date formatting error:', e);
            return '';
        }
    };


    if (isLoadingContent) {
        return (
            <div className="text-center py-10 text-muted-foreground">
               <Loader2 className="mx-auto h-12 w-12 animate-spin mb-4" />
               <p>ランキングを集計中です...</p>
           </div>
       )
   }

   if (sortedContent.length === 0) {
       return (
           <div className="text-center py-10 text-muted-foreground">
               <Trophy className="mx-auto h-12 w-12 mb-4" />
               <p>ランキング対象のコンテンツがありません。</p>
           </div>
       )
   }

   return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[60px]">順位</TableHead>
                    <TableHead>コンテンツ</TableHead>
                    <TableHead>投稿者</TableHead>
                    <TableHead className="hidden md:table-cell">投稿日</TableHead>
                    <TableHead className="text-right">閲覧数</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedContent.map((item, index) => {
                    const dateToShow = (item as Video).uploadedAt || item.createdAt;
                    return (
                        <TableRow key={item.id}>
                            <TableCell>
                                <div className="flex items-center justify-center h-full">
                                    {getRankIcon(index)}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    {contentType === 'videos' && (item as Video).thumbnailUrl && (
                                        <Image src={(item as Video).thumbnailUrl} alt={item.title} width={64} height={36} className="rounded-sm object-cover" />
                                    )}
                                    <span className="font-medium">{item.title}</span>
                                </div>
                            </TableCell>
                            <TableCell>{item.authorName}</TableCell>
                            <TableCell className="hidden md:table-cell">
                                {safeFormatDistanceToNow(dateToShow)}
                            </TableCell>
                            <TableCell className="text-right font-mono">{(item.viewsCount || 0).toLocaleString()}</TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
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
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="personal">個人ランキング</TabsTrigger>
                        <TabsTrigger value="department">部署ランキング</TabsTrigger>
                        <TabsTrigger value="contents">コンテンツランキング</TabsTrigger>
                    </TabsList>
                    <TabsContent value="personal">
                        <Card>
                            <CardHeader>
                                <CardTitle>個人ランキング</CardTitle>
                                <CardDescription>個人の活動に基づいたランキングです。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="all" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="all">全社</TabsTrigger>
                                        <TabsTrigger value="my-department">自部署</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="all">
                                        <RankingList category="overall" scope="all" personalScope="all" />
                                    </TabsContent>
                                    <TabsContent value="my-department">
                                         <RankingList category="overall" scope="all" personalScope="my-department" />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="department">
                         <Card>
                            <CardHeader>
                                <CardTitle>部署ランキング</CardTitle>
                                <CardDescription>部署全体の活動を平均化した総合ランキングです。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RankingList category="overall" scope="department" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="contents">
                        <Card>
                            <CardHeader>
                                <CardTitle>コンテンツランキング</CardTitle>
                                <CardDescription>閲覧数が多いコンテンツのランキングです。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="videos" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="videos"><VideoIcon className="mr-2 h-4 w-4"/>ビデオ</TabsTrigger>
                                        <TabsTrigger value="messages"><MessageSquare className="mr-2 h-4 w-4"/>メッセージ</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="videos">
                                        <ContentRankingList contentType="videos" />
                                    </TabsContent>
                                    <TabsContent value="messages">
                                        <ContentRankingList contentType="executiveMessages" />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}
