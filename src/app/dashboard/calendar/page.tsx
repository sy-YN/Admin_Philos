
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, Timestamp, collection, query, orderBy, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { CalendarDisplaySettings, FixedCalendarContent } from '@/types/settings';
import type { CalendarMessage } from '@/types/calendar';
import { Loader2, Calendar as CalendarIcon, Save, PlusCircle, Edit, Trash2, GripVertical, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { IconPicker } from '@/components/philosophy/icon-picker';
import { RichTextEditor } from '@/components/tiptap/editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DynamicIcon } from '@/components/philosophy/dynamic-icon';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


// --- 表示設定タブ ---
function DisplaySettingsTab() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'calendarDisplay') : null, [firestore]);
  const { data: settings, isLoading: isLoadingSettings } = useDoc<CalendarDisplaySettings>(settingsRef);

  const [mode, setMode] = useState<'daily' | 'fixed'>('daily');
  const [fixedEndDate, setFixedEndDate] = useState<Date | undefined>(undefined);
  const [fixedContent, setFixedContent] = useState<Omit<FixedCalendarContent, 'id'>>({ title: '', icon: 'Smile', content: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setMode(settings.mode);
      setFixedContent(settings.fixedContent || { title: '', icon: 'Smile', content: '' });
      if (settings.fixedEndDate) {
        setFixedEndDate(settings.fixedEndDate.toDate());
      } else {
        setFixedEndDate(undefined);
      }
    }
  }, [settings]);

  const handleSave = async () => {
    if (!firestore || !settingsRef) return;

    if (mode === 'fixed' && (!fixedContent.title || !fixedContent.content || !fixedEndDate)) {
      toast({
        title: '入力エラー',
        description: '期間固定モードでは、タイトル、内容、終了日のすべてを指定する必要があります。',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const newSettings: Partial<CalendarDisplaySettings> = {
        mode,
        fixedContent: mode === 'fixed' ? fixedContent : null,
        fixedEndDate: mode === 'fixed' && fixedEndDate ? Timestamp.fromDate(fixedEndDate) : null,
        dailyLoopCounter: settings?.dailyLoopCounter ?? 0,
      };
      
      await setDoc(settingsRef, newSettings, { merge: true });

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

  if (isLoadingSettings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                「メッセージ一覧」で登録したコンテンツが毎日順番に表示されます。
              </p>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed">期間固定表示</Label>
              </div>
               <p className="pl-6 text-sm text-muted-foreground">
                指定した期間、ここで作成したオリジナルのコンテンツを毎日表示します。こちらが優先されます。
              </p>
            </RadioGroup>
          </div>

          {mode === 'fixed' && (
            <Card className="bg-muted/50 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fixed-title">タイトル</Label>
                  <Input 
                    id="fixed-title" 
                    value={fixedContent.title} 
                    onChange={(e) => setFixedContent(prev => ({...prev, title: e.target.value}))}
                    placeholder="今週の標語"
                  />
                </div>
                <div className="space-y-2">
                  <Label>アイコン</Label>
                  <IconPicker currentIcon={fixedContent.icon} onIconChange={(icon) => setFixedContent(prev => ({...prev, icon}))} />
                </div>
              </div>

               <div className="space-y-2">
                <Label htmlFor="fixed-content">内容</Label>
                <RichTextEditor
                    content={fixedContent.content}
                    onChange={(content) => setFixedContent(prev => ({...prev, content}))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-picker">固定表示の終了日</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-picker"
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal bg-background',
                        !fixedEndDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fixedEndDate ? format(fixedEndDate, 'PPP', { locale: ja }) : <span>日付を選択</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarUI
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

// --- メッセージ一覧タブ ---

function MessageItemDialog({
  item,
  onSave,
  children,
  order
}: {
  item?: CalendarMessage | null;
  onSave: (data: Omit<CalendarMessage, 'id' | 'createdAt' | 'updatedAt'>) => void;
  children: React.ReactNode;
  order: number;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('Smile');

  useEffect(() => {
    if (open) {
      setTitle(item?.title || '');
      setContent(item?.content || '');
      setIcon(item?.icon || 'Smile');
    } else {
      setTitle('');
      setContent('');
      setIcon('Smile');
    }
  }, [item, open]);

  const handleSave = () => {
    if (!title || !content) {
      alert("タイトルと内容は必須です。");
      return;
    }
    onSave({ title, content, icon, order });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'メッセージを編集' : '新規メッセージを追加'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">タイトル</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>アイコン</Label>
              <IconPicker currentIcon={icon} onIconChange={setIcon} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">内容</Label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableMessageItem({ item, onEdit, onDelete }: { item: CalendarMessage; onEdit: (id: string, data: Omit<CalendarMessage, 'id' | 'createdAt' | 'updatedAt'>) => void; onDelete: (id: string) => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : 0, };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-4 p-3 rounded-md border bg-background">
      <div {...attributes} {...listeners} className="cursor-grab touch-none p-1 pt-0.5"><GripVertical className="h-5 w-5 text-muted-foreground" /></div>
      <div className="w-6 h-6 flex items-center justify-center shrink-0"><DynamicIcon name={item.icon} className="h-6 w-6 text-primary" /></div>
      <div className="flex-1 overflow-hidden">
        <p className="font-semibold">{item.title}</p>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_p]:my-1" dangerouslySetInnerHTML={{ __html: item.content }} />
      </div>
      <div className="flex items-center gap-2">
        <MessageItemDialog item={item} order={item.order} onSave={(data) => onEdit(item.id, data)}><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></MessageItemDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>本当に削除しますか？</AlertDialogTitle><AlertDialogDescription>「{item.title}」を削除します。この操作は元に戻せません。</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(item.id)}>削除</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function MessageListTab() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const messagesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'calendarMessages'), orderBy('order')) : null, [firestore]);
  const { data: dbItems, isLoading } = useCollection<CalendarMessage>(messagesQuery);
  const [items, setItems] = useState<CalendarMessage[]>([]);

  useEffect(() => { if (dbItems) setItems(dbItems); }, [dbItems]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      setItems(reorderedItems);

      const itemsToUpdate = reorderedItems.map((item, index) => ({ ...item, order: index }));
      handleOrderChange(itemsToUpdate);
    }
  };

  const handleOrderChange = async (reorderedItems: CalendarMessage[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    reorderedItems.forEach(item => {
      const docRef = doc(firestore, 'calendarMessages', item.id);
      batch.update(docRef, { order: item.order });
    });
    try {
      await batch.commit();
      toast({ title: '成功', description: '表示順を更新しました。' });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({ title: 'エラー', description: '表示順の更新に失敗しました。', variant: 'destructive' });
    }
  };
  
  const handleAddItem = async (data: Omit<CalendarMessage, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, 'calendarMessages'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast({ title: '成功', description: '新しいメッセージを追加しました。' });
    } catch (error) {
      toast({ title: 'エラー', description: 'メッセージの追加に失敗しました。', variant: 'destructive' });
    }
  };

  const handleEditItem = async (id: string, data: Omit<CalendarMessage, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'calendarMessages', id), { ...data, updatedAt: serverTimestamp() });
      toast({ title: '成功', description: 'メッセージを更新しました。' });
    } catch (error) {
      toast({ title: 'エラー', description: 'メッセージの更新に失敗しました。', variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'calendarMessages', id));
      toast({ title: '成功', description: 'メッセージを削除しました。' });
    } catch (error) {
      toast({ title: 'エラー', description: 'メッセージの削除に失敗しました。', variant: 'destructive' });
    }
  };

  const getNextOrder = () => items.length > 0 ? Math.max(...items.map(i => i.order)) + 1 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>日替わりメッセージ一覧</CardTitle>
        <CardDescription>ここで登録したメッセージが、「日替わり表示」モードで順番に表示されます。ドラッグ＆ドロップで表示順を変更できます。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map((item) => <SortableMessageItem key={item.id} item={item} onEdit={handleEditItem} onDelete={handleDeleteItem} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}
        <MessageItemDialog onSave={handleAddItem} order={getNextOrder()}><Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />新規メッセージを追加</Button></MessageItemDialog>
      </CardContent>
    </Card>
  );
}


export default function CalendarSettingsPage() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">カレンダー設定</h1>
      </div>
      <Tabs defaultValue="messages">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages">メッセージ一覧</TabsTrigger>
          <TabsTrigger value="settings">表示設定</TabsTrigger>
        </TabsList>
        <TabsContent value="messages">
          <MessageListTab />
        </TabsContent>
        <TabsContent value="settings">
          <DisplaySettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
