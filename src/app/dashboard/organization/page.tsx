
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import type { Organization } from '@/types/organization';
import { PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type OrganizationWithChildren = Organization & { children: OrganizationWithChildren[] };

function OrganizationDialog({
  organization,
  organizations,
  onSave,
  children,
}: {
  organization?: Organization;
  organizations: Organization[];
  onSave: (data: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'managerUids'>>) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  const parentOptions = useMemo(() => {
    // Prevent an organization from being its own parent or child
    const getDescendants = (orgId: string): string[] => {
      const children = organizations.filter(o => o.parentId === orgId);
      return [orgId, ...children.flatMap(c => getDescendants(c.id))];
    };
    
    let excludedIds: string[] = [];
    if (organization?.id) {
        excludedIds = getDescendants(organization.id);
    }
    
    return organizations.filter(o => !excludedIds.includes(o.id));

  }, [organizations, organization]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(organization?.name || '');
      setParentId(organization?.parentId || null);
    }
    setOpen(isOpen);
  };
  
  const handleSave = () => {
    if (!name.trim()) {
      alert('組織名は必須です。');
      return;
    }
    onSave({ name, parentId });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{organization ? '組織を編集' : '新しい組織を追加'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="org-name">組織名</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="org-parent">親組織</Label>
            <Select value={parentId || 'null'} onValueChange={(value) => setParentId(value === 'null' ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="親組織を選択..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">なし (トップレベル組織)</SelectItem>
                {parentOptions.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrganizationNode({
  node,
  allOrganizations,
  level,
  onEdit,
  onDelete,
}: {
  node: OrganizationWithChildren;
  allOrganizations: Organization[];
  level: number;
  onEdit: (id: string, data: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onDelete: (id: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 group">
         <div style={{ paddingLeft: `${level * 1.5}rem` }} className="flex-1 flex items-center gap-2">
            {hasChildren ? (
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        {isOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                    </Button>
                </CollapsibleTrigger>
            ) : <div className="w-6"/>}
            <span className="font-medium">{node.name}</span>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <OrganizationDialog organization={node} organizations={allOrganizations} onSave={(data) => onEdit(node.id, data)}>
            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
          </OrganizationDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  組織「{node.name}」を削除します。この組織に所属するメンバーがいる場合、所属が解除されます。子組織がある場合は削除できません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(node.id)}>削除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <CollapsibleContent>
         {hasChildren && (
            <div className="pl-4">
                {node.children.map(childNode => (
                    <OrganizationNode
                        key={childNode.id}
                        node={childNode}
                        allOrganizations={allOrganizations}
                        level={level + 1}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </div>
         )}
      </CollapsibleContent>
    </Collapsible>
  );
}


export default function OrganizationPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const organizationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'organizations'));
  }, [firestore]);

  const { data: organizations, isLoading } = useCollection<Organization>(organizationsQuery);

  const organizationTree = useMemo(() => {
    if (!organizations) return [];
    const orgsById = new Map(organizations.map(org => [org.id, { ...org, children: [] }]));
    const tree: OrganizationWithChildren[] = [];

    organizations.forEach(org => {
      if (org.parentId && orgsById.has(org.parentId)) {
        orgsById.get(org.parentId)?.children.push(orgsById.get(org.id)!);
      } else {
        tree.push(orgsById.get(org.id)!);
      }
    });

    return tree;
  }, [organizations]);
  
  const handleAddItem = async (data: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, 'organizations'), {
        ...data,
        managerUids: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: '成功', description: '新しい組織を追加しました。' });
    } catch (error) {
      console.error('Error adding organization: ', error);
      toast({ title: 'エラー', description: '組織の追加に失敗しました。', variant: 'destructive' });
    }
  };

  const handleEditItem = async (id: string, data: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!firestore) return;
    try {
      const itemRef = doc(firestore, 'organizations', id);
      await updateDoc(itemRef, { ...data, updatedAt: serverTimestamp() });
      toast({ title: '成功', description: '組織を更新しました。' });
    } catch (error) {
      console.error('Error updating organization: ', error);
      toast({ title: 'エラー', description: '組織の更新に失敗しました。', variant: 'destructive' });
    }
  };
  
  const handleDeleteItem = async (id: string) => {
    if (!firestore || !organizations) return;

    // Check if the organization has children
    const hasChildren = organizations.some(org => org.parentId === id);
    if (hasChildren) {
      toast({
        title: '削除できません',
        description: 'この組織には子組織が存在するため、削除できません。先に子組織を削除または移動してください。',
        variant: 'destructive',
      });
      return;
    }

    try {
        const batch = writeBatch(firestore);

        // Delete the organization document
        const orgRef = doc(firestore, 'organizations', id);
        batch.delete(orgRef);

        // Find users associated with this organization and update them
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('organizationId', '==', id));
        const usersSnapshot = await getDocs(q);

        usersSnapshot.forEach(userDoc => {
            const userRef = doc(firestore, 'users', userDoc.id);
            batch.update(userRef, { organizationId: null });
        });
        
        await batch.commit();
        toast({ title: '成功', description: '組織を削除し、関連するメンバーの所属を解除しました。' });
    } catch (error) {
      console.error('Error deleting organization: ', error);
      toast({ title: 'エラー', description: '組織の削除に失敗しました。', variant: 'destructive' });
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">組織管理</h1>
        <div className="ml-auto">
          <OrganizationDialog organizations={organizations || []} onSave={handleAddItem}>
            <Button><PlusCircle className="mr-2 h-4 w-4" />新しい組織を追加</Button>
          </OrganizationDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>組織構造</CardTitle>
          <CardDescription>会社の組織構造を管理します。ドラッグ＆ドロップで階層を変更できます。（未実装）</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : organizationTree.length > 0 ? (
            organizationTree.map(node => (
              <OrganizationNode
                key={node.id}
                node={node}
                allOrganizations={organizations || []}
                level={0}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
              />
            ))
          ) : (
             <div className="text-center py-10 text-muted-foreground">
                <p>組織がまだ登録されていません。</p>
                <p className="text-sm">右上の「新しい組織を追加」ボタンから最初の組織（会社名など）を登録してください。</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
