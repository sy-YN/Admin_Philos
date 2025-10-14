
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import type { Member } from '@/types/member';

interface EditMemberDialogProps {
  member: Member;
}

export function EditMemberDialog({ member }: EditMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  // Initialize state with the member's current data
  const [displayName, setDisplayName] = useState(member.displayName);
  const [department, setDepartment] = useState(member.department || '');
  const [role, setRole] = useState(member.role);

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!firestore) {
      toast({
        title: 'エラー',
        description: 'データベースに接続できませんでした。',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(firestore, 'users', member.uid);

    try {
      const updatedData = {
        displayName,
        department,
        role,
        // We don't update createdAt, but we could add an `updatedAt` field
        // updatedAt: serverTimestamp(),
      };
      
      await updateDoc(userDocRef, updatedData);

      toast({
        title: '成功',
        description: 'メンバー情報が更新されました。',
      });
      
      setOpen(false);

    } catch (error: any) {
      console.error('Error updating member:', error);
      toast({
        title: 'エラー',
        description: 'メンバー情報の更新中にエラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full text-left">Edit</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleEditMember}>
          <DialogHeader>
            <DialogTitle>メンバー情報を編集</DialogTitle>
            <DialogDescription>
              メンバーの詳細情報を更新します。メールアドレスとパスワードは変更できません。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                メール
              </Label>
              <Input
                id="email"
                type="email"
                value={member.email}
                className="col-span-3"
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayName" className="text-right">
                氏名
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="col-span-3"
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                所属
              </Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                権限
              </Label>
               <select
                 id="role"
                 value={role}
                 onChange={(e) => setRole(e.target.value as Member['role'])}
                 className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 disabled={isLoading}
               >
                 <option value="employee">employee</option>
                 <option value="manager">manager</option>
                 <option value="executive">executive</option>
                 <option value="admin">admin</option>
               </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? '更新中...' : '情報を更新'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
