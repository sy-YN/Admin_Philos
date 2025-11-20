
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, GripVertical } from 'lucide-react';
import { philosophyItems as initialPhilosophyItems, valuesItems as initialValuesItems } from '@/lib/company-philosophy';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type PhilosophyItem = (typeof initialPhilosophyItems)[number] | (typeof initialValuesItems)[number];
type Category = 'philosophy' | 'values';

function PhilosophyItemDialog({
  item,
  onSave,
  children
}: {
  item?: PhilosophyItem | null;
  onSave: (title: string, content: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item?.title || '');
  const [content, setContent] = useState(item?.content || '');

  const handleSave = () => {
    onSave(title, content);
    setOpen(false);
  };
  
  // Reset state when dialog opens
  useState(() => {
    if (open) {
      setTitle(item?.title || '');
      setContent(item?.content || '');
    }
  });


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? '項目を編集' : '新規項目を追加'}</DialogTitle>
          <DialogDescription>
            タイトルと内容を入力してください。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">タイトル</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">内容</Label>
            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
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
  onAddItem: (title: string, content: string) => void, 
  onEditItem: (id: string, title: string, content: string) => void, 
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
              <item.icon className="h-6 w-6 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground truncate">{item.content.split('\n')[0]}</p>
              </div>
              <div className="flex items-center gap-2">
                <PhilosophyItemDialog
                  item={item}
                  onSave={(title, content) => onEditItem(item.id, title, content)}
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
  const [philosophy, setPhilosophy] = useState(initialPhilosophyItems);
  const [values, setValues] = useState(initialValuesItems);
  
  const handleSaveItem = (category: Category, id: string | null, title: string, content: string) => {
    const setItems = category === 'philosophy' ? setPhilosophy : setValues;

    if (id) { // Edit
      setItems(prevItems => prevItems.map(item => item.id === id ? { ...item, title, content } : item));
      toast({ title: '成功', description: '項目を更新しました。' });
    } else { // Add
      const newItem = {
        // This is a mock, so we generate a temporary ID and use a default icon
        id: new Date().toISOString(),
        title,
        content,
        icon: initialPhilosophyItems[0].icon, // Use a default icon
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
            onAddItem={(title, content) => handleSaveItem('philosophy', null, title, content)}
            onEditItem={(id, title, content) => handleSaveItem('philosophy', id, title, content)}
            onDeleteItem={(id) => handleDeleteItem('philosophy', id)}
          />
          <PhilosophyListSection 
            title="考え方の継承"
            items={values}
            onAddItem={(title, content) => handleSaveItem('values', null, title, content)}
            onEditItem={(id, title, content) => handleSaveItem('values', id, title, content)}
            onDeleteItem={(id) => handleDeleteItem('values', id)}
          />
       </div>

    </div>
  );
}
