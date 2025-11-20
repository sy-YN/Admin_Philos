
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, GripVertical } from 'lucide-react';
import { philosophyItems, valuesItems } from '@/lib/company-philosophy';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type PhilosophyItem = typeof philosophyItems[number] | typeof valuesItems[number];

function PhilosophyListSection({ title, items, onAddItem, onEditItem, onDeleteItem }: { title: string, items: PhilosophyItem[], onAddItem: () => void, onEditItem: (item: PhilosophyItem) => void, onDeleteItem: (item: PhilosophyItem) => void }) {
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
                <Button variant="ghost" size="icon" onClick={() => onEditItem(item)}>
                  <Edit className="h-4 w-4" />
                </Button>
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
                          「{item.title}」を削除します。この操作は元に戻せません。(DB未接続のため実際には削除されません)
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteItem(item)}>削除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full" onClick={onAddItem}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新規項目を追加
        </Button>
      </CardContent>
    </Card>
  );
}


export default function PhilosophyPage() {

  // DB接続がないため、UIのデモ用のハンドラを仮実装します。
  const handleAddItem = (category: string) => {
    alert(`「${category}」に新規項目を追加するダイアログを開きます。(モックアップ)`);
  };
  const handleEditItem = (item: PhilosophyItem) => {
    alert(`「${item.title}」を編集するダイアログを開きます。(モックアップ)`);
  };
  const handleDeleteItem = (item: PhilosophyItem) => {
    alert(`「${item.title}」を削除します。(モックアップ)`);
  };

  return (
    <div className="w-full space-y-6">
       <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">理念・ビジョン管理</h1>
      </div>

       <div className="grid gap-6">
          <PhilosophyListSection 
            title="理念・ビジョン"
            items={philosophyItems}
            onAddItem={() => handleAddItem('理念・ビジョン')}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
          <PhilosophyListSection 
            title="考え方の継承"
            items={valuesItems}
            onAddItem={() => handleAddItem('考え方の継承')}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
       </div>

    </div>
  );
}
