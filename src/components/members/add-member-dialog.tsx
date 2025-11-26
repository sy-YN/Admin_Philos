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
import { useFirestore, useUser, useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { Member } from '@/types/member';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Combobox } from '../ui/combobox';

interface AddMemberDialogProps {
  companyOptions: { value: string; label: string }[];
  departmentOptions: { value: string; label: string }[];
}


export function AddMemberDialog({ companyOptions, departmentOptions }: AddMemberDialogProps) {
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
  const [role, setRole] = useState<Member['role'] | ''>('');
  
  const isFirstAdmin = !user;
  
  const resetForm = () => {
      setEmail('');
      setPassword('');
      setDisplayName('');
      setEmployeeId('');
      setCompany('');
      setDepartment('');
      setRole('');
  }

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
    
    if (!role && !isFirstAdmin) {
      toast({
        title: 'エラー',
        description: '権限を選択してください。',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      const avatarUrl = `https://picsum.photos/seed/${newUser.uid}/100/100`;
      const finalRole = isFirstAdmin ? 'admin' : role;

      const newMemberData: Omit<Member, 'updatedAt' | 'createdAt'> & { updatedAt: any, createdAt: any } = {
        uid: newUser.uid,
        email,
        displayName,
        employeeId,
        company,
        department,
        role: finalRole as Member['role'],
        avatarUrl: avatarUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const userDocRef = doc(firestore, 'users', newUser.uid);
      
      await setDoc(userDocRef, newMemberData);

      toast({
        title: '成功',
        description: `新しいメンバー「${displayName}」が追加されました。`,
      });
      
      resetForm();
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
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            resetForm();
        }
    }}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleAddMember}>
          <DialogHeader>
            <DialogTitle>{isFirstAdmin ? '最初の管理者アカウントを作成' : '新しいメンバーを追加'}</DialogTitle>
            <DialogDescription>
              {isFirstAdmin ? 'このアカウントで管理画面にログインします。' : '新しいメンバーの詳細情報を入力してください。'}
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
              <Combobox
                  options={companyOptions}
                  value={company}
                  onChange={setCompany}
                  placeholder="会社を選択・入力..."
                  searchPlaceholder="会社を検索..."
                  emptyResultText="会社が見つかりません。"
                  className="col-span-3"
                  disabled={isLoading}
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                所属部署
              </Label>
              <Combobox
                  options={departmentOptions}
                  value={department}
                  onChange={setDepartment}
                  placeholder="部署を選択・入力..."
                  searchPlaceholder="部署を検索..."
                  emptyResultText="部署が見つかりません。"
                  className="col-span-3"
                  disabled={isLoading}
                />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                権限
              </Label>
              {isFirstAdmin ? (
                <Input
                  value="管理者 (admin)"
                  className="col-span-3"
                  disabled
                />
              ) : (
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as Member['role'])}
                  disabled={isLoading}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="権限を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理者 (admin)</SelectItem>
                    <SelectItem value="executive">経営層 (executive)</SelectItem>
                    <SelectItem value="manager">マネージャー (manager)</SelectItem>
                    <SelectItem value="employee">従業員 (employee)</SelectItem>
                  </SelectContent>
                </Select>
              )}
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
