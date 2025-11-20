
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, GripVertical } from 'lucide-react';
import { philosophyItems as initialPhilosophyItems, valuesItems as initialValuesItems } from '@/lib/company-philosophy';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import type { LucideIcon } from 'lucide-react';
import { IconPicker } from '@/components/philosophy/icon-picker';
import { DynamicIcon } from '@/components/philosophy/dynamic-icon';


type PhilosophyItem = {
  id: string;
  title: string;
  content: string;
  icon: string; // Changed from LucideIcon to string
};

type Category = 'philosophy' | 'values';

function PhilosophyItemDialog({
  item,
  onSave,
  children
}: {
  item?: PhilosophyItem | null;
  onSave: (title: string, content: string, icon: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('Smile'); // Default icon

  const handleSave = () => {
    onSave(title, content, icon);
    setOpen(false);
  };
  
  useEffect(() => {
    if (open) {
      setTitle(item?.title || '');
      setContent(item?.content || '');
      setIcon(item?.icon || 'Smile');
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
  items, 
  onAddItem, 
  onEditItem, 
  onDeleteItem 
}: { 
  title: string, 
  items: PhilosophyItem[], 
  onAddItem: (title: string, content: string, icon: string) => void, 
  onEditItem: (id: string, title: string, content: string, icon: string) => void, 
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
                <p
                  className="text-sm text-muted-foreground truncate"
                >
                  {item.content}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PhilosophyItemDialog
                  item={item}
                  onSave={(title, content, icon) => onEditItem(item.id, title, content, icon)}
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
                          「{item.title}」を削除します。この操作は元に戻せません。(ページをリロードすると元に戻ります)
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
        <PhilosophyItemDialog onSave={onAddItem}>
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

  const convertInitial = (items: {id: string, title: string, content: string, icon: LucideIcon}[]) => {
      return items.map(item => ({...item, icon: item.icon.displayName || 'Smile' }))
  }

  const [philosophy, setPhilosophy] = useState(convertInitial(initialPhilosophyItems));
  const [values, setValues] = useState(convertInitial(initialValuesItems));
  
  const handleSaveItem = (category: Category, id: string | null, title: string, content: string, icon: string) => {
    const setItems = category === 'philosophy' ? setPhilosophy : setValues;

    if (id) { // Edit
      setItems(prevItems => prevItems.map(item => item.id === id ? { ...item, title, content, icon } : item));
      toast({ title: '成功', description: '項目を更新しました。' });
    } else { // Add
      const newItem: PhilosophyItem = {
        id: new Date().toISOString(),
        title,
        content,
        icon,
      };
      setItems(prevItems => [...prevItems, newItem]);
      toast({ title: '成功', description: '新しい項目を追加しました。' });
    }
  };

  const handleDeleteItem = (category: Category, id: string) => {
    const setItems = category === 'philosophy' ? setPhilosophy : setValues;
    setItems(prevItems => prevItems.filter(item => item.id !== id));
    toast({ title: '成功', description: '項目を削除しました。' });
  };


  return (
    <div className="w-full space-y-6">
       <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">理念・ビジョン管理</h1>
      </div>

       <div className="grid gap-6">
          <PhilosophyListSection 
            title="理念・ビジョン"
            items={philosophy}
            onAddItem={(title, content, icon) => handleSaveItem('philosophy', null, title, content, icon)}
            onEditItem={(id, title, content, icon) => handleSaveItem('philosophy', id, title, content, icon)}
            onDeleteItem={(id) => handleDeleteItem('philosophy', id)}
          />
          <PhilosophyListSection 
            title="考え方の継承"
            items={values}
            onAddItem={(title, content, icon) => handleSaveItem('values', null, title, content, icon)}
            onEditItem={(id, title, content, icon) => handleSaveItem('values', id, title, content, icon)}
            onDeleteItem={(id) => handleDeleteItem('values', id)}
          />
       </div>
    </div>
  );
}
