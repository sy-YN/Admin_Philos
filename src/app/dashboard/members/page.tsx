
'use client';
import { File, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MembersTable } from '@/components/members/members-table';
import { AddMemberDialog } from '@/components/members/add-member-dialog';
import { useCollection } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import type { Member } from '@/types/member';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns-tz';
import { ImportMembersDialog } from '@/components/members/import-members-dialog';

export default function MembersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const membersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: members, isLoading } = useCollection<Member>(membersQuery);

  const handleExport = () => {
    if (!members || members.length === 0) {
      toast({
        title: 'エクスポート失敗',
        description: 'エクスポートするメンバーがいません。',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['uid', 'displayName', 'email', 'role', 'employeeId', 'company', 'department', 'createdAt', 'updatedAt'];
    const headerString = headers.join(',');

    const replacer = (key: string, value: any) => value === null || value === undefined ? '' : value;

    const formatTimestamp = (timestamp: Timestamp | Date | undefined) => {
      if (!timestamp) return '';
      const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
      return format(date, 'yyyy-MM-dd HH:mm:ssXXX', { timeZone: 'Asia/Tokyo' });
    }

    const rowItems = members.map(row => {
      const orderedRow = {
        uid: row.uid,
        displayName: row.displayName,
        email: row.email,
        role: row.role,
        employeeId: row.employeeId || '',
        company: row.company || '',
        department: row.department || '',
        createdAt: formatTimestamp(row.createdAt),
        updatedAt: formatTimestamp(row.updatedAt)
      };
      return headers.map(fieldName => JSON.stringify(orderedRow[fieldName as keyof typeof orderedRow], replacer)).join(',');
    });

    const csv = [headerString, ...rowItems].join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const formattedDate = format(new Date(), 'yyyyMMddHHmmss', { timeZone: 'Asia/Tokyo'});
    link.setAttribute('download', `philos_members_${formattedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

     toast({
        title: 'エクスポート成功',
        description: 'メンバーデータがCSVファイルとしてダウンロードされました。',
      });
  };


  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">メンバー管理</h1>
        <div className="ml-auto flex items-center gap-2">
           <ImportMembersDialog />
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExport}>
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              エクスポート
            </span>
          </Button>
          <AddMemberDialog />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>メンバー</CardTitle>
          <CardDescription>
            組織内のすべてのメンバーを管理します。
          </CardDescription>
          <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="名前やメールアドレスで検索..." className="pl-10 max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <MembersTable members={members || []} isLoading={isLoading} />
        </CardContent>
      </Card>
    </>
  );
}
