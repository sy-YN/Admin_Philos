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
import { Loader2, PlusCircle } from 'lucide-react';
import { collection, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function AddMemberDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('employee');

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
    
    // This is a temporary solution. In a real app, you would use Firebase Functions
    // to create the user and the Firestore document in a single, atomic transaction.
    // Calling createUserWithEmailAndPassword on the client is not secure for this use case.
    const tempAuth = getAuth();

    try {
      // 1. Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const user = userCredential.user;

      // 2. Create the user document in Firestore
      const newMemberData = {
        uid: user.uid,
        email,
        displayName,
        department,
        role,
        createdAt: serverTimestamp(),
      };
      
      const userDocRef = doc(firestore, 'users', user.uid);
      // Using non-blocking update for better UX
      setDocumentNonBlocking(userDocRef, newMemberData, { merge: false });

      toast({
        title: '成功',
        description: '新しいメンバーが追加されました。',
      });
      
      // Reset form and close dialog
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            メンバー追加
          </span>
        </Button>
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
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                権限
              </Label>
               <select
                 id="role"
                 value={role}
                 onChange={(e) => setRole(e.target.value)}
                 className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
               >
                 <option value="employee">Employee</option>
                 <option value="manager">Manager</option>
                 <option value="executive">Executive</option>
                 <option value="admin">Admin</option>
               </select>
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
