
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrganizationPicker } from '@/components/organization/organization-picker';


export default function MembersPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [organizationFilter, setOrganizationFilter] = useState('all');
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
    if (!members || !organizations) return [];
    
    let filtered = members;

    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(member => 
            member.displayName.toLowerCase().includes(lowercasedTerm) ||
            member.email.toLowerCase().includes(lowercasedTerm) ||
            (member.employeeId && member.employeeId.toLowerCase().includes(lowercasedTerm))
        );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    if (organizationFilter !== 'all') {
      const getDescendantIds = (parentId: string, orgs: Organization[]): string[] => {
          const directChildren = orgs.filter(o => o.parentId === parentId);
          let allDescendants: string[] = directChildren.map(c => c.id);
          directChildren.forEach(child => {
              allDescendants = [...allDescendants, ...getDescendantIds(child.id, orgs)];
          });
          return allDescendants;
      };
      
      const relevantOrgIds = [organizationFilter, ...getDescendantIds(organizationFilter, organizations)];
      
      filtered = filtered.filter(member => 
        member.organizationId && relevantOrgIds.includes(member.organizationId)
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

  }, [members, organizations, searchTerm, roleFilter, organizationFilter, sortDescriptor]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, roleFilter, organizationFilter, sortDescriptor, rowsPerPage]);

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
    <div className="flex h-full flex-col gap-4">
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
      
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-4">
              <div>
                  <CardTitle>メンバー</CardTitle>
                  <CardDescription>
                  組織内のすべてのメンバーを管理します。
                  </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                  <OrganizationPicker
                      organizations={organizations || []}
                      value={organizationFilter}
                      onChange={(value) => setOrganizationFilter(value || 'all')}
                      placeholder="すべての組織"
                      searchPlaceholder="組織を検索..."
                      className="w-full max-w-sm"
                      clearButtonText="すべての組織"
                  />
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                          placeholder="名前、メールアドレス、社員番号で検索..." 
                          className="pl-10" 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full max-w-[200px]">
                          <SelectValue placeholder="権限で絞り込み" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">すべての権限</SelectItem>
                          <SelectItem value="admin">管理者 (admin)</SelectItem>
                          <SelectItem value="executive">経営層 (executive)</SelectItem>
                          <SelectItem value="manager">マネージャー (manager)</SelectItem>
                          <SelectItem value="employee">従業員 (employee)</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
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
    </div>
  );
}
