
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, GripVertical, Loader2, Sparkles, FolderPlus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { IconPicker } from '@/components/philosophy/icon-picker';
import { DynamicIcon } from '@/components/philosophy/dynamic-icon';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, orderBy, where, getDocs } from 'firebase/firestore';
import type { PhilosophyItem } from '@/types/philosophy';
import type { PhilosophyCategory } from '@/types/philosophy-category';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RichTextEditor } from '@/components/tiptap/editor';

function CategoryDialog({ category, onSave, children }: { category?: PhilosophyCategory; onSave: (data: Partial<Omit<PhilosophyCategory, 'id' | 'createdAt' | 'updatedAt'>>) => void; children: React.ReactNode; }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(category?.name || '');
    }
  }, [category, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'カテゴリを編集' : '新しいカテゴリを追加'}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="category-name">カテゴリ名</Label>
          <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PhilosophyItemDialog({
  item,
  onSave,
  children,
  categoryId,
  order
}: {
  item?: PhilosophyItem | null;
  onSave: (data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  children: React.ReactNode;
  categoryId: string;
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
    }
  }, [item, open]);

  const handleSave = () => {
    onSave({ title, content, icon, categoryId, order });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? '項目を編集' : '新規項目を追加'}</DialogTitle>
          <DialogDescription>タイトル、内容、アイコンを入力してください。</DialogDescription>
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

