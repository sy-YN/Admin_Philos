
'use client';

import { Suspense } from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShieldAlert, Loader2, User, UserCog, Sparkles, MoreHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, setDoc, getDocs, writeBatch, serverTimestamp, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Role } from '@/types/role';
import type { UserPermission } from '@/types/user-permission';
import type { Member } from '@/types/member';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

const permissionGroups = [
  { name: 'ユーザー・組織', permissions: [{ id: 'members', name: 'メンバー管理' }, { id: 'organization', name: '組織管理' }] },
  { name: '管理機能', permissions: [{ id: 'permissions', name: '権限管理' }, { id: 'appearance_management', name: '外観設定' }] },
  {
    name: 'コンテンツ管理',
    permissions: [
      { id: 'video_management', name: 'ビデオ' },
      { id: 'message_management', name: 'メッセージ' },
      { id: 'proxy_post_video', name: '代理投稿(ビデオ)' },
      { id: 'proxy_post_message', name: '代理投稿(メッセージ)' },
    ],
  },
  { name: 'コメント投稿', permissions: [{ id: 'can_comment', name: 'コメント投稿' }] },
  { name: '理念管理', permissions: [{ id: 'philosophy', name: '理念管理' }] },
  { name: 'カレンダー設定', permissions: [{ id: 'calendar', name: 'カレンダー設定' }] },
  {
    name: '目標設定',
    permissions: [
      { id: 'company_goal_setting', name: '会社目標' },
      { id: 'org_personal_goal_setting', name: '組織・個人目標' },
    ],
  },
  { name: 'ランキング設定', permissions: [{ id: 'ranking', name: 'ランキング設定' }] },
];


const permissionColumns = permissionGroups.flatMap(g => g.permissions);
const allPermissionItems = permissionColumns.map(p => ({ id: p.id, name: p.name }));

const roleDefinitions: Omit<Role, 'id'>[] = [
    { id: 'admin', name: '管理者', permissions: allPermissionItems.map(p => p.id) },
    { id: 'executive', name: '経営層', permissions: [
        'video_management', 'message_management', 'proxy_post_video', 'proxy_post_message', 
        'can_comment', 
        'philosophy', 
        'calendar', 
        'company_goal_setting', 'org_personal_goal_setting', 
        'ranking',
    ]},
    { id: 'manager', name: 'マネージャー', permissions: ['can_comment', 'org_personal_goal_setting'] },
    { id: 'employee', name: '従業員', permissions: ['can_comment'] },
];

