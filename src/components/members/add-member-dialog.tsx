
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
import { useUser, useAuth, useFirestore, useCollection } from '@/firebase';
import type { Member } from '@/types/member';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrganizationPicker } from '../organization/organization-picker';
import type { NewUserPayload } from '@/types/functions';
import type { Organization } from '@/types/organization';

interface AddMemberDialogProps {
  organizationOptions?: { value: string; label: string }[];
  organizations?: Organization[];
}

export function AddMemberDialog({ organizationOptions = [], organizations = [] }: AddMemberDialogProps) {
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
  const [organizationId, setOrganizationId] = useState('');
  const [role, setRole] = useState<Member['role'] | ''>('');
  
  const isFirstAdmin = !user;
  
  const resetForm = () => {
      setEmail('');
      setPassword('');
      setDisplayName('');
      setEmployeeId('');
      setOrganizationId('');
      setRole('');
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!auth || !firestore) {
      toast({
        title: 'エラー',
        description: 'システムが初期化されていません。',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    
    const requiredFields = [displayName, email, password];
    if (!isFirstAdmin) {
        requiredFields.push(role);
    }
    if (requiredFields.some(field => !field)) {
       toast({
        title: '入力エラー',
        description: 'すべての必須項目を入力してください。',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const newUserPayload: NewUserPayload = {
      email,
      password,
      displayName,
      role: (isFirstAdmin ? 'admin' : role) as Member['role'],
      employeeId,
      organizationId: organizationId || null,
    };

    try {
      const response = await fetch('/api/batchImportUsers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: [newUserPayload] }),
      });

      const result = await response.json();

      if (!response.ok || result.errorCount > 0) {
        throw new Error(result.results[0]?.error || '不明なサーバーエラーが発生しました。');
      }

      toast({
        title: '成功',
        description: `新しいメンバー「${displayName}」が追加されました。`,
      });
      
      resetForm();
      setOpen(false);

    } catch (error: any) {
      let description = error.message || 'メンバーの追加中にエラーが発生しました。';
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
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleAddMember}>
          <DialogHeader>
            <DialogTitle>{isFirstAdmin ? '最初の管理者アカウントを作成' : '新しいメンバーを追加'}</DialogTitle>
            <DialogDescription>
              {isFirstAdmin ? 'このアカウントで管理画面にログインします。' : '新しいメンバーの詳細情報を入力してください。'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="displayName">氏名</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="email">メール</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="6文字以上"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employeeId">社員番号</Label>
              <Input
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="organization">所属組織</Label>
               <OrganizationPicker
                  organizations={organizations}
                  value={organizationId}
                  onChange={setOrganizationId}
                  disabled={isLoading}
                />
            </div>
             <div className="grid gap-2">
               {isFirstAdmin ? (
                  <Input
                    value="管理者 (admin)"
                    disabled
                  />
              ) : (
                <>
                  <Label htmlFor="role">権限</Label>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as Member['role'])}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="権限を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">管理者 (admin)</SelectItem>
                      <SelectItem value="executive">経営層 (executive)</SelectItem>
                      <SelectItem value="manager">マネージャー (manager)</SelectItem>
                      <SelectItem value="employee">従業員 (employee)</SelectItem>
                    </SelectContent>
                  </Select>
                </>
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
