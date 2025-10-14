
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
import { Loader2, PlusCircle, UserPlus } from 'lucide-react';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useUser } from '@/firebase';
import type { Member } from '@/types/member';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AddMemberDialog() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<Member['role']>('employee');

  const handleAddMember = async (e: React.FormEvent) => {
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
    
    // 注意: この方法はクライアントサイドでユーザーを作成するため、
    // 本来はFirebase Functionsを介してサーバーサイドで実行するのが最も安全です。
    // 今回は開発の簡便性を優先し、クライアントから直接呼び出しています。
    // 管理者ユーザーのみがこの操作を実行できるように、セキュリティルールを適切に設定する必要があります。
    const tempAuth = getAuth();

    try {
      // 1. Firebase Authenticationでユーザーを作成
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newUser = userCredential.user;

      // 2. Firestoreにユーザーのドキュメントを作成
      const newMemberData = {
        uid: newUser.uid,
        email,
        displayName,
        department,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const userDocRef = doc(firestore, 'users', newUser.uid);
      
      await setDoc(userDocRef, newMemberData);

      toast({
        title: '成功',
        description: '新しいメンバーが追加されました。',
      });
      
      // フォームをリセットしてダイアログを閉じる
      setEmail('');
      setPassword('');
      setDisplayName('');
      setDepartment('');
      setRole('employee');
      setOpen(false);

    } catch (error: any) {
      console.error('Error adding member:', error);
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

  const triggerButton = user ? (
      <Button size="sm" className="h-8 gap-1">
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          メンバー追加
        </span>
      </Button>
    ) : (
      <Button variant="outline" className="w-full">
        <UserPlus className="mr-2 h-4 w-4" />
        最初の管理者アカウントを作成
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
            <DialogTitle>新しいメンバーを追加</DialogTitle>
            <DialogDescription>
              新しいメンバーの詳細情報を入力してください。
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
                メールアドレス
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
              {isLoading ? '追加中...' : 'メンバーを追加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