function PermissionsPageComponent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const [selectedTab, setSelectedTab] = useState(tab || 'roles');

  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser, isUserLoading } = useUser();
  
  const rolesQuery = useMemoFirebase(() => !firestore || isUserLoading ? null : query(collection(firestore, 'roles')), [firestore, isUserLoading]);
  const userPermsQuery = useMemoFirebase(() => !firestore || isUserLoading ? null : query(collection(firestore, 'user_permissions')), [firestore, isUserLoading]);
  const usersQuery = useMemoFirebase(() => !firestore || isUserLoading ? null : query(collection(firestore, 'users')), [firestore, isUserLoading]);

  const { data: rolesData, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  const { data: userPermsData, isLoading: isLoadingUserPerms } = useCollection<UserPermission>(userPermsQuery);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<Member>(usersQuery);

  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [individualPermissions, setIndividualPermissions] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const rolesMap = useMemo(() => new Map(rolesData?.map(role => [role.id, role.permissions])), [rolesData]);

  const paginatedUsers = useMemo(() => {
    if (!usersData) return [];
    const startIndex = currentPage * rowsPerPage;
    return usersData.slice(startIndex, startIndex + rowsPerPage);
  }, [usersData, currentPage, rowsPerPage]);

  const pageCount = useMemo(() => {
      return Math.ceil((usersData?.length || 0) / rowsPerPage);
  }, [usersData, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedTab, rowsPerPage]);


  useEffect(() => {
    if (rolesData) {
      const perms: Record<string, string[]> = {};
      rolesData.forEach(role => {
        perms[role.id] = role.permissions;
      });
      setRolePermissions(perms);
    }
  }, [rolesData]);
  
  useEffect(() => {
    if (userPermsData) {
        const perms: Record<string, string[]> = {};
        userPermsData.forEach(userPerm => {
            perms[userPerm.id] = userPerm.permissions || [];
        });
        setIndividualPermissions(perms);
    }
  }, [userPermsData]);

  useEffect(() => {
    if (tab) {
        setSelectedTab(tab);
    }
  }, [tab]);

  const handleRolePermissionChange = (roleId: string, permissionId: string, checked: boolean) => {
    setRolePermissions(prev => {
      const currentRolePermissions = prev[roleId] || [];
      const newPermissions = checked
        ? [...currentRolePermissions, permissionId]
        : currentRolePermissions.filter(p => p !== permissionId);
      return { ...prev, [roleId]: newPermissions };
    });
  };
  
  const handleIndividualPermissionChange = (userId: string, permissionId: string, checked: boolean) => {
    setIndividualPermissions(prev => {
        const user = usersData?.find(u => u.uid === userId);
        if(!user) return prev;

        const basePermissions = prev[userId] !== undefined 
          ? prev[userId] 
          : (rolesMap.get(user.role) || []);

        const newPermissions = checked 
          ? [...basePermissions, permissionId] 
          : basePermissions.filter(p => p !== permissionId);
        
        return { ...prev, [userId]: [...new Set(newPermissions)] };
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!firestore) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    
    Object.entries(rolePermissions).forEach(([roleId, perms]) => {
      const roleRef = doc(firestore, 'roles', roleId);
      batch.update(roleRef, { permissions: perms });
    });

    try {
      await batch.commit();
      toast({ title: '成功', description: '役割別の権限設定を保存しました。' });
    } catch (error) {
      console.error("Error saving role permissions:", error);
      toast({ title: 'エラー', description: '権限設定の保存に失敗しました。', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveIndividualPermissions = async () => {
    if (!firestore || !currentUser) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    
    Object.entries(individualPermissions).forEach(([userId, perms]) => {
      const userPermRef = doc(firestore, 'user_permissions', userId);
      batch.set(userPermRef, { 
        userId,
        permissions: perms,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      }, { merge: true });
    });

    try {
      await batch.commit();
      toast({ title: '成功', description: 'ユーザー個別権限を保存しました。' });
    } catch (error) {
      console.error("Error saving individual permissions:", error);
      toast({ title: 'エラー', description: '個別権限の保存に失敗しました。', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetIndividualPermissions = async (userId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'user_permissions', userId));
      setIndividualPermissions(prev => {
        const newPerms = { ...prev };
        delete newPerms[userId];
        return newPerms;
      });
      toast({ title: '成功', description: '個別設定をリセットし、役割の権限が適用されます。' });
    } catch (error) {
      console.error("Error resetting individual permissions:", error);
      toast({ title: 'エラー', description: '個別設定のリセットに失敗しました。', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedRoles = async () => {
    if (!firestore) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    roleDefinitions.forEach(role => {
      const roleRef = doc(firestore, 'roles', role.id);
      batch.set(roleRef, { name: role.name, permissions: role.permissions });
    });

    try {
      await batch.commit();
      toast({ title: '成功', description: '初期の役割データを登録しました。' });
    } catch (error) {
      console.error("Error seeding roles:", error);
      toast({ title: 'エラー', description: '初期データの登録に失敗しました。', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const isLoading = isUserLoading || isLoadingRoles || isLoadingUserPerms || isLoadingUsers;

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">権限管理</h1>
      </div>
      
       <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">役割別権限</TabsTrigger>
          <TabsTrigger value="users">ユーザー個別権限</TabsTrigger>
        </TabsList>
        <TabsContent value="roles" className="mt-6">
            <Card>
                <CardHeader>
                <CardTitle>役割別メニューアクセス設定</CardTitle>
                <CardDescription>役割（ロール）ごとに、管理画面でアクセスできる機能を設定します。</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    {isLoading ? <div className="flex h-full items-center justify-center p-4"><Loader2 className="animate-spin" /></div> : rolesData && rolesData.length > 0 ? (
                        <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead rowSpan={2} className="w-[120px] sticky left-0 bg-background z-20 px-2 align-middle border-b">役割</TableHead>
                                {permissionGroups.map(group => (
                                    <TableHead key={group.name} colSpan={group.permissions.length} className="text-center p-1 border-l border-b min-w-[100px]">{group.name}</TableHead>
                                ))}
                            </TableRow>
                            <TableRow>
                                {permissionColumns.map(col => {
                                const group = permissionGroups.find(g => g.permissions.some(p => p.id === col.id));
                                const isFirstInGroup = group?.permissions[0].id === col.id;
                                return (
                                    <TableHead key={col.id} className={'text-center px-1 text-xs text-muted-foreground font-normal ' + (isFirstInGroup ? 'border-l' : '')}>
                                    {col.name}
                                    </TableHead>
                                )
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rolesData.sort((a,b) => roleDefinitions.findIndex(def => def.id === a.id) - roleDefinitions.findIndex(def => def.id === b.id)).map(role => (
                            <TableRow key={role.id}>
                                <TableCell className="font-medium sticky left-0 bg-background z-10 px-2">{role.name}</TableCell>
                                {permissionColumns.map(col => {
                                const group = permissionGroups.find(g => g.permissions.some(p => p.id === col.id));
                                const isFirstInGroup = group?.permissions[0].id === col.id;
                                return (
                                <TableCell key={col.id} className={'text-center p-1 ' + (isFirstInGroup ? 'border-l' : '')}>
                                    <Checkbox
                                    checked={rolePermissions[role.id]?.includes(col.id)}
                                    onCheckedChange={(checked) => handleRolePermissionChange(role.id, col.id, !!checked)}
                                    disabled={role.id === 'admin' || isSaving}
                                    aria-label={`${role.name} - ${col.name}`}
                                    />
                                </TableCell>
                                )
                                })}
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>役割データが見つかりません。</p>
                            <Button onClick={handleSeedRoles} disabled={isSaving} variant="outline" className="mt-4">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                初期の役割データを登録する
                            </Button>
                        </div>
                    )}
                  </div>
                </CardContent>
                {rolesData && rolesData.length > 0 && (
                    <CardFooter>
                        <div className="flex w-full justify-end mt-4">
                            <Button onClick={handleSaveRolePermissions} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                役割権限を保存
                            </Button>
                        </div>
                    </CardFooter>
                )}
            </Card>
        </TabsContent>
        <TabsContent value="users" className="mt-6 flex-1 flex flex-col">
            <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>ユーザー個別権限の管理</CardTitle>
                        <CardDescription>役割の権限を基本とし、ユーザーごとに特定の権限をチェックでON/OFFします。</CardDescription>
                    </div>
                    <Button onClick={handleSaveIndividualPermissions} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        個別権限を保存
                    </Button>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
                    {isLoading ? <div className="flex h-full items-center justify-center p-4"><Loader2 className="animate-spin" /></div> : (
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-20">
                            <TableRow>
                                <TableHead rowSpan={2} className="w-[180px] sticky left-0 bg-background z-30 px-2 align-middle border-b">ユーザー</TableHead>
                                {permissionGroups.map(group => (
                                    <TableHead key={group.name} colSpan={group.permissions.length} className="text-center p-1 border-l border-b min-w-[100px]">{group.name}</TableHead>
                                ))}
                                <TableHead rowSpan={2} className="w-[80px] sticky right-0 bg-background z-30 px-2 align-middle border-b text-center">操作</TableHead>
                            </TableRow>
                            <TableRow>
                                {permissionColumns.map(col => {
                                    const group = permissionGroups.find(g => g.permissions.some(p => p.id === col.id));
                                    const isFirstInGroup = group?.permissions[0].id === col.id;
                                    return (
                                    <TableHead key={col.id} className={'text-center px-1 text-xs text-muted-foreground font-normal ' + (isFirstInGroup ? 'border-l' : '')}>
                                        {col.name}
                                    </TableHead>
                                    )
                                })}
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(paginatedUsers || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={permissionColumns.length + 2} className="h-24 text-center text-muted-foreground">
                                        管理対象のユーザーがいません。
                                        </TableCell>
                                    </TableRow>
                                )}
                                {(paginatedUsers || []).map(user => {
                                    const hasIndividualSetting = individualPermissions[user.uid] !== undefined;
                                    const effectivePerms = hasIndividualSetting
                                    ? individualPermissions[user.uid]
                                    : (rolesMap.get(user.role) || []);
                                    
                                    return (
                                        <TableRow key={user.uid}>
                                            <TableCell className="font-medium px-2">
                                                {user.displayName}
                                                <div className="text-xs text-muted-foreground">{rolesData?.find(r => r.id === user.role)?.name}</div>
                                            </TableCell>
                                            {permissionColumns.map(col => {
                                                const group = permissionGroups.find(g => g.permissions.some(p => p.id === col.id));
                                                const isFirstInGroup = group?.permissions[0].id === col.id;
                                                return (
                                                    <TableCell key={col.id} className={'text-center p-1 ' + (isFirstInGroup ? 'border-l' : '')}>
                                                        <Checkbox
                                                            checked={effectivePerms.includes(col.id)}
                                                            onCheckedChange={(checked) => handleIndividualPermissionChange(user.uid, col.id, !!checked)}
                                                            disabled={isSaving || user.role === 'admin'}
                                                        />
                                                    </TableCell>
                                                )
                                            })}
                                            <TableCell className="px-2 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" disabled={!hasIndividualSetting || user.role === 'admin'}>
                                                            <MoreHorizontal className="h-4 w-4"/>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">
                                                                    個別設定をリセット
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>個別設定をリセットしますか？</AlertDialogTitle>
                                                                    <AlertDialogDescription>「{user.displayName}」の個別権限設定が削除され、役割「{rolesData?.find(r => r.id === user.role)?.name}」の権限が適用されます。</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleResetIndividualPermissions(user.uid)}>リセット</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                <CardFooter className="border-t">
                    <DataTablePagination
                    count={usersData?.length || 0}
                    rowsPerPage={rowsPerPage}
                    page={currentPage}
                    onPageChange={setCurrentPage}
                    onRowsPerPageChange={(value) => {
                        setRowsPerPage(value);
                        setCurrentPage(0);
                    }}
                    />
                </CardFooter>
            </Card>
        </TabsContent>
       </Tabs>
    </div>
  );
}

export default function PermissionsPageWrapper() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <PermissionsPageComponent />
        </Suspense>
    )
}

    