
'use client';
import { useMemo, useState, useEffect } from 'react';
import { File, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MembersTable, type SortDescriptor } from '@/components/members/members-table';
import { AddMemberDialog } from '@/components/members/add-member-dialog';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Member } from '@/types/member';
import type { Organization } from '@/types/organization';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns-tz';
import { ImportMembersDialog } from '@/components/members/import-members-dialog';
import { DataTablePagination } from '@/components/ui/data-table-pagination';


export default function MembersPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'createdAt',
    direction: 'desc',
  });
  
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  }, [firestore, isUserLoading]);

  const organizationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'organizations'));
  }, [firestore]);

  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<Organization>(organizationsQuery);

  const { organizationsMap } = useMemo(() => {
    if (!organizations) {
      return { organizationsMap: new Map() };
    }
    const orgMap = new Map(organizations.map(o => [o.id, o]));
    return { organizationsMap: orgMap };
  }, [organizations]);

  const sortedAndFilteredMembers = useMemo(() => {
    if (!members) return [];
    
    let filtered = members;
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filtered = members.filter(member => 
            member.displayName.toLowerCase().includes(lowercasedTerm) ||
            member.email.toLowerCase().includes(lowercasedTerm)
        );
    }
    
    return [...filtered].sort((a, b) => {
        const first = a[sortDescriptor.column as keyof Member] ?? '';
        const second = b[sortDescriptor.column as keyof Member] ?? '';

        const valA = first instanceof Timestamp ? first.toMillis() : first;
        const valB = second instanceof Timestamp ? second.toMillis() : second;

        let cmp = String(valA).localeCompare(String(valB));
        if (sortDescriptor.direction === 'desc') {
            cmp *= -1;
        }
        return cmp;
    });

  }, [members, searchTerm, sortDescriptor]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, sortDescriptor, rowsPerPage]);

  const paginatedMembers = useMemo(() => {
    const startIndex = currentPage * rowsPerPage;
    return sortedAndFilteredMembers.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedAndFilteredMembers, currentPage, rowsPerPage]);

  const pageCount = Math.ceil(sortedAndFilteredMembers.length / rowsPerPage);

  const handleExport = () => {
    if (!members || members.length === 0) {
      toast({
        title: 'エクスポート失敗',
        description: 'エクスポートするメンバーがいません。',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['uid', 'displayName', 'email', 'role', 'employeeId', 'organizationId', 'company', 'createdAt', 'updatedAt'];
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
        organizationId: row.organizationId || '',
        company: row.company || '',
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

  const isLoading = isLoadingMembers || isLoadingOrgs;

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
          <AddMemberDialog organizations={organizations || []} />
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
              <Input 
                placeholder="名前やメールアドレスで検索..." 
                className="pl-10 max-w-sm" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
        </CardHeader>
        <CardContent>
          <MembersTable 
            members={paginatedMembers} 
            isLoading={isLoading} 
            organizations={organizations || []}
            organizationsMap={organizationsMap}
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
          />
        </CardContent>
        <CardFooter>
            <DataTablePagination
              count={sortedAndFilteredMembers.length}
              rowsPerPage={rowsPerPage}
              page={currentPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
            />
        </CardFooter>
      </Card>
    </>
  );
}
