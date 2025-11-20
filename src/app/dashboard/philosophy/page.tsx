
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, GripVertical, Loader2, Sparkles } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { IconPicker } from '@/components/philosophy/icon-picker';
import { DynamicIcon } from '@/components/philosophy/dynamic-icon';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, orderBy } from 'firebase/firestore';
import type { PhilosophyItem } from '@/types/philosophy';

type Category = 'mission_vision' | 'values';


function PhilosophyItemDialog({
  item,
  onSave,
  children,
  category,
}: {
  item?: PhilosophyItem | null;
  onSave: (data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  children: React.ReactNode;
  category: Category;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('Smile');
  const [order, setOrder] = useState(0);


  const handleSave = () => {
    onSave({ title, content, icon, category, order });
    setOpen(false);
  };
  
  useMemo(() => {
    if (open) {
      setTitle(item?.title || '');
      setContent(item?.content || '');
      setIcon(item?.icon || 'Smile');
      setOrder(item?.order || 0);
    } else {
      setTitle('');
      setContent('');
      setIcon('Smile');
      setOrder(0);
    }
  }, [item, open]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? '項目を編集' : '新規項目を追加'}</DialogTitle>
          <DialogDescription>
            タイトル、内容、アイコンを入力してください。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">タイトル</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
           <div className="grid gap-2">
            <Label>アイコン</Label>
            <IconPicker currentIcon={icon} onIconChange={setIcon} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">内容</Label>
             <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="内容を入力..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function PhilosophyListSection({ 
  title,
  category,
  items, 
  onAddItem, 
  onEditItem, 
  onDeleteItem 
}: { 
  title: string, 
  category: Category,
  items: PhilosophyItem[], 
  onAddItem: (data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => void, 
  onEditItem: (id: string, data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => void, 
  onDeleteItem: (id: string) => void 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-3 rounded-md border bg-muted/50">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <DynamicIcon name={item.icon} className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground truncate">{item.content.replace(/\n/g, ' ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <PhilosophyItemDialog
                  item={item}
                  category={category}
                  onSave={(data) => onEditItem(item.id, data)}
                >
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </PhilosophyItemDialog>
                
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                          「{item.title}」を削除します。この操作は元に戻せません。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteItem(item.id)}>削除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </div>
            </div>
          ))}
        </div>
        <PhilosophyItemDialog onSave={onAddItem} category={category}>
            <Button variant="outline" className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                新規項目を追加
            </Button>
        </PhilosophyItemDialog>
      </CardContent>
    </Card>
  );
}


export default function PhilosophyPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const philosophyQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'philosophy'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: allItems, isLoading } = useCollection<PhilosophyItem>(philosophyQuery);

  const { philosophy, values } = useMemo(() => {
    const philosophy: PhilosophyItem[] = [];
    const values: PhilosophyItem[] = [];
    allItems?.forEach(item => {
      if (item.category === 'mission_vision') {
        philosophy.push(item);
      } else if (item.category === 'values') {
        values.push(item);
      }
    });
    return { philosophy, values };
  }, [allItems]);
  
  const handleAddItem = async (category: Category, data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, 'philosophy'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: '成功', description: '新しい項目を追加しました。' });
    } catch (error) {
      console.error('Error adding document: ', error);
      toast({ title: 'エラー', description: '項目の追加に失敗しました。', variant: 'destructive' });
    }
  };

  const handleEditItem = async (id: string, data: Omit<PhilosophyItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore) return;
    try {
      const itemRef = doc(firestore, 'philosophy', id);
      await updateDoc(itemRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      toast({ title: '成功', description: '項目を更新しました。' });
    } catch (error) {
      console.error('Error updating document: ', error);
      toast({ title: 'エラー', description: '項目の更新に失敗しました。', variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'philosophy', id));
      toast({ title: '成功', description: '項目を削除しました。' });
    } catch (error) {
      console.error('Error deleting document: ', error);
      toast({ title: 'エラー', description: '項目の削除に失敗しました。', variant: 'destructive' });
    }
  };

  const handleSeedData = async () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const philosophyCollection = collection(firestore, 'philosophy');
    
    const sampleData = [
      // Mission & Vision
      { title: '企業理念', content: '1.五方正義\n2.顧客満足を実現する総合情報サービスの提供\n3.高品質・高付加価値の追求\n4.世界視野での斬新な挑戦\n5.業界・地域・社会貢献', icon: 'Building2', category: 'mission_vision', order: 1 },
      { title: 'コーポレートステートメント', content: '情報技術で笑顔を創る知的集団', icon: 'Rocket', category: 'mission_vision', order: 2 },
      { title: 'パーパス', content: '多様な人材と技術力で、日本のITを支える', icon: 'Heart', category: 'mission_vision', order: 3 },
      { title: '経営目標', content: '続ける努力、止まらぬ歩み、進め、みんなでプライム市場', icon: 'Target', category: 'mission_vision', order: 4 },
      // Values
      { title: '営業戦略', content: '市場の変化に対応し、顧客との強固な関係を築くための戦略。', icon: 'Briefcase', category: 'values', order: 1 },
      { title: 'BP様戦略', content: 'ビジネスパートナー様との連携を強化し、共存共栄を目指す戦略。', icon: 'Handshake', category: 'values', order: 2 },
      { title: '人事戦略', content: '多様な人材が活躍できる組織作りと、個々の成長を支援する戦略。', icon: 'Users', category: 'values', order: 3 },
      { title: '経営リスクと危機管理', content: 'あらゆるリスクを想定し、事業の継続性を確保するための管理体制。', icon: 'Shield', category: 'values', order: 4 },
      { title: '組織改革', content: '変化に迅速に対応できる、柔軟で強靭な組織構造への変革。', icon: 'GitBranch', category: 'values', order: 5 },
    ];

    try {
      sampleData.forEach(item => {
        const docRef = doc(philosophyCollection);
        batch.set(docRef, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });
      await batch.commit();
      toast({ title: '成功', description: 'サンプルデータを登録しました。' });
    } catch(error) {
      console.error(error);
      toast({ title: 'エラー', description: 'サンプルデータの登録に失敗しました。', variant: 'destructive' });
    }
  };


  return (
    <div className="w-full space-y-6">
       <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">理念・ビジョン管理</h1>
        {allItems && allItems.length === 0 && !isLoading && (
          <Button onClick={handleSeedData} size="sm" variant="outline" className="ml-auto flex items-center gap-2">
            <Sparkles />
            サンプルデータを生成
          </Button>
        )}
      </div>

      {isLoading ? (
         <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
       <div className="grid gap-6">
          <PhilosophyListSection 
            title="理念・ビジョン"
            category="mission_vision"
            items={philosophy}
            onAddItem={(data) => handleAddItem('mission_vision', data)}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
          <PhilosophyListSection 
            title="考え方の継承"
            category="values"
            items={values}
            onAddItem={(data) => handleAddItem('values', data)}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
       </div>
      )}
    </div>
  );
}

    