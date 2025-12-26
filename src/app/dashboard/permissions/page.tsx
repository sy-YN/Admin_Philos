
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShieldAlert, Loader2, User, UserCog, Sparkles, Edit, MoreHorizontal, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, setDoc, getDocs, writeBatch, serverTimestamp, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Role } from '@/types/role';
import type { UserPermission, PermissionOverride } from '@/types/user-permission';
import type { Member } from '@/types/member';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const permissionGroups = [
  { name: 'メンバー管理', permissions: [{ id: 'members', name: 'メンバー管理' }] },
  { name: '組織管理', permissions: [{ id: 'organization', name: '組織管理' }] },
  { name: '権限管理', permissions: [{ id: 'permissions', name: '権限管理' }] },
  {
    name: 'コンテンツ管理',
    permissions: [
      { id: 'video_management', name: 'ビデオ' },
      { id: 'message_management', name: 'メッセージ' },
    ],
  },
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
  { id: 'executive', name: '経営層', permissions: ['video_management', 'message_management', 'philosophy', 'calendar', 'company_goal_setting', 'org_personal_goal_setting', 'ranking'] },
  { id: 'manager', name: 'マネージャー', permissions: ['org_personal_goal_setting'] },
  { id: 'employee', name: '従業員', permissions: [] },
];


function PermissionStatusBadge({ status }: { status: 'granted' | 'denied' | 'inherited' }) {
  if (status === 'granted') {
    return <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" title="許可" />;
  }
  if (status === 'denied') {
    return <XCircle className="h-5 w-5 text-red-500 mx-auto" title="拒否" />;
  }
  return <MinusCircle className="h-5 w-5 text-muted-foreground mx-auto" title="役割に従う" />;
}

