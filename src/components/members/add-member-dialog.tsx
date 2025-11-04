
'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, PlusCircle, UserPlus } from 'lucide-react';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { Member } from '@/types/member';

export function AddMemberDialog() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  
  const isFirstAdmin = !user;
  const role: Member['role'] = 'admin'; // Role is always admin

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!firestore || !auth) {
      toast({
        title: 'エラー',
        description: 'システムが初期化されていません。',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      const newMemberData = {
        uid: newUser.uid,
        email,
        displayName,
        employeeId,
        company,
        department,
        role,
        avatarUrl: '', // auto-generated later
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const userDocRef = doc(firestore, 'users', newUser.uid);
      
      await setDoc(userDocRef, newMemberData);

      toast({
        title: '成功',
        description: `新しい管理者「${displayName}」が追加されました。`,
      });
      
      setEmail('');
      setPassword('');
      setDisplayName('');
      setEmployeeId('');
      setCompany('');
      setDepartment('');
      setOpen(false);

    } catch (error: any) {
      let description = 'メンバーの追加中にエラーが発生しました。';
      if (error.code === 'auth/email-already-in-use') {
        description = 'このメールアドレスは既に使用されています。';
      } else if (error.code === 'auth/weak-password') {
        description = 'パスワードは6文字以上で入力してください。';
      }
      toast({
        title: 'エラー',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerButton = isFirstAdmin ? (
      <Button variant="outline" className="w-full">
        <UserPlus className="mr-2 h-4 w-4" />
        最初の管理者アカウントを作成
      </Button>
    ) : (
      <Button size="sm" className="h-8 gap-1">
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          メンバー追加
        </span>
      </Button>
    );


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleAddMember}>
          <DialogHeader>
            <DialogTitle>{isFirstAdmin ? '最初の管理者アカウントを作成' : '新しい管理者を追加'}</DialogTitle>
            <DialogDescription>
              {isFirstAdmin ? 'このアカウントで管理画面にログインします。' : '新しい管理者の詳細情報を入力してください。'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="email" className="text-right">
                メール
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                required
                disabled={isLoading}
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                パスワード
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                required
                disabled={isLoading}
                placeholder="6文字以上"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employeeId" className="text-right">
                社員番号
              </Label>
              <Input
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company" className="text-right">
                所属会社
              </Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                所属部署
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
              <Label className="text-right">
                権限
              </Label>
               <Input
                value="管理者 (admin)"
                className="col-span-3"
                disabled
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? '追加中...' : 'メンバーを追加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
