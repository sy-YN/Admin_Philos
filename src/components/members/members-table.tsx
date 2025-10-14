
'use client';

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Member } from '@/types/member';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface MembersTableProps {
  members: Member[];
  isLoading: boolean;
}

export function MembersTable({ members, isLoading }: MembersTableProps) {
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

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    // Firestore Timestamps need to be converted to JS Date objects
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


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>氏名</TableHead>
          <TableHead>権限</TableHead>
          <TableHead className="hidden md:table-cell">所属</TableHead>
          <TableHead className="hidden md:table-cell">登録日</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="font-medium">{member.displayName}</div>
              <div className="text-sm text-muted-foreground">{member.email}</div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{member.role}</Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {member.department || 'N/A'}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {formatDate(member.createdAt)}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