function PermissionEditCell({
  userId,
  permissionId,
  overrides,
  onOverrideChange,
  isSaving,
}: {
  userId: string;
  permissionId: string;
  overrides: PermissionOverride[];
  onOverrideChange: (userId: string, permissionId: string, status?: 'granted' | 'denied') => void;
  isSaving: boolean;
}) {
  const currentOverride = overrides.find(o => o.id === permissionId);
  const currentStatus = currentOverride?.status;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}>
            {currentStatus === 'granted' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {currentStatus === 'denied' && <XCircle className="h-5 w-5 text-red-500" />}
            {currentStatus === undefined && <MinusCircle className="h-5 w-5 text-muted-foreground" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => onOverrideChange(userId, permissionId, undefined)}>
          <MinusCircle className="mr-2 h-4 w-4 text-muted-foreground" />
          役割に従う (デフォルト)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOverrideChange(userId, permissionId, 'granted')}>
          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
          許可
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOverrideChange(userId, permissionId, 'denied')}>
          <XCircle className="mr-2 h-4 w-4 text-red-500" />
          拒否
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export default function PermissionsPage() {
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
  const [individualPermissions, setIndividualPermissions] = useState<Record<string, PermissionOverride[]>>({});
  const [isSaving, setIsSaving] = useState(false);

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
        const perms: Record<string, PermissionOverride[]> = {};
        userPermsData.forEach(userPerm => {
            perms[userPerm.id] = userPerm.overrides || [];
        });
        setIndividualPermissions(perms);
    }
  }, [userPermsData]);

  const handleRolePermissionChange = (roleId: string, permissionId: string, checked: boolean) => {
    setRolePermissions(prev => {
      const currentRolePermissions = prev[roleId] || [];
      const newPermissions = checked
        ? [...currentRolePermissions, permissionId]
        : currentRolePermissions.filter(p => p !== permissionId);
      return { ...prev, [roleId]: newPermissions };
    });
  };
  
  const handleIndividualPermissionChange = (userId: string, permissionId: string, status?: 'granted' | 'denied') => {
    setIndividualPermissions(prev => {
        const newIndividualPerms = { ...prev };
        const currentUserOverrides = newIndividualPerms[userId] || [];
        
        // Remove existing override for this permission
        const otherOverrides = currentUserOverrides.filter(o => o.id !== permissionId);

        if (status) {
            // Add new override if status is granted or denied
            newIndividualPerms[userId] = [...otherOverrides, { id: permissionId, status }];
        } else {
            // If status is undefined (reset to default), just keep the other overrides
            newIndividualPerms[userId] = otherOverrides;
        }

        return newIndividualPerms;
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!firestore) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    
    Object.entries(rolePermissions).forEach(([roleId, perms]) => {
      const roleRef = doc(firestore, 'roles', roleId);
      const roleData = rolesData?.find(r => r.id === roleId);
      if(roleData) {
        batch.update(roleRef, { permissions: perms });
      }
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
    
    Object.entries(individualPermissions).forEach(([userId, overrides]) => {
      const userPermRef = doc(firestore, 'user_permissions', userId);
      if (overrides.length > 0) {
        batch.set(userPermRef, { 
            userId,
            overrides,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid,
         }, { merge: true });
      } else {
        // If all overrides are removed, delete the document
        batch.delete(userPermRef);
      }
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
    <div className="w-full space-y-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">権限管理</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>役割別メニューアクセス設定</CardTitle>
          <CardDescription>役割（ロール）ごとに、管理画面でアクセスできる機能を設定します。</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="animate-spin" /> : rolesData && rolesData.length > 0 ? (
            <>
            <ScrollArea>
                <Table className="min-w-[1200px] border-collapse">
                <TableHeader>
                    <TableRow>
                        <TableHead rowSpan={2} className="w-[120px] sticky left-0 bg-background z-10 px-2 align-middle border-b">役割</TableHead>
                        {permissionGroups.map(group => (
                            <TableHead key={group.name} colSpan={group.permissions.length} className="text-center p-1 border-l border-b min-w-[100px]">{group.name}</TableHead>
                        ))}
                    </TableRow>
                    <TableRow>
                        {permissionColumns.map(col => {
                           const group = permissionGroups.find(g => g.permissions.includes(col));
                           const isFirstInGroup = group?.permissions[0].id === col.id;
                           return (
                             <TableHead key={col.id} className={`text-center px-1 text-xs text-muted-foreground font-normal ${isFirstInGroup && 'border-l'}`}>
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
                        const group = permissionGroups.find(g => g.permissions.includes(col));
                        const isFirstInGroup = group?.permissions[0].id === col.id;
                        return (
                        <TableCell key={col.id} className={`text-center p-1 ${isFirstInGroup && 'border-l'}`}>
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
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div className="flex justify-end mt-4">
                <Button onClick={handleSaveRolePermissions} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    設定を保存
                </Button>
            </div>
           </>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
                <p>役割データが見つかりません。</p>
                 <Button onClick={handleSeedRoles} disabled={isSaving} variant="outline" className="mt-4">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    初期の役割データを登録する
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>ユーザー個別権限の管理</CardTitle>
                    <CardDescription>役割の権限に加えて、特定のユーザーに権限を許可または拒否します。</CardDescription>
                </div>
                <AddIndividualPermissionDialog 
                    users={usersData || []}
                    onGrant={(userId, perms) => {
                      setIndividualPermissions(prev => ({...prev, [userId]: perms.map(p => ({id: p, status: 'granted'}))}));
                    }}
                    existingUserPerms={Object.keys(individualPermissions)}
                />
            </div>
        </CardHeader>
        <CardContent>
             {isLoading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : (
              <>
                <ScrollArea>
                  <Table className="min-w-[1200px]">
                    <TableHeader>
                      <TableRow>
                          <TableHead rowSpan={2} className="w-[180px] sticky left-0 bg-background z-10 px-2 align-middle border-b">ユーザー</TableHead>
                          {permissionGroups.map(group => (
                              <TableHead key={group.name} colSpan={group.permissions.length} className="text-center p-1 border-l border-b min-w-[100px]">{group.name}</TableHead>
                          ))}
                      </TableRow>
                      <TableRow>
                          {permissionColumns.map(col => {
                            const group = permissionGroups.find(g => g.permissions.includes(col));
                            const isFirstInGroup = group?.permissions[0].id === col.id;
                            return (
                              <TableHead key={col.id} className={`text-center px-1 text-xs text-muted-foreground font-normal ${isFirstInGroup && 'border-l'}`}>
                                {col.name}
                              </TableHead>
                            )
                          })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.keys(individualPermissions).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={permissionColumns.length + 1} className="h-24 text-center text-muted-foreground">
                                個別の権限が設定されたユーザーはいません。
                                </TableCell>
                            </TableRow>
                        )}
                        {usersData?.filter(u => individualPermissions[u.uid] !== undefined).map(user => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium sticky left-0 bg-background z-10 px-2">
                                    {user.displayName}
                                </TableCell>
                                {permissionColumns.map(col => {
                                     const group = permissionGroups.find(g => g.permissions.includes(col));
                                     const isFirstInGroup = group?.permissions[0].id === col.id;
                                     return (
                                        <TableCell key={col.id} className={`text-center p-0 ${isFirstInGroup && 'border-l'}`}>
                                            <PermissionEditCell 
                                                userId={user.uid}
                                                permissionId={col.id}
                                                overrides={individualPermissions[user.uid] || []}
                                                onOverrideChange={handleIndividualPermissionChange}
                                                isSaving={isSaving}
                                            />
                                        </TableCell>
                                     )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <div className="flex justify-end mt-4">
                    <Button onClick={handleSaveIndividualPermissions} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        個別権限を保存
                    </Button>
                </div>
              </>
             )}
        </CardContent>
      </Card>
    </div>
  );
}


function AddIndividualPermissionDialog({
    users,
    onGrant,
    existingUserPerms
}: {
    users: Member[],
    onGrant: (userId: string, permissions: string[]) => void,
    existingUserPerms: string[],
}) {
    const [open, setOpen] = useState(false);
    const [userId, setUserId] = useState('');
    const [grantedPermissions, setGrantedPermissions] = useState<string[]>([]);

    const availableUsers = useMemo(() => {
        const grantedUserIds = new Set(existingUserPerms);
        return users.filter(u => u.role !== 'admin' && !grantedUserIds.has(u.uid));
    }, [users, existingUserPerms]);
    
    useEffect(() => {
        if(open) {
            setUserId('');
            setGrantedPermissions([]);
        }
    }, [open]);

    const handlePermissionChange = (permissionId: string, checked: boolean) => {
        setGrantedPermissions(prev => 
            checked ? [...prev, permissionId] : prev.filter(p => p !== permissionId)
        );
    }

    const handleGrant = () => {
        if(!userId) return;
        onGrant(userId, grantedPermissions);
        setOpen(false);
    }

    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserCog className="mr-2 h-4 w-4" />
                    個別権限を付与
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ユーザー個別権限を付与</DialogTitle>
                    <DialogDescription>
                        選択したユーザーに、役割の権限に加えて追加の権限を付与します。
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="user-select">対象ユーザー</Label>
                        <Select value={userId} onValueChange={setUserId}>
                            <SelectTrigger id="user-select">
                                <SelectValue placeholder="ユーザーを選択..."/>
                            </SelectTrigger>
                            <SelectContent>
                                {availableUsers.map(user => (
                                    <SelectItem key={user.uid} value={user.uid}>{user.displayName} ({user.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>付与する権限</Label>
                        <div className="grid grid-cols-2 gap-2 rounded-md border p-4 max-h-60 overflow-y-auto">
                            {allPermissionItems.map(item => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <Checkbox 
                                        id={`perm-${item.id}`}
                                        checked={grantedPermissions.includes(item.id)}
                                        onCheckedChange={(checked) => handlePermissionChange(item.id, !!checked)}
                                    />
                                    <Label htmlFor={`perm-${item.id}`} className="font-normal">{item.name}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
                    <Button onClick={handleGrant}>権限を付与</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
