'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, writeBatch, where, orderBy } from 'firebase/firestore';
import type { Organization, OrganizationType } from '@/types/organization';
import { PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Loader2, Building, Building2, Landmark, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { OrganizationPicker } from '@/components/organization/organization-picker';


type OrganizationWithChildren = Organization & { children: OrganizationWithChildren[] };

const orgTypeOptions: { value: OrganizationType, label: string, icon: React.FC<any> }[] = [
    { value: 'holding', label: '持株会社', icon: Landmark },
    { value: 'company', label: '事業会社', icon: Building2 },
    { value: 'department', label: '部署', icon: Building },
];

function OrganizationDialog({
  organization,
  organizations,
  onSave,
  children,
  parentId: defaultParentId,
}: {
  organization?: Organization;
  organizations: Organization[];
  onSave: (data: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'managerUids' | 'order'>>) => void;
  children: React.ReactNode;
  parentId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<OrganizationType>('department');
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
      setType(organization?.type || 'department');
      setParentId(organization?.parentId !== undefined ? organization.parentId : defaultParentId || null);
    }
    setOpen(isOpen);
  };
  
  const handleSave = () => {
    if (!name.trim()) {
      alert('組織名は必須です。');
      return;
    }
    onSave({ name, type, parentId });
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
            <Label htmlFor="org-type">種別</Label>
            <Select value={type} onValueChange={(value) => setType(value as OrganizationType)}>
              <SelectTrigger>
                <SelectValue placeholder="種別を選択..." />
              </SelectTrigger>
              <SelectContent>
                {orgTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                        </div>
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="org-parent">親組織</Label>
            <OrganizationPicker
              organizations={parentOptions}
              value={parentId || ''}
              onChange={(value) => setParentId(value || null)}
              placeholder="なし (トップレベル組織)"
            />
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
  onEdit: (id: string, data: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'order'>>) => void;
  onDelete: (id: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(node.type === 'holding');
    const hasChildren = node.children && node.children.length > 0;
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: node.id,
      data: { name: node.name, level },
    });

    const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
      id: node.id,
    });
    
    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    
    const TypeIcon = orgTypeOptions.find(o => o.value === node.type)?.icon || Building;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full" ref={setNodeRef} style={style}>
      <div 
        ref={setDroppableNodeRef} 
        className={cn(
            "flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 group border border-transparent",
            isOver && "bg-primary/20 border-primary/50"
        )}>
         <div style={{ paddingLeft: `${level * 1.5}rem` }} className="flex-1 flex items-center gap-2">
            {hasChildren ? (
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        {isOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                    </Button>
                </CollapsibleTrigger>
            ) : <div className="w-6"/>}
             <div {...listeners} {...attributes} className="flex-1 cursor-grab flex items-center gap-2">
                 <TypeIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{node.name}</span>
            </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <OrganizationDialog organization={node} organizations={allOrganizations} onSave={(data) => onEdit(node.id, data)} parentId={node.parentId}>
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
            <div className="pl-4 border-l-2 ml-5">
              <SortableContext items={node.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
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
                </SortableContext>
            </div>
         )}
      </CollapsibleContent>
    </Collapsible>
  );
}


export default function OrganizationPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [activeId, setActiveId] = useState<string | null>(null);

  const organizationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'organizations'), orderBy('order'));
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

    // Sort children by order at each level
    const sortChildrenRecursive = (nodes: OrganizationWithChildren[]) => {
      nodes.sort((a,b) => a.order - b.order);
      nodes.forEach(node => {
        if(node.children.length > 0) {
          sortChildrenRecursive(node.children);
        }
      });
    }
    sortChildrenRecursive(tree);

    return tree;
  }, [organizations]);

   const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );
  
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !organizations) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeOrg = organizations.find(o => o.id === activeId);
    const overOrg = organizations.find(o => o.id === overId);

    if (!activeOrg || !overOrg) return;

    const isSameContainer = activeOrg.parentId === overOrg.parentId;

    if (isSameContainer) {
      // Reordering within the same parent
      const siblings = organizations.filter(o => o.parentId === activeOrg.parentId).sort((a, b) => a.order - b.order);
      const oldIndex = siblings.findIndex(o => o.id === activeId);
      const newIndex = siblings.findIndex(o => o.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex);
      
      const batch = writeBatch(firestore);
      reorderedSiblings.forEach((org, index) => {
        const orgRef = doc(firestore, 'organizations', org.id);
        batch.update(orgRef, { order: index });
      });
      
      try {
        await batch.commit();
        toast({ title: '成功', description: '表示順を更新しました。' });
      } catch (error) {
        console.error('Error updating order:', error);
        toast({ title: 'エラー', description: '表示順の更新に失敗しました。', variant: 'destructive' });
      }

    } else {
      // Moving to a new parent
      const newParentId = overId;
      const siblingsInNewParent = organizations.filter(o => o.parentId === newParentId);
      const newOrder = siblingsInNewParent.length > 0 ? Math.max(...siblingsInNewParent.map(o => o.order)) + 1 : 0;
      
      try {
        await updateDoc(doc(firestore, 'organizations', activeId), {
            parentId: newParentId,
            order: newOrder
        });
        toast({ title: '成功', description: `「${activeOrg.name}」を「${overOrg.name}」に移動しました。`});
      } catch(error) {
        console.error('Error moving organization:', error);
        toast({ title: 'エラー', description: '組織の移動に失敗しました。', variant: 'destructive'});
      }
    }
  };


  const handleDragCancel = () => {
    setActiveId(null);
  }
  
  const handleAddItem = async (data: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'order'>>) => {
    if (!firestore || !organizations) return;
    
    const siblings = organizations.filter(o => o.parentId === data.parentId);
    const newOrder = siblings.length > 0 ? Math.max(...siblings.map(o => o.order)) + 1 : 0;

    try {
      await addDoc(collection(firestore, 'organizations'), {
        ...data,
        order: newOrder,
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

  const handleEditItem = async (id: string, data: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'order'>>) => {
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
        const orgRef = doc(firestore, 'organizations', id);
        batch.delete(orgRef);

        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('organizationId', '==', id));
        const usersSnapshot = await getDocs(q);

        usersSnapshot.forEach(userDoc => {
            const userRef = doc(firestore, 'users', userDoc.id);
            batch.update(userRef, { organizationId: null, company: null });
        });
        
        await batch.commit();
        toast({ title: '成功', description: '組織を削除し、関連するメンバーの所属を解除しました。' });
    } catch (error) {
      console.error('Error deleting organization: ', error);
      toast({ title: 'エラー', description: '組織の削除に失敗しました。', variant: 'destructive' });
    }
  };

  const activeOrg = useMemo(() => organizations?.find(o => o.id === activeId), [activeId, organizations]);

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
          <CardDescription>ドラッグ＆ドロップで組織の階層や順序を変更できます。</CardDescription>
        </CardHeader>
        <CardContent>
           <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            >
              <SortableContext items={organizationTree.map(o => o.id)} strategy={verticalListSortingStrategy}>
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
              </SortableContext>
              {typeof document !== 'undefined' && createPortal(
                <DragOverlay>
                    {activeId && activeOrg ? (
                        <div className='bg-background rounded-md shadow-lg p-2 flex items-center gap-2'>
                           <span className="font-medium">{activeOrg.name}</span>
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}