function SortableItem({ item, onEditItem, onDeleteItem }: { item: PhilosophyItem; onEditItem: (id: string, data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => void; onDeleteItem: (id: string) => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : 0 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-4 p-3 rounded-md border bg-background">
      <div {...attributes} {...listeners} className="cursor-grab touch-none p-1 pt-0.5">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="w-6 h-6 flex items-center justify-center shrink-0">
        <DynamicIcon name={item.icon} className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="font-semibold">{item.title}</p>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_p]:my-1" dangerouslySetInnerHTML={{ __html: item.content }} />
      </div>
      <div className="flex items-center gap-2">
        <PhilosophyItemDialog item={item} categoryId={item.categoryId} order={item.order} onSave={(data) => onEditItem(item.id, data)}>
          <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
        </PhilosophyItemDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>「{item.title}」を削除します。この操作は元に戻せません。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDeleteItem(item.id)}>削除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function PhilosophyCategorySection({
  category,
  items,
  onSaveCategory,
  onDeleteCategory,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onItemOrderChange,
}: {
  category: PhilosophyCategory;
  items: PhilosophyItem[];
  onSaveCategory: (id: string, data: Partial<Omit<PhilosophyCategory, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onDeleteCategory: (id: string) => void;
  onAddItem: (data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditItem: (id: string, data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteItem: (id: string) => void;
  onItemOrderChange: (categoryId: string, reorderedItems: PhilosophyItem[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      onItemOrderChange(category.id, reorderedItems);
    }
  };
  
  const getNextItemOrder = () => items.length > 0 ? Math.max(...items.map(i => i.order)) + 1 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{category.name}</CardTitle>
        <div className="flex items-center gap-2">
            <CategoryDialog category={category} onSave={(data) => onSaveCategory(category.id, data)}>
                 <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
            </CategoryDialog>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当にこのカテゴリを削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>カテゴリ「{category.name}」と、それに含まれる全ての項目が削除されます。この操作は元に戻せません。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteCategory(category.id)}>削除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableItem key={item.id} item={item} onEditItem={onEditItem} onDeleteItem={onDeleteItem} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <PhilosophyItemDialog onSave={onAddItem} categoryId={category.id} order={getNextItemOrder()}>
          <Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />新規項目を追加</Button>
        </PhilosophyItemDialog>
      </CardContent>
    </Card>
  );
}

export default function PhilosophyPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const categoriesQuery = useMemoFirebase(() => !firestore || isUserLoading ? null : query(collection(firestore, 'philosophyCategories'), orderBy('order')), [firestore, isUserLoading]);
  const itemsQuery = useMemoFirebase(() => !firestore || isUserLoading ? null : query(collection(firestore, 'philosophy'), orderBy('order')), [firestore, isUserLoading]);

  const { data: dbCategories, isLoading: isLoadingCategories } = useCollection<PhilosophyCategory>(categoriesQuery);
  const { data: dbItems, isLoading: isLoadingItems } = useCollection<PhilosophyItem>(itemsQuery);

  const [categories, setCategories] = useState<PhilosophyCategory[]>([]);
  const [items, setItems] = useState<PhilosophyItem[]>([]);

  useEffect(() => { if (dbCategories) setCategories(dbCategories); }, [dbCategories]);
  useEffect(() => { if (dbItems) setItems(dbItems); }, [dbItems]);
  
  const handleSaveCategory = async (id: string, data: Partial<Omit<PhilosophyCategory, 'id'|'createdAt'|'updatedAt'>>) => {
      if (!firestore) return;
      try {
        await updateDoc(doc(firestore, 'philosophyCategories', id), { ...data, updatedAt: serverTimestamp() });
        toast({ title: '成功', description: 'カテゴリを更新しました。' });
      } catch (error) {
        toast({ title: 'エラー', description: 'カテゴリの更新に失敗しました。', variant: 'destructive' });
      }
  };

  const handleAddCategory = async (data: Partial<Omit<PhilosophyCategory, 'id'|'createdAt'|'updatedAt'>>) => {
    if (!firestore) return;
    const newOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 0;
    try {
        await addDoc(collection(firestore, 'philosophyCategories'), { ...data, order: newOrder, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: '成功', description: '新しいカテゴリを追加しました。' });
    } catch (error) {
        toast({ title: 'エラー', description: 'カテゴリの追加に失敗しました。', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    // Delete category
    batch.delete(doc(firestore, 'philosophyCategories', id));
    // Delete items in category
    const itemsToDelete = items.filter(item => item.categoryId === id);
    itemsToDelete.forEach(item => {
        batch.delete(doc(firestore, 'philosophy', item.id));
    });
    try {
        await batch.commit();
        toast({ title: '成功', description: 'カテゴリと関連する項目を削除しました。' });
    } catch (error) {
        toast({ title: 'エラー', description: 'カテゴリの削除に失敗しました。', variant: 'destructive' });
    }
  };

  const handleAddItem = async (data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, 'philosophy'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast({ title: '成功', description: '新しい項目を追加しました。' });
    } catch (error) {
      toast({ title: 'エラー', description: '項目の追加に失敗しました。', variant: 'destructive' });
    }
  };

  const handleEditItem = async (id: string, data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'philosophy', id), { ...data, updatedAt: serverTimestamp() });
      toast({ title: '成功', description: '項目を更新しました。' });
    } catch (error) {
      toast({ title: 'エラー', description: '項目の更新に失敗しました。', variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'philosophy', id));
      toast({ title: '成功', description: '項目を削除しました。' });
    } catch (error) {
      toast({ title: 'エラー', description: '項目の削除に失敗しました。', variant: 'destructive' });
    }
  };

  const handleItemOrderChange = async (categoryId: string, reorderedItems: PhilosophyItem[]) => {
    if (!firestore) return;
    setItems(prev => {
        const otherItems = prev.filter(i => i.categoryId !== categoryId);
        return [...otherItems, ...reorderedItems.map((item, index) => ({...item, order: index}))]
            .sort((a, b) => a.categoryId.localeCompare(b.categoryId) || a.order - b.order);
    });

    const batch = writeBatch(firestore);
    reorderedItems.forEach((item, index) => {
      batch.update(doc(firestore, 'philosophy', item.id), { order: index });
    });

    try {
      await batch.commit();
      toast({ title: '成功', description: '項目の順序を更新しました。' });
    } catch (error) {
      toast({ title: 'エラー', description: '項目の順序更新に失敗しました。', variant: 'destructive' });
    }
  };

  const handleSeedData = async () => {
    if (!firestore) return;

    const categoriesToSeed = [
        { name: '理念・ビジョン', order: 0 },
        { name: '考え方の継承', order: 1 },
    ];
    const itemsToSeed = {
        '理念・ビジョン': [
            { title: '企業理念', content: '<p>1.五方正義</p><p>2.顧客満足を実現する総合情報サービスの提供</p><p>3.高品質・高付加価値の追求</p><p>4.世界視野での斬新な挑戦</p><p>5.業界・地域・社会貢献</p>', icon: 'Building2', order: 0 },
            { title: 'コーポレートステートメント', content: '<p>情報技術で<span style="color: #E03131">笑顔</span>を創る<b>知的集団</b></p>', icon: 'Rocket', order: 1 },
            { title: 'パーパス', content: '多様な人材と技術力で、日本のITを支える', icon: 'Heart', order: 2 },
        ],
        '考え方の継承': [
            { title: '営業戦略', content: '市場の変化に対応し、顧客との強固な関係を築くための戦略。', icon: 'Briefcase', order: 0 },
            { title: 'BP様戦略', content: 'ビジネスパートナー様との連携を強化し、共存共栄を目指す戦略。', icon: 'Handshake', order: 1 },
        ]
    };
    
    try {
      const batch = writeBatch(firestore);
      const categoryRefs: Record<string, string> = {};

      for (const cat of categoriesToSeed) {
        const catRef = doc(collection(firestore, 'philosophyCategories'));
        batch.set(catRef, { ...cat, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        categoryRefs[cat.name] = catRef.id;
      }
      
      for (const [catName, catItems] of Object.entries(itemsToSeed)) {
          const categoryId = categoryRefs[catName];
          if (categoryId) {
              for (const item of catItems) {
                const itemRef = doc(collection(firestore, 'philosophy'));
                batch.set(itemRef, { ...item, categoryId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
              }
          }
      }
        
      await batch.commit();
      toast({ title: '成功', description: 'サンプルデータを登録しました。' });
    } catch (error) {
      console.error(error);
      toast({ title: 'エラー', description: 'サンプルデータの登録に失敗しました。', variant: 'destructive' });
    }
  };
  
  const isLoading = isUserLoading || isLoadingCategories || isLoadingItems;

  return (
    <div className="w-full space-y-6 max-w-5xl">
       <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">理念管理</h1>
        <div className="ml-auto flex items-center gap-2">
            <CategoryDialog onSave={handleAddCategory}>
              <Button variant="outline"><FolderPlus className="mr-2 h-4 w-4" />新規カテゴリを追加</Button>
            </CategoryDialog>
            {categories.length === 0 && !isLoading && (
            <Button onClick={handleSeedData} size="sm" variant="outline" className="flex items-center gap-2">
                <Sparkles />サンプルデータを生成
            </Button>
            )}
        </div>
      </div>
      {isLoading ? (
         <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
       <div className="grid gap-6">
          {categories.map(category => (
            <PhilosophyCategorySection
              key={category.id}
              category={category}
              items={items.filter(item => item.categoryId === category.id).sort((a,b) => a.order - b.order)}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onItemOrderChange={handleItemOrderChange}
            />
          ))}
          {categories.length === 0 && (
             <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>カテゴリがまだ登録されていません。</p>
                <p className="text-sm">右上の「新規カテゴリを追加」ボタンから最初のカテゴリを登録してください。</p>
            </div>
          )}
       </div>
      )}
    </div>
  );
}
