
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { RankingSettings } from '@/types/ranking';

export default function RankingPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const settingsRef = useMemoFirebase(() => 
    firestore ? doc(firestore, 'settings', 'ranking') : null
  , [firestore]);

  const { data: settings, isLoading: isLoadingSettings } = useDoc<RankingSettings>(settingsRef);
  
  const [period, setPeriod] = useState<RankingSettings['period']>('monthly');
  const [likePoints, setLikePoints] = useState(1);
  const [commentPoints, setCommentPoints] = useState(2);
  const [goalPoints, setGoalPoints] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setPeriod(settings.period);
      setLikePoints(settings.weights.likes);
      setCommentPoints(settings.weights.comments);
      setGoalPoints(settings.weights.goal_progress);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!firestore || !user) {
      toast({ title: 'エラー', description: 'ログインしていません。', variant: 'destructive' });
      return;
    }
    setIsSaving(true);

    const newSettings: Omit<RankingSettings, 'id'> = {
      period,
      weights: {
        likes: likePoints,
        comments: commentPoints,
        goal_progress: goalPoints,
      },
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };
    
    try {
      await setDoc(doc(firestore, 'settings', 'ranking'), newSettings);
      toast({ title: '成功', description: 'ランキング設定を保存しました。' });
    } catch (error) {
      console.error(error);
      toast({ title: 'エラー', description: '設定の保存に失敗しました。', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const isLoading = isUserLoading || isLoadingSettings;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">ランキング設定</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>総合ランキング設定</CardTitle>
            <CardDescription>従業員向けアプリに表示される総合ランキングの集計ルールを設定します。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="period">集計期間</Label>
              <Select value={period} onValueChange={(value) => setPeriod(value as RankingSettings['period'])}>
                <SelectTrigger id="period" className="w-[180px]">
                  <SelectValue placeholder="期間を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">月間</SelectItem>
                  <SelectItem value="quarterly">四半期</SelectItem>
                  <SelectItem value="yearly">年間</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
               <Label>活動ポイントの重み付け</Label>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
                 <div className="space-y-2">
                   <Label htmlFor="like-points">いいね！（1回あたり）</Label>
                   <Input 
                     id="like-points" 
                     type="number" 
                     value={likePoints} 
                     onChange={(e) => setLikePoints(Number(e.target.value))}
                   />
                 </div>
                  <div className="space-y-2">
                   <Label htmlFor="comment-points">コメント（1回あたり）</Label>
                   <Input 
                     id="comment-points" 
                     type="number" 
                     value={commentPoints} 
                     onChange={(e) => setCommentPoints(Number(e.target.value))}
                    />
                 </div>
                  <div className="space-y-2">
                   <Label htmlFor="goal-points">個人目標（達成率1%あたり）</Label>
                   <Input 
                     id="goal-points" 
                     type="number" 
                     value={goalPoints} 
                     onChange={(e) => setGoalPoints(Number(e.target.value))}
                    />
                 </div>
               </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                設定を保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
