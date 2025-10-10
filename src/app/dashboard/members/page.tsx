'use client';
import { File, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MembersTable } from '@/components/members/members-table';
import { AddMemberDialog } from '@/components/members/add-member-dialog';
// import { useCollection } from '@/firebase';
// import { collection, query, orderBy } from 'firebase/firestore';
// import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import type { Member } from '@/types/member';

// ダミーデータ
const dummyMembers: Member[] = [
  {
    id: '1',
    uid: 'uid-1',
    displayName: '山田 太郎',
    email: 'taro.yamada@example.com',
    department: '営業部',
    role: 'employee',
    createdAt: new Date(),
  },
  {
    id: '2',
    uid: 'uid-2',
    displayName: '鈴木 花子',
    email: 'hanako.suzuki@example.com',
    department: '開発部',
    role: 'manager',
    createdAt: new Date(),
  },
  {
    id: '3',
    uid: 'uid-admin',
    displayName: '佐藤 管理者',
    email: 'admin@philos.co',
    department: 'IT',
    role: 'admin',
    createdAt: new Date(),
  },
];


export default function MembersPage() {
  // const firestore = useFirestore();
  
  // const membersQuery = useMemoFirebase(() => {
  //   if (!firestore) return null;
  //   return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  // }, [firestore]);

  // const { data: members, isLoading } = useCollection<Member>(membersQuery);
  
  // ダミーデータをコンポーネントに渡す
  const members = dummyMembers;
  const isLoading = false;

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">メンバー管理</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export
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