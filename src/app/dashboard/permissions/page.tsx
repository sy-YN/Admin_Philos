
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, addHours } from 'date-fns';
import { ja } from 'date-fns/locale';

// Mock Data
const roles = [
  { id: 'admin', name: '管理者' },
  { id: 'executive', name: '経営層' },
  { id: 'manager', name: 'マネージャー' },
  { id: 'employee', name: '従業員' },
];

const menuItems = [
  { id: 'members', name: 'メンバー管理' },
  { id: 'organization', name: '組織管理' },
  { id: 'permissions', name: '権限管理' },
  { id: 'contents', name: 'コンテンツ管理' },
  { id: 'philosophy', name: '理念管理' },
  { id: 'calendar', name: 'カレンダー設定' },
  { id: 'dashboard', name: '目標設定' },
  { id: 'ranking', name: 'ランキング設定' },
];

const initialPermissions = {
  admin: ['members', 'organization', 'permissions', 'contents', 'philosophy', 'calendar', 'dashboard', 'ranking'],
  executive: ['contents', 'dashboard'],
  manager: [],
  employee: [],
};

const mockUsers = [
    { id: 'user-1', name: '田中 圭', email: 'tanaka@example.com', role: 'manager' },
    { id: 'user-2', name: '鈴木 一恵', email: 'suzuki@example.com', role: 'manager' },
    { id: 'user-3', name: '佐藤 健', email: 'sato@example.com', role: 'employee' },
];

type TemporaryAccessGrant = {
    id: string;
    userId: string;
    userName: string;
    grantedBy: string;
    expiresAt: Date;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [tempGrants, setTempGrants] = useState<TemporaryAccessGrant[]>([]);

  const handlePermissionChange = (roleId: string, menuId: string, checked: boolean) => {
    setPermissions(prev => {
      const currentRolePermissions = prev[roleId as keyof typeof prev] || [];
      const newPermissions = checked
        ? [...currentRolePermissions, menuId]
        : currentRolePermissions.filter(p => p !== menuId);
      return { ...prev, [roleId]: newPermissions };
    });
  };

  const addTempGrant = (userId: string, durationHours: number) => {
    const user = mockUsers.find(u => u.id === userId);
    if(!user) return;

    const newGrant: TemporaryAccessGrant = {
        id: `grant-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        grantedBy: "山田 太郎 (Admin)", // Mock admin user
        expiresAt: addHours(new Date(), durationHours),
    }
    setTempGrants(prev => [...prev, newGrant]);
  }
  
  const revokeTempGrant = (grantId: string) => {
      setTempGrants(prev => prev.filter(g => g.id !== grantId));
  }


  return (
    <div className="w-full space-y-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">権限管理</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>役割別メニューアクセス設定</CardTitle>
          <CardDescription>役割（ロール）ごとに、管理画面で表示・アクセスできるメニュー項目を設定します。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">役割</TableHead>
                  {menuItems.map(menu => (
                    <TableHead key={menu.id} className="text-center">{menu.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    {menuItems.map(menu => (
                      <TableCell key={menu.id} className="text-center">
                        <Checkbox
                          checked={permissions[role.id as keyof typeof permissions]?.includes(menu.id)}
                          onCheckedChange={(checked) => handlePermissionChange(role.id, menu.id, !!checked)}
                          disabled={role.id === 'admin'} // Admin role is always super user
                          aria-label={`${role.name} - ${menu.name}`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
           <div className="flex justify-end mt-4">
                <Button>設定を保存</Button>
            </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>一時的なアクセス権の管理</CardTitle>
                    <CardDescription>マネージャーなど、通常は権限のないユーザーに一時的に管理画面へのアクセスを許可します。</CardDescription>
                </div>
                <GrantTemporaryAccessDialog onGrant={addTempGrant}/>
            </div>
        </CardHeader>
        <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>権限付与者</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tempGrants.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            一時的なアクセス権限が付与されたユーザーはいません。
                        </TableCell>
                    </TableRow>
                )}
                {tempGrants.map(grant => (
                  <TableRow key={grant.id}>
                    <TableCell className="font-medium">{grant.userName}</TableCell>
                    <TableCell>{grant.grantedBy}</TableCell>
                    <TableCell>
                        <Badge variant="secondary">
                           {formatDistanceToNow(grant.expiresAt, { addSuffix: true, locale: ja })}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => revokeTempGrant(grant.id)}>
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        権限を取り消す
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}


function GrantTemporaryAccessDialog({onGrant}: {onGrant: (userId: string, durationHours: number) => void}) {
    const [open, setOpen] = useState(false);
    const [userId, setUserId] = useState('');
    const [duration, setDuration] = useState('1'); // Default to 1 hour

    const handleGrant = () => {
        if(!userId || !duration) return;
        onGrant(userId, Number(duration));
        setOpen(false);
        setUserId('');
        setDuration('1');
    }

    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    一時権限を付与
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>一時的なアクセス権限を付与</DialogTitle>
                    <DialogDescription>
                        選択したユーザーに、指定した期間だけ管理者と同等のアクセス権限を付与します。
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
                                {mockUsers.filter(u => u.role === 'manager').map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="duration-select">有効期間</Label>
                        <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger id="duration-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1時間</SelectItem>
                                <SelectItem value="3">3時間</SelectItem>
                                <SelectItem value="8">8時間 (1営業日)</SelectItem>
                                <SelectItem value="24">24時間</SelectItem>
                                <SelectItem value="72">3日間</SelectItem>
                                <SelectItem value="168">7日間</SelectItem>
                                <SelectItem value="720">30日間</SelectItem>
                            </SelectContent>
                        </Select>
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
