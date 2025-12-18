
'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Member } from '@/types/member';
import type { Organization } from '@/types/organization';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { EditMemberDialog } from './edit-member-dialog';

interface MembersTableProps {
  members: Member[];
  isLoading: boolean;
  organizations: Organization[];
  organizationsMap: Map<string, Organization>;
}

const getBadgeVariantForRole = (role: Member['role']): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'executive':
      return 'default';
    case 'manager':
      return 'secondary';
    default:
      return 'outline';
  }
};


// Separate component for the row to manage its own state
function MemberTableRow({ 
    member, 
    organizations,
    organizationsMap
}: { 
    member: Member, 
    organizations: Organization[],
    organizationsMap: Map<string, Organization> 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useUser();

  const handleDeleteMember = async (uid: string) => {
    try {
      const response = await fetch('/api/deleteUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '不明なエラーが発生しました。');
      }

      toast({
        title: '成功',
        description: `メンバー「${member.displayName}」を完全に削除しました。`,
      });
    } catch(error) {
       console.error("Error deleting member:", error);
       toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'メンバーの削除中にエラーが発生しました。',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const jsDate = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(jsDate.getTime())) {
        return '無効な日付';
      }
      return format(jsDate, 'yyyy/MM/dd HH:mm', { locale: ja });
    } catch (error) {
      console.error("Error formatting date:", date, error);
      return '日付エラー';
    }
  };

  const isCurrentUser = currentUser?.uid === member.uid;
  const organizationName = member.organizationId ? organizationsMap.get(member.organizationId)?.name : '未所属';

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{member.displayName}</div>
        <div className="text-sm text-muted-foreground">{member.email}</div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {member.employeeId || 'N/A'}
      </TableCell>
       <TableCell className="hidden md:table-cell">
        {organizationName}
      </TableCell>
       <TableCell className="hidden md:table-cell">
        {member.company || '未設定'}
      </TableCell>
      <TableCell>
        <Badge variant={getBadgeVariantForRole(member.role)}>{member.role}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {formatDate(member.createdAt)}
      </TableCell>
      <TableCell>
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <EditMemberDialog 
                member={member} 
                onSuccess={() => setIsMenuOpen(false)} 
                organizations={organizations}
             >
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                編集
              </DropdownMenuItem>
            </EditMemberDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                 <DropdownMenuItem 
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    disabled={isCurrentUser}
                  >
                    削除
                 </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    この操作は元に戻せません。メンバー「{member.displayName}」のデータがデータベースと認証情報から完全に削除されます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteMember(member.uid)}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    削除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}


export function MembersTable({ members, isLoading, organizations, organizationsMap }: MembersTableProps) {
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        メンバーが見つかりません。
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>氏名/メール</TableHead>
          <TableHead className="hidden sm:table-cell">社員番号</TableHead>
          <TableHead className="hidden md:table-cell">所属部署</TableHead>
          <TableHead className="hidden md:table-cell">所属会社</TableHead>
          <TableHead>権限</TableHead>
          <TableHead className="hidden md:table-cell">登録日</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <MemberTableRow 
            key={member.uid} 
            member={member} 
            organizations={organizations}
            organizationsMap={organizationsMap}
          />
        ))}
      </TableBody>
    </Table>
  );
}
