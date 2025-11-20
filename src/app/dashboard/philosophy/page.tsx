
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, GripVertical, Bold } from 'lucide-react';
import { philosophyItems as initialPhilosophyItems, valuesItems as initialValuesItems } from '@/lib/company-philosophy';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

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
  const [title, setTitle] = useState('');
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    const newContent = contentEditableRef.current?.innerHTML || '';
    onSave(title, newContent);
    setOpen(false);
  };
  
  useEffect(() => {
    if (open) {
      setTitle(item?.title || '');
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML = item?.content || '';
      }
    }
  }, [item, open]);

  const handleCommand = (command: string, value?: string) => {
    // Prevent default browser action and apply the command
    document.execCommand(command, false, value);
  };

  const colors = ['#000000', '#dc2626', '#2563eb', '#16a34a']; // Black, Red, Blue, Green

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
            <div className="rounded-md border border-input">
              <div className="p-2 border-b flex items-center gap-1">
                 <Button type="button" variant="outline" size="icon" onMouseDown={(e) => {e.preventDefault(); handleCommand('bold');}}>
                   <Bold className="h-4 w-4" />
                 </Button>
                 <div className="h-6 w-px bg-border mx-1"></div>
                 {colors.map(color => (
                    <Button
                      key={color}
                      type="button"
                      variant="outline"
                      size="icon"
                      onMouseDown={(e) => {e.preventDefault(); handleCommand('foreColor', color);}}
                      className="h-8 w-8"
                    >
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                    </Button>
                 ))}
              </div>
              <div
                ref={contentEditableRef}
                contentEditable
                className="prose prose-sm min-h-[100px] w-full rounded-b-md bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
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
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold">{item.title}</p>
                <div
                  className="text-sm text-muted-foreground truncate"
                  dangerouslySetInnerHTML={{ __html: item.content.split('<br>')[0] }}
                />
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
