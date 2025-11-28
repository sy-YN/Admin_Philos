
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { collection, query, orderBy, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp, doc } from 'firebase/firestore';
import type { CalendarMessage } from '@/types/calendar';
import type { FixedCalendarMessage } from '@/types/fixed-calendar-message';
import { Loader2, PlusCircle, Edit, Trash2, GripVertical, Calendar as CalendarIcon, User, Eye, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { IconPicker } from '@/components/philosophy/icon-picker';
import { RichTextEditor } from '@/components/tiptap/editor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DynamicIcon } from '@/components/philosophy/dynamic-icon';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';

// --- Shared Components ---

function CalendarPreview({ title, content, icon, date }: { title: string; content: string; icon: string; date: Date; }) {
  const formattedDate = format(date, 'yyyy年M月d日 (E)', { locale: ja });
  const IconComponent = DynamicIcon;

  return (
    <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center p-4">
      <div className="phone-bezel">
        <div className="phone-screen">
          <div className="relative h-full w-full flex flex-col items-center justify-center bg-background p-4">
             <div className="w-full max-w-sm h-full bg-card rounded-lg shadow-md flex flex-col p-6 font-serif">
                <header className="text-center pb-1">
                   <p className="text-sm font-medium text-muted-foreground tracking-widest">{formattedDate}</p>
                </header>
                <div className="relative -mt-1 h-3 w-full overflow-hidden">
                  <svg viewBox="0 0 320 16" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full text-card fill-current">
                    <path d="M0 4 Q 5 10, 10 4 Q 15 10, 20 4 Q 25 10, 30 4 Q 35 10, 40 4 Q 45 10, 50 4 Q 55 10, 60 4 Q 65 10, 70 4 Q 75 10, 80 4 Q 85 10, 90 4 Q 95 10, 100 4 Q 105 10, 110 4 Q 115 10, 120 4 Q 125 10, 130 4 Q 135 10, 140 4 Q 145 10, 150 4 Q 155 10, 160 4 Q 165 10, 170 4 Q 175 10, 180 4 Q 185 10, 190 4 Q 195 10, 200 4 Q 205 10, 210 4 Q 215 10, 220 4 Q 225 10, 230 4 Q 235 10, 240 4 Q 245 10, 250 4 Q 255 10, 260 4 Q 265 10, 270 4 Q 275 10, 280 4 Q 285 10, 290 4 Q 295 10, 300 4 Q 305 10, 310 4 Q 315 10, 320 4 L 320 0 L 0 0 Z" />
                  </svg>
                </div>
                <main className="flex-1 flex flex-col items-center justify-start text-center bg-card z-0 pt-6">
                    <p className="text-xs font-medium text-muted-foreground mb-2 text-center">今日の行動指針</p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <IconComponent name={icon} className="w-5 h-5 text-primary" />
                        <h1 className="text-xl font-bold text-foreground leading-snug">
                            {title || 'タイトル'}
                        </h1>
                    </div>
                    <div
                        className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground text-left"
                        dangerouslySetInnerHTML={{ __html: content || '<p>ここに内容が表示されます</p>' }}
                    />
                </main>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BaseMessageDialog({
  item,
  onSave,
  children,
  order,
  isFixed = false,
}: {
  item?: (CalendarMessage | FixedCalendarMessage) & { authorName?: string };
  onSave: (data: any) => void;
  children: React.ReactNode;
  order?: number;
  isFixed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('Smile');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    if (open) {
      if (item) {
        setTitle(item.title || '');
        setContent(item.content || '');
        setIcon(item.icon || 'Smile');
        if (isFixed) {
          const fixedItem = item as FixedCalendarMessage;
          setDateRange({
            from: fixedItem.startDate?.toDate(),
            to: fixedItem.endDate?.toDate(),
          });
        }
      } else {
        setTitle('');
        setContent('');
        setIcon('Smile');
        setDateRange(undefined);
      }
    }
  }, [item, open, isFixed]);

  const handleSave = () => {
    if (!title || !content) {
      alert("タイトルと内容は必須です。");
      return;
    }
    if (isFixed && (!dateRange?.from || !dateRange?.to)) {
      alert("開始日と終了日は必須です。");
      return;
    }

    const baseData = { title, content, icon };
    const finalData = isFixed
      ? { ...baseData, startDate: Timestamp.fromDate(dateRange!.from!), endDate: Timestamp.fromDate(dateRange!.to!), order: order! }
      : { ...baseData, order: order! };
      
    onSave(finalData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{item ? 'メッセージを編集' : '新規メッセージを追加'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
            {/* Left side: Form */}
            <div className="flex flex-col h-full">
                 <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                    {isFixed && (
                        <div className="space-y-2">
                            <Label htmlFor="date-picker">表示期間</Label>
                            <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                id="date-picker"
                                variant={'outline'}
                                className={cn(
                                    'w-full justify-start text-left font-normal bg-background',
                                    !dateRange && 'text-muted-foreground'
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                    <>
                                        {format(dateRange.from, 'PPP', { locale: ja })} -{' '}
                                        {format(dateRange.to, 'PPP', { locale: ja })}
                                    </>
                                    ) : (
                                    format(dateRange.from, 'PPP', { locale: ja })
                                    )
                                ) : (
                                    <span>日付を選択</span>
                                )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="range"
                                selected={dateRange}
                                onSelect={setDateRange}
                                initialFocus
                                locale={ja}
                                />
                            </PopoverContent>
                            </Popover>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="content">内容</Label>
                        <RichTextEditor content={content} onChange={setContent} />
                    </div>
                </div>
            </div>
            {/* Right side: Preview */}
            <div className="hidden md:flex flex-col h-full border-l">
                 <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-muted-foreground">プレビュー</h3>
                </div>
                <CalendarPreview title={title} content={content} icon={icon} date={new Date()} />
            </div>
        </div>
        <DialogFooter className="p-6 pt-0 border-t">
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const formatDate = (ts: Timestamp | undefined) => ts ? format(ts.toDate(), 'yyyy/MM/dd', { locale: ja }) : 'N/A';

// --- 日替わりメッセージタブ ---

function SortableMessageItem({ item, onEdit, onDelete }: { item: CalendarMessage; onEdit: (id: string, data: Partial<CalendarMessage>) => void; onDelete: (id: string) => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : 0, };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-4 p-3 rounded-md border bg-background">
      <div {...attributes} {...listeners} className="cursor-grab touch-none p-1 pt-0.5"><GripVertical className="h-5 w-5 text-muted-foreground" /></div>
      <div className="w-6 h-6 flex items-center justify-center shrink-0"><DynamicIcon name={item.icon} className="h-6 w-6 text-primary" /></div>
      <div className="flex-1 overflow-hidden">
        <p className="font-semibold">{item.title}</p>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_p]:my-1" dangerouslySetInnerHTML={{ __html: item.content }} />
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>{item.authorName || '不明'} at {formatDate(item.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <BaseMessageDialog item={item} order={item.order} onSave={(data) => onEdit(item.id, data)}><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></BaseMessageDialog>
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

function DailyMessageListTab() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(collection(firestore, 'calendarMessages'), orderBy('order'));
  }, [firestore, isUserLoading, user]);

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

      const reorderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, order: index }));
      setItems(reorderedItems);

      handleOrderChange(reorderedItems);
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
      if(dbItems) setItems(dbItems);
    }
  };
  
  const handleAddItem = async (data: Partial<CalendarMessage>) => {
    if (!firestore || !user) return;
    try {
      await addDoc(collection(firestore, 'calendarMessages'), {
        ...data,
        authorId: user.uid,
        authorName: user.displayName || '不明なユーザー',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: '成功', description: '新しいメッセージを追加しました。' });
    } catch (error) {
      toast({ title: 'エラー', description: 'メッセージの追加に失敗しました。', variant: 'destructive' });
    }
  };

  const handleEditItem = async (id: string, data: Partial<CalendarMessage>) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'calendarMessages', id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
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
        <CardDescription>ここで登録したメッセージが順番に表示されます。ドラッグ＆ドロップで表示順を変更できます。</CardDescription>
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
        <BaseMessageDialog onSave={handleAddItem} order={getNextOrder()}><Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />新規メッセージを追加</Button></BaseMessageDialog>
      </CardContent>
    </Card>
  );
}

// --- 期間指定メッセージタブ ---

function SortableFixedMessageItem({ item, onEdit, onDelete }: { item: FixedCalendarMessage; onEdit: (id: string, data: Partial<FixedCalendarMessage>) => void; onDelete: (id: string) => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : 0, };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-4 p-3 rounded-md border bg-background">
      <div {...attributes} {...listeners} className="cursor-grab touch-none p-1 pt-0.5"><GripVertical className="h-5 w-5 text-muted-foreground" /></div>
      <div className="w-6 h-6 flex items-center justify-center shrink-0"><DynamicIcon name={item.icon} className="h-6 w-6 text-primary" /></div>
      <div className="flex-1 overflow-hidden">
        <p className="font-semibold">{item.title}</p>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_p]:my-1" dangerouslySetInnerHTML={{ __html: item.content }} />
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
          <CalendarIcon className="h-3 w-3" />
          <span>{formatDate(item.startDate)} ~ {formatDate(item.endDate)}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>{item.authorName || '不明'} at {formatDate(item.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <BaseMessageDialog isFixed item={item} order={item.order} onSave={(data) => onEdit(item.id, data)}><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></BaseMessageDialog>
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

function ScheduledMessageListTab() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(collection(firestore, 'fixedCalendarMessages'), orderBy('order'));
  }, [firestore, isUserLoading, user]);

  const { data: dbItems, isLoading } = useCollection<FixedCalendarMessage>(messagesQuery);
  const [items, setItems] = useState<FixedCalendarMessage[]>([]);

  useEffect(() => { if (dbItems) setItems(dbItems); }, [dbItems]);
  
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, order: index }));
      setItems(reorderedItems);

      handleOrderChange(reorderedItems);
    }
  };
  
   const handleOrderChange = async (reorderedItems: FixedCalendarMessage[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    reorderedItems.forEach(item => {
      const docRef = doc(firestore, 'fixedCalendarMessages', item.id);
      batch.update(docRef, { order: item.order });
    });
    try {
      await batch.commit();
      toast({ title: '成功', description: '表示順を更新しました。' });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({ title: 'エラー', description: '表示順の更新に失敗しました。', variant: 'destructive' });
      if(dbItems) setItems(dbItems);
    }
  };


  const handleAddItem = async (data: Partial<FixedCalendarMessage>) => {
    if (!firestore || !user) return;
    try {
      await addDoc(collection(firestore, 'fixedCalendarMessages'), {
        ...data,
        authorId: user.uid,
        authorName: user.displayName || '不明なユーザー',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: '成功', description: '新しい期間指定メッセージを追加しました。' });
    } catch (error) {
      console.error(error);
      toast({ title: 'エラー', description: 'メッセージの追加に失敗しました。', variant: 'destructive' });
    }
  };

  const handleEditItem = async (id: string, data: Partial<FixedCalendarMessage>) => {
    if (!firestore || !user) return;
    try {
      await updateDoc(doc(firestore, 'fixedCalendarMessages', id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      toast({ title: '成功', description: 'メッセージを更新しました。' });
    } catch (error) {
      console.error(error);
      toast({ title: 'エラー', description: 'メッセージの更新に失敗しました。', variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'fixedCalendarMessages', id));
      toast({ title: '成功', description: 'メッセージを削除しました。' });
    } catch (error) {
      console.error(error);
      toast({ title: 'エラー', description: 'メッセージの削除に失敗しました。', variant: 'destructive' });
    }
  };
  
  const getNextOrder = () => items.length > 0 ? Math.max(...items.map(i => i.order)) + 1 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>期間指定メッセージ一覧</CardTitle>
        <CardDescription>
            期間が重複した場合、このリストの上が優先されます。ドラッグ＆ドロップで優先順位を変更できます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {items.map((item) => <SortableFixedMessageItem key={item.id} item={item} onEdit={handleEditItem} onDelete={handleDeleteItem} />)}
                    </div>
                </SortableContext>
            </DndContext>
        )}
        <BaseMessageDialog onSave={handleAddItem} isFixed order={getNextOrder()}>
            <Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />新規メッセージを追加</Button>
        </BaseMessageDialog>
      </CardContent>
    </Card>
  );
}


export default function CalendarSettingsPage() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">行動指針カレンダー設定</h1>
      </div>
      <Tabs defaultValue="daily">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">日替わりメッセージ</TabsTrigger>
          <TabsTrigger value="scheduled">期間指定メッセージ</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <DailyMessageListTab />
        </TabsContent>
        <TabsContent value="scheduled">
          <ScheduledMessageListTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
