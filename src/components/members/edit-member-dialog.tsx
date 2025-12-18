
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
import { Loader2 } from 'lucide-react';
import { doc, updateDoc, serverTimestamp, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import type { Member } from '@/types/member';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Combobox } from '../ui/combobox';
import { Checkbox } from '../ui/checkbox';
import type { Organization } from '@/types/organization';

interface EditMemberDialogProps {
  member: Member;
  organizations: Organization[];
  onSuccess?: () => void;
  children: React.ReactNode;
  organizationOptions: { value: string; label: string }[];
}

const findCompanyName = (orgId: string, orgs: Organization[]): string => {
    const orgsMap = new Map(orgs.map(o => [o.id, o]));
    let currentOrg = orgsMap.get(orgId);
    while (currentOrg) {
        if (currentOrg.type === 'company' || currentOrg.type === 'holding') {
            return currentOrg.name;
        }
        if (!currentOrg.parentId) {
            return orgsMap.get(orgId)?.name || '';
        }
        currentOrg = orgsMap.get(currentOrg.parentId);
    }
    return '';
};

export function EditMemberDialog({ member, organizations, onSuccess, children, organizationOptions }: EditMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const [displayName, setDisplayName] = useState(member.displayName);
  const [employeeId, setEmployeeId] = useState(member.employeeId || '');
  const [organizationId, setOrganizationId] = useState(member.organizationId || '');
  const [role, setRole] = useState<Member['role']>(member.role);
  const [isGoalManager, setIsGoalManager] = useState(false);
  
  const originalOrganizationId = member.organizationId;

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setDisplayName(member.displayName);
      setEmployeeId(member.employeeId || '');
      setOrganizationId(member.organizationId || '');
      setRole(member.role);
      
      // Check if user is a manager of their current organization
      if (member.organizationId) {
        const org = organizations.find(o => o.id === member.organizationId);
        setIsGoalManager(org?.managerUids.includes(member.uid) || false);
      } else {
        setIsGoalManager(false);
      }
    }
  }, [open, member, organizations]);

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
      const companyName = organizationId ? findCompanyName(organizationId, organizations) : '';

      const updatedData: Partial<Member> & { updatedAt: any } = {
        displayName,
        employeeId,
        organizationId: organizationId || null,
        company: companyName, // Set company name based on new organization
        role,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(userDocRef, updatedData);

      // Handle goal manager status change
      const currentOrg = organizations.find(o => o.id === organizationId);
      const isCurrentlyManager = currentOrg?.managerUids.includes(member.uid) || false;

      // Case 1: Was manager, now is not
      if (isCurrentlyManager && !isGoalManager && organizationId) {
        await updateDoc(doc(firestore, 'organizations', organizationId), { managerUids: arrayRemove(member.uid) });
      }
      // Case 2: Was not manager, now is
      else if (!isCurrentlyManager && isGoalManager && organizationId) {
        await updateDoc(doc(firestore, 'organizations', organizationId), { managerUids: arrayUnion(member.uid) });
      }

      // Case 3: Organization changed, remove from old org's manager list
      if (originalOrganizationId && originalOrganizationId !== organizationId) {
        const oldOrg = organizations.find(o => o.id === originalOrganizationId);
        if (oldOrg?.managerUids.includes(member.uid)) {
            await updateDoc(doc(firestore, 'organizations', originalOrganizationId), { managerUids: arrayRemove(member.uid) });
        }
      }

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
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleEditMember}>
          <DialogHeader>
            <DialogTitle>メンバー情報を編集</DialogTitle>
            <DialogDescription>
              メンバーの詳細情報を更新します。メールアドレスは変更できません。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid gap-2">
              <Label htmlFor="email">
                メール
              </Label>
              <Input
                id="email"
                type="email"
                value={member.email}
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="displayName">
                氏名
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="employeeId">
                社員番号
              </Label>
              <Input
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={isLoading}
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="organization">
                所属組織
              </Label>
              <Combobox
                  options={organizationOptions}
                  value={organizationId}
                  onChange={setOrganizationId}
                  placeholder="組織を選択..."
                  searchPlaceholder="組織を検索..."
                  emptyResultText="組織が見つかりません。"
                  disabled={isLoading}
                />
            </div>
             <div className="grid gap-2">
              <Label>
                権限
              </Label>
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
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="isGoalManager"
                    checked={isGoalManager}
                    onCheckedChange={(checked) => setIsGoalManager(!!checked)}
                    disabled={isLoading || !organizationId}
                />
                <Label htmlFor="isGoalManager" className="text-sm font-normal">
                    所属組織の目標管理者に設定する
                </Label>
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
