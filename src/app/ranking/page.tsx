
'use client';

import { Suspense } from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, Timestamp, doc, where } from 'firebase/firestore';
import { Loader2, Trophy, Crown, Medal, Award, Building, Video as VideoIcon, MessageSquare, Eye } from 'lucide-react';
import type { RankingSettings } from '@/types/ranking';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Member } from '@/types/member';
import type { Video } from '@/types/video';
import type { ExecutiveMessage } from '@/types/executive-message';
import type { PersonalGoal } from '@/types/personal-goal';
import type { Organization } from '@/types/organization';
import { formatDistanceToNow, startOfMonth, endOfMonth } from 'date-fns';
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
    views: Map<string, number>;
};

function RankingList({ category, scope, personalScope }: { category: 'overall' | 'likes' | 'comments' | 'views'; scope: 'all' | 'department'; personalScope?: 'all' | 'my-department' }) {
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
            views: new Map(),
        };
        
        const today = new Date();
        const startOfCurrentMonth = startOfMonth(today);
        const endOfCurrentMonth = endOfMonth(today);


        const allContent = [...(videos || []), ...(messages || [])];
        for (const content of allContent) {
            const collectionName = 'src' in content ? 'videos' : 'executiveMessages';
            const [likesSnapshot, commentsSnapshot, viewsSnapshot] = await Promise.all([
                getDocs(query(collection(firestore, collectionName, content.id, 'likes'), where('likedAt', '>=', startOfCurrentMonth), where('likedAt', '<=', endOfCurrentMonth))),
                getDocs(query(collection(firestore, collectionName, content.id, 'comments'), where('createdAt', '>=', startOfCurrentMonth), where('createdAt', '<=', endOfCurrentMonth))),
                getDocs(query(collection(firestore, collectionName, content.id, 'views'), where('viewedAt', '>=', startOfCurrentMonth), where('viewedAt', '<=', endOfCurrentMonth)))
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
            viewsSnapshot.forEach(viewDoc => {
                const userId = viewDoc.id;
                scores.views.set(userId, (scores.views.get(userId) || 0) + 1);
            });
        }
        
        return scores;
    }, [firestore, members, videos, messages]);

    useEffect(() => {
        const processRankings = async () => {
            if (isLoadingMembers || isLoadingVideos || isLoadingMessages || isLoadingOrgs || !members) {
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
            
            const calculateRanks = (scores: Map<string, number>): Map<string, number> => {
                const sortedScores = Array.from(scores.entries()).sort(([, a], [, b]) => b - a);
                const ranks = new Map<string, number>();
                if (sortedScores.length === 0) return ranks;

                let rank = 1;
                ranks.set(sortedScores[0][0], rank);
                for (let i = 1; i < sortedScores.length; i++) {
                    if (sortedScores[i][1] < sortedScores[i - 1][1]) {
                        rank = i + 1; // "1224" ranking
                    }
                    ranks.set(sortedScores[i][0], rank);
                }
                return ranks;
            };

            if (scope === 'department') {
                const departmentStats = new Map<string, { totalScore: number, memberCount: number }>();
                if (!members || !orgsMap.size) {
                    setIsCalculating(false);
                    return;
                }

                const memberRankPoints = new Map<string, number>();
                (['likes', 'comments', 'views'] as Array<keyof ScoreData>).forEach(cat => {
                    const categoryScores = individualScores[cat];
                    const categoryRanks = calculateRanks(categoryScores);

                    categoryRanks.forEach((rank, userId) => {
                        const points = Math.max(1, 50 - (rank - 1));
                        memberRankPoints.set(userId, (memberRankPoints.get(userId) || 0) + points);
                    });
                });

                members.forEach(member => {
                    const orgId = member.organizationId;
                    if (!orgId) return;

                    const totalScoreForMember = memberRankPoints.get(member.uid) || 0;
                    
                    const stats = departmentStats.get(orgId) || { totalScore: 0, memberCount: 0 };
                    stats.totalScore += totalScoreForMember;
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
                    
                    targetMembers?.forEach(member => {
                        rankPoints.set(member.uid, 0);
                    });

                    (['likes', 'comments', 'views'] as Array<keyof ScoreData>).forEach(cat => {
                        const categoryScores = individualScores[cat];
                        const categoryRanks = calculateRanks(categoryScores);
                        
                        categoryRanks.forEach((rank, userId) => {
                            if (targetMembers?.find(m => m.uid === userId)) {
                               const points = Math.max(1, 50 - (rank - 1));
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
                        } else {
                            finalScores.set(member.uid, 0);
                        }
                    })
                }
            }

            const sortedScores = Array.from(finalScores.entries()).sort(([, a], [, b]) => b - a);
            
            const rankedList: RankItem[] = [];
            let currentRank = 1;
            for (let i = 0; i < sortedScores.length; i++) {
                if (i > 0 && sortedScores[i][1] < sortedScores[i-1][1]) {
                    currentRank = i + 1;
                }
                const [id, score] = sortedScores[i];
                
                if (scope === 'department') {
                    const org = orgsMap.get(id);
                    if (org) {
                      rankedList.push({ id, name: org.name, score, rank: currentRank });
                    }
                } else {
                    const member = membersMap.get(id);
                    if (member) {
                      rankedList.push({ id, name: member.displayName, avatarUrl: member.avatarUrl, score, rank: currentRank });
                    }
                }
            }

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

    const scoreUnit = category === 'overall' || scope === 'department' ? 'pt' : '回';

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
                    const dateToShow = 'uploadedAt' in item ? item.uploadedAt : item.createdAt;
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


function RankingPageComponent() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    
    const settingsRef = useMemoFirebase(() => 
        firestore ? doc(firestore, 'settings', 'ranking') : null
    , [firestore]);
    const { data: settings, isLoading: isLoadingSettings } = useDoc<RankingSettings>(settingsRef);

    const searchParams = useSearchParams();
    const [selectedPersonalScope, setSelectedPersonalScope] = useState(searchParams.get('personal_scope') || 'all');
    const [selectedTab, setSelectedTab] = useState(searchParams.get('tab') || 'personal');

    const isLoading = isUserLoading || isLoadingSettings;

    useEffect(() => {
        const tab = searchParams.get('tab');
        if(tab) setSelectedTab(tab);
        const personalScope = searchParams.get('personal_scope');
        if(personalScope) setSelectedPersonalScope(personalScope);
    }, [searchParams]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const getPeriodText = () => {
        if (!settings) return '当月';
        switch (settings.period) {
            case 'monthly': return '当月';
            case 'quarterly': return '当四半期';
            case 'yearly': return '当年度';
            default: return '当月';
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

                <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="personal">個人ランキング</TabsTrigger>
                        <TabsTrigger value="department">部署ランキング</TabsTrigger>
                        <TabsTrigger value="contents">コンテンツランキング</TabsTrigger>
                    </TabsList>
                    {selectedTab === 'personal' && (
                        <TabsContent value="personal">
                            <Card>
                                <CardHeader>
                                    <CardTitle>個人ランキング</CardTitle>
                                    <CardDescription>個人の活動に基づいたランキングです。</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Tabs value={selectedPersonalScope} onValueChange={setSelectedPersonalScope}>
                                        <TabsList className="grid w-full grid-cols-2 mb-4">
                                            <TabsTrigger value="all">全社</TabsTrigger>
                                            <TabsTrigger value="my-department">自部署</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="all">
                                            <Tabs defaultValue="overall" className="w-full">
                                                <TabsList className="grid w-full grid-cols-4">
                                                    <TabsTrigger value="overall">総合</TabsTrigger>
                                                    <TabsTrigger value="likes">いいね数</TabsTrigger>
                                                    <TabsTrigger value="comments">コメント数</TabsTrigger>
                                                    <TabsTrigger value="views">視聴回数</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="overall"><RankingList category="overall" scope="all" personalScope="all" /></TabsContent>
                                                <TabsContent value="likes"><RankingList category="likes" scope="all" personalScope="all" /></TabsContent>
                                                <TabsContent value="comments"><RankingList category="comments" scope="all" personalScope="all" /></TabsContent>
                                                <TabsContent value="views"><RankingList category="views" scope="all" personalScope="all" /></TabsContent>
                                            </Tabs>
                                        </TabsContent>
                                        <TabsContent value="my-department">
                                            <Tabs defaultValue="overall" className="w-full">
                                                <TabsList className="grid w-full grid-cols-4">
                                                    <TabsTrigger value="overall">総合</TabsTrigger>
                                                    <TabsTrigger value="likes">いいね数</TabsTrigger>
                                                    <TabsTrigger value="comments">コメント数</TabsTrigger>
                                                    <TabsTrigger value="views">視聴回数</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="overall"><RankingList category="overall" scope="all" personalScope="my-department" /></TabsContent>
                                                <TabsContent value="likes"><RankingList category="likes" scope="all" personalScope="my-department" /></TabsContent>
                                                <TabsContent value="comments"><RankingList category="comments" scope="all" personalScope="my-department" /></TabsContent>
                                                <TabsContent value="views"><RankingList category="views" scope="all" personalScope="my-department" /></TabsContent>
                                            </Tabs>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                    {selectedTab === 'department' && (
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
                    )}
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


export default function RankingPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <RankingPageComponent />
        </Suspense>
    )
}

    