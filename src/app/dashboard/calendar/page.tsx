
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, setDoc, Timestamp } from 'firebase/firestore';
import type { CalendarDisplaySettings } from '@/types/settings';
import type { PhilosophyItem } from '@/types/philosophy';
import { Loader2, Calendar as CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function CalendarSettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  // Firestore references
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'calendarDisplay') : null, [firestore]);
  const philosophyQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'philosophy'), orderBy('order')) : null, [firestore]);

  // Data from hooks
  const { data: settings, isLoading: isLoadingSettings } = useDoc<CalendarDisplaySettings>(settingsRef);
  const { data: philosophyItems, isLoading: isLoadingPhilosophy } = useCollection<PhilosophyItem>(philosophyQuery);

  // Component state
  const [mode, setMode] = useState<'daily' | 'fixed'>('daily');
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [fixedEndDate, setFixedEndDate] = useState<Date | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Sync component state with data from Firestore
  useEffect(() => {
    if (settings) {
      setMode(settings.mode);
      setActiveContentId(settings.activeContentId);
      if (settings.fixedEndDate) {
        setFixedEndDate(settings.fixedEndDate.toDate());
      } else {
        setFixedEndDate(undefined);
      }
    }
  }, [settings]);

  const handleSave = async () => {
    if (!firestore) return;

    // Validation for 'fixed' mode
    if (mode === 'fixed' && (!activeContentId || !fixedEndDate)) {
      toast({
        title: '入力エラー',
        description: '期間固定モードでは、コンテンツと終了日の両方を指定する必要があります。',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const newSettings: Omit<CalendarDisplaySettings, 'id'> = {
        mode,
        activeContentId: mode === 'fixed' ? activeContentId : null,
        fixedEndDate: mode === 'fixed' && fixedEndDate ? Timestamp.fromDate(fixedEndDate) : null,
        dailyLoopCounter: settings?.dailyLoopCounter ?? 0, // Keep existing counter or initialize to 0
      };
      
      await setDoc(settingsRef!, newSettings, { merge: true });

      toast({
        title: '保存しました',
        description: 'カレンダーの表示設定を更新しました。',
      });

    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: '保存失敗',
        description: '設定の保存中にエラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingSettings || isLoadingPhilosophy;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">カレンダー設定</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>行動指針の表示設定</CardTitle>
          <CardDescription>
            従業員向けアプリのカレンダーに表示される「今日の行動指針」の表示方法を設定します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>表示モード</Label>
            <RadioGroup value={mode} onValueChange={(v: 'daily' | 'fixed') => setMode(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily">日替わり表示</Label>
              </div>
              <p className="pl-6 text-sm text-muted-foreground">
                登録された「理念・ビジョン」のコンテンツが毎日順番に表示されます。
              </p>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed">期間固定表示</Label>
              </div>
               <p className="pl-6 text-sm text-muted-foreground">
                指定した期間、特定のコンテンツを毎日表示します。こちらが優先されます。
              </p>
            </RadioGroup>
          </div>

          {mode === 'fixed' && (
            <Card className="bg-muted/50 p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content-select">固定表示するコンテンツ</Label>
                <Select value={activeContentId ?? ''} onValueChange={setActiveContentId}>
                  <SelectTrigger id="content-select">
                    <SelectValue placeholder="コンテンツを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {philosophyItems && philosophyItems.length > 0 ? (
                      philosophyItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        表示できるコンテンツがありません
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-picker">固定表示の終了日</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-picker"
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !fixedEndDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fixedEndDate ? format(fixedEndDate, 'PPP', { locale: ja }) : <span>日付を選択</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fixedEndDate}
                      onSelect={setFixedEndDate}
                      initialFocus
                      locale={ja}
                    />
                  </PopoverContent>
                </Popover>
                 <p className="text-xs text-muted-foreground">
                    指定した日付の終わりまで、コンテンツが固定表示されます。
                </p>
              </div>
            </Card>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? '保存中...' : '設定を保存'}
        </Button>
      </div>

    </div>
  );
}
