
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
import { Loader2 } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import type { Member } from '@/types/member';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditMemberDialogProps {
  member: Member;
  onSuccess?: () => void;
}

export function EditMemberDialog({ member, onSuccess }: EditMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

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
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(userDocRef, updatedData);

      toast({
        title: '成功',
        description: 'メンバー情報が更新されました。',
      });
      
      onSuccess?.();
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
        <button className="w-full text-left">編集</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleEditMember}>
          <DialogHeader>
            <DialogTitle>メンバー情報を編集</DialogTitle>
            <DialogDescription>
              メンバーの詳細情報を更新します。メールアドレスは変更できません。
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
              <Select 
                value={role} 
                onValueChange={(value) => setRole(value as Member['role'])}
                disabled={isLoading}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="権限を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">employee</SelectItem>
                  <SelectItem value="manager">manager</SelectItem>
                  <SelectItem value="executive">executive</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
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
