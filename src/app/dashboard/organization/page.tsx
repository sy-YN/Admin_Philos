'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, writeBatch, where } from 'firebase/firestore';
import type { Organization, OrganizationType } from '@/types/organization';
import { PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Loader2, Building, Building2, Landmark, Save } from 'lucide-react';
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
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { createPortal } from 'react-dom';
import { CSS } from '@dnd-kit/utilities';
import { OrganizationPicker } from '@/components/organization/organization-picker';

type OrganizationWithChildren = Organization & { children: OrganizationWithChildren[] };

const orgTypeOptions: { value: OrganizationType, label: string, icon: React.FC<any> }[] = [
    { value: 'holding', label: '持株会社', icon: Landmark },
    { value: 'company', label: '事業会社', icon: Building2 },
    { value: 'department', label: '部署', icon: Building },
];

function OrganizationNode({ node, allOrganizations, level, onEdit, onDelete }: any) {
    const [isOpen, setIsOpen] = useState(node.type === 'holding');
    const hasChildren = node.children && node.children.length > 0;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id, disabled: node.type === 'holding' });
    const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({ id: node.id });
    const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    const TypeIcon = orgTypeOptions.find(o => o.value === node.type)?.icon || Building;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full" ref={setNodeRef} style={style}>
      <div ref={setDroppableNodeRef} className={cn("flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 group border border-transparent", isOver && "bg-primary/20 border-primary/50")}>
         <div style={{ paddingLeft: `${level * 1.5}rem` }} className="flex-1 flex items-center gap-2">
            {hasChildren ? <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6">{isOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}</Button></CollapsibleTrigger> : <div className="w-6"/>}
             <div {...listeners} {...attributes} className={cn("flex-1 flex items-center gap-2", node.type !== 'holding' && "cursor-grab")}>
                 <TypeIcon className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{node.name}</span>
            </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={() => onEdit(node.id)}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(node.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <CollapsibleContent>{hasChildren && <div className="pl-4 border-l-2 ml-5"><SortableContext items={node.children.map((c:any) => c.id)} strategy={verticalListSortingStrategy}>{node.children.map((childNode:any) => <OrganizationNode key={childNode.id} node={childNode} allOrganizations={allOrganizations} level={level + 1} onEdit={onEdit} onDelete={onDelete} />)}</SortableContext></div>}</CollapsibleContent>
    </Collapsible>
  );
}

export default function OrganizationPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const organizationsQuery = useMemoFirebase(() => !firestore || isUserLoading ? null : query(collection(firestore, 'organizations')), [firestore, isUserLoading]);
  const { data: dbOrgs, isLoading } = useCollection<Organization>(organizationsQuery);
  const [localOrgs, setLocalOrgs] = useState<Organization[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => { if (dbOrgs) setLocalOrgs(dbOrgs); }, [dbOrgs]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const newOrgs = arrayMove(localOrgs, localOrgs.findIndex(o => o.id === active.id), localOrgs.findIndex(o => o.id === over.id));
    setLocalOrgs(newOrgs); setIsDirty(true);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">組織管理</h1>
        <Button onClick={() => setIsDirty(false)} disabled={!isDirty}><Save className="mr-2 h-4 w-4" />保存</Button>
      </div>
      <Card><CardContent><DndContext sensors={useSensors(useSensor(PointerSensor))} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}><SortableContext items={localOrgs.map(o => o.id)} strategy={verticalListSortingStrategy}>{isLoading ? <Loader2 className="animate-spin text-primary mx-auto" /> : localOrgs.map(o => <div key={o.id} className="p-2 border-b">{o.name}</div>)}</SortableContext></DndContext></CardContent></Card>
    </div>
  );
}