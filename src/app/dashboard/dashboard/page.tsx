
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlusCircle, MoreHorizontal, Trash2, Edit, Database, Star, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import dynamic from 'next/dynamic';
import type { ChartData } from '@/components/dashboard/widget-preview';
import { cn } from '@/lib/utils';
import {
  getFiscalYear,
  getCurrentFiscalYear,
  getFiscalYears,
  getMonthsForFiscalYear,
} from '@/lib/fiscal-year';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, getDocs, Query, collectionGroup } from 'firebase/firestore';
import type { Goal } from '@/types/goal';
import type { SalesRecord } from '@/types/sales-record';
import type { Member } from '@/types/member';
import { useSubCollection } from '@/firebase/firestore/use-sub-collection';


const WidgetPreview = dynamic(() => import('@/components/dashboard/widget-preview'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>,
});


const kpiOptions = {
  company: [
    { value: 'sales_revenue', label: '売上高' },
    { value: 'profit_margin', label: '営業利益率' },
    { value: 'new_customers', label: '新規顧客獲得数' },
    { value: 'project_delivery_compliance', label: 'プロジェクトの納期遵守率' },
  ],
  team: [
    { value: 'task_completion_rate', label: 'タスク完了率' },
    { value: 'project_progress', label: 'プロジェクト進捗率' },
  ],
  personal: [
    { value: 'personal_sales_achievement', label: '個人の売上達成率' },
    { value: 'task_achievement_rate', label: 'タスク達成率' },
    { value: 'self_learning_time', label: '自己学習時間' },
    { value: 'vacation_acquisition_rate', label: '健康管理指標（休暇取得率）' },
  ],
};

const chartOptions = [
    { value: 'line', label: '折れ線グラフ' },
    { value: 'bar', label: '棒グラフ' },
    { value: 'pie', label: '円グラフ' },
    { value: 'donut', label: 'ドーナツチャート' },
    { value: 'composed', label: '複合グラフ' }
];

export const kpiToChartMapping: Record<string, string[]> = {
  // Company
  sales_revenue: ['line', 'bar', 'composed'],
  profit_margin: ['line'],
  new_customers: ['bar'],
  project_delivery_compliance: ['pie', 'bar'],
  // Team
  task_completion_rate: ['pie', 'donut'],
  project_progress: ['donut'],
  // Personal
  personal_sales_achievement: ['donut', 'bar'],
  task_achievement_rate: ['donut'],
  self_learning_time: ['line', 'bar'],
  vacation_acquisition_rate: ['donut', 'bar'],
};


type WidgetScope = 'company' | 'team' | 'personal';

const calculateAchievementRate = (actual: number, target: number) => {
  if (target === 0) return actual > 0 ? 100 : 0;
  return Math.round((actual / target) * 100);
}


function WidgetDialog({ widget, onSave, children, defaultScope, currentUser }: { widget?: Goal | null, onSave: (data: Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>) => void, children: React.ReactNode, defaultScope: WidgetScope, currentUser: Member | null }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<WidgetScope>(defaultScope);
  const [kpi, setKpi] = useState('');
  const [chartType, setChartType] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number>(getCurrentFiscalYear());
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState<number>(8);

  const availableChartOptions = useMemo(() => {
    if (!kpi) return [];
    const allowedChartTypes = kpiToChartMapping[kpi] || [];
    return chartOptions.filter(option => allowedChartTypes.includes(option.value));
  }, [kpi]);

  const handleKpiChange = (newKpi: string) => {
    setKpi(newKpi);
    const allowedCharts = kpiToChartMapping[newKpi] || [];
    if (!allowedCharts.includes(chartType)) {
      setChartType(allowedCharts[0] || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    let scopeId = '';
    if (scope === 'company') scopeId = currentUser.company || '';
    if (scope === 'team') scopeId = currentUser.department || '';
    if (scope === 'personal') scopeId = currentUser.uid;

    if (!scopeId) {
        alert("ユーザー情報から対象を特定できませんでした。");
        return;
    }

    onSave({ 
      title, 
      scope, 
      scopeId,
      kpi, 
      chartType, 
      fiscalYear: needsFiscalYear ? fiscalYear : undefined,
      fiscalYearStartMonth: needsFiscalYear ? fiscalYearStartMonth : undefined,
    });
    setOpen(false);
  };
  
  useEffect(() => {
    if (open) {
      const initialScope = widget?.scope || defaultScope;
      const startMonth = widget?.fiscalYearStartMonth || 8;
      setTitle(widget?.title || '');
      setScope(initialScope);
      setKpi(widget?.kpi || '');
      setChartType(widget?.chartType || '');
      setFiscalYear(widget?.fiscalYear || getCurrentFiscalYear(startMonth));
      setFiscalYearStartMonth(startMonth);
    } else {
      // Reset form on close
      setTitle('');
      setScope(defaultScope);
      setKpi('');
      setChartType('');
      setFiscalYear(getCurrentFiscalYear());
      setFiscalYearStartMonth(8);
    }
  }, [widget, open, defaultScope]);

  const needsFiscalYear = kpi === 'sales_revenue';
  const isCompanyScopeOnly = scope === 'company' && (currentUser?.role !== 'admin' && currentUser?.role !== 'executive');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{widget ? 'ウィジェットを編集' : '新規ウィジェットを追加'}</DialogTitle>
            <DialogDescription>表示したいKPIとグラフの種類を選択してください。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="widget-title">ウィジェットタイトル</Label>
              <Input id="widget-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="例: 全社の売上推移" required />
            </div>
            {needsFiscalYear && (
              <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="widget-fiscal-year">対象年度</Label>
                     <Select value={String(fiscalYear)} onValueChange={(v) => setFiscalYear(Number(v))}>
                      <SelectTrigger id="widget-fiscal-year"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {getFiscalYears(fiscalYearStartMonth).map(year => (
                          <SelectItem key={year} value={String(year)}>{year}年度</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="grid gap-2">
                   <Label htmlFor="widget-start-month">年度開始月</Label>
                   <Select value={String(fiscalYearStartMonth)} onValueChange={(v) => setFiscalYearStartMonth(Number(v))}>
                    <SelectTrigger id="widget-start-month"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <SelectItem key={month} value={String(month)}>{month}月</SelectItem>
                      ))}
                    </SelectContent>
                   </Select>
                 </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="widget-scope">対象単位</Label>
              <Select value={scope} onValueChange={(v: any) => { setScope(v); setKpi(''); setChartType(''); }} disabled={isCompanyScopeOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">会社単位</SelectItem>
                  <SelectItem value="team" disabled>組織単位 (未実装)</SelectItem>
                  <SelectItem value="personal" disabled>個人単位 (未実装)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="widget-kpi">KPI項目</Label>
              <Select value={kpi} onValueChange={handleKpiChange} required>
                <SelectTrigger><SelectValue placeholder="KPIを選択" /></SelectTrigger>
                <SelectContent>
                  {kpiOptions[scope].map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="widget-chart">グラフの種類</Label>
              <Select value={chartType} onValueChange={(v: any) => setChartType(v)} required disabled={!kpi}>
                <SelectTrigger><SelectValue placeholder={!kpi ? "先にKPIを選択" : "グラフを選択"} /></SelectTrigger>
                <SelectContent>
                  {availableChartOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SalesDataManagementDialog({
  widget,
  onSave,
  children
}: {
  widget: Goal;
  onSave: (records: Omit<SalesRecord, 'id'>[]) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: salesRecords } = useSubCollection<SalesRecord>('goals', widget.id, 'salesRecords');
  const [monthlyData, setMonthlyData] = useState<Map<string, { target: string; actual: string }>>(new Map());

  const fiscalYearMonths = useMemo(() => {
    if (!widget.fiscalYear) return [];
    return getMonthsForFiscalYear(widget.fiscalYear, widget.fiscalYearStartMonth);
  }, [widget.fiscalYear, widget.fiscalYearStartMonth]);
  
  useEffect(() => {
    if (open && salesRecords) {
      const initialData = new Map();
      fiscalYearMonths.forEach(({ year, month }) => {
        const record = salesRecords.find(r => r.year === year && r.month === month);
        initialData.set(`${year}-${String(month).padStart(2, '0')}`, {
          target: record?.salesTarget.toString() || '0',
          actual: record?.salesActual.toString() || '0',
        });
      });
      setMonthlyData(initialData);
    }
  }, [open, salesRecords, fiscalYearMonths]);

  const handleInputChange = (id: string, field: 'target' | 'actual', value: string) => {
    setMonthlyData(prev => {
      const newData = new Map(prev);
      const current = newData.get(id) || { target: '0', actual: '0' };
      current[field] = value;
      newData.set(id, current);
      return newData;
    });
  };

  const handleSave = () => {
    const newRecords: Omit<SalesRecord, 'id'>[] = [];
    let hasError = false;

    monthlyData.forEach((values, id) => {
        const [year, month] = id.split('-').map(Number);
        const salesTarget = parseFloat(values.target) || 0;
        const salesActual = parseFloat(values.actual) || 0;
        
        if (isNaN(salesTarget) || isNaN(salesActual)) {
            hasError = true;
        }

        newRecords.push({
            year,
            month,
            salesTarget,
            salesActual,
            achievementRate: calculateAchievementRate(salesActual, salesTarget),
        });
    });
    
    if (hasError) {
        toast({ title: "入力エラー", description: "有効な数値を入力してください。", variant: "destructive" });
        return;
    }

    onSave(newRecords);
    toast({ title: "成功", description: "売上データを保存しました。" });
    setOpen(false);
  };
  

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>売上実績データ編集 ({widget.fiscalYear}年度)</DialogTitle>
          <DialogDescription>
            {widget.fiscalYear}年度（{widget.fiscalYearStartMonth}月始まり）の月次売上目標と実績を入力します。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">年月</TableHead>
                <TableHead>売上目標 (百万円)</TableHead>
                <TableHead>売上実績 (百万円)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fiscalYearMonths.map(({ year, month }) => {
                 const id = `${year}-${String(month).padStart(2, '0')}`;
                 const values = monthlyData.get(id) || { target: '0', actual: '0' };
                 return (
                  <TableRow key={id}>
                    <TableCell className="font-medium">{year}年 {month}月</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={values.target}
                        onChange={(e) => handleInputChange(id, 'target', e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={values.actual}
                        onChange={(e) => handleInputChange(id, 'actual', e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                  </TableRow>
                 )
              })}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
          <Button onClick={handleSave}>一括保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function WidgetCard({
  widget,
  onSave,
  onDelete,
  onSetActive,
  onSaveRecords,
  currentUser
}: {
  widget: Goal;
  onSave: (data: Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>, id?: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onSaveRecords: (goalId: string, records: Omit<SalesRecord, 'id'>[]) => void;
  currentUser: Member | null;
}) {
  const { data: salesData } = useSubCollection<SalesRecord>(
    'goals',
    widget.id,
    'salesRecords'
  );

  const getChartDataForWidget = useCallback((): ChartData[] => {
    let dataForChart: SalesRecord[] = [];
    if (widget.kpi === 'sales_revenue' && widget.fiscalYear && salesData) {
      const startMonth = widget.fiscalYearStartMonth || 8;
      const fiscalYearMonths = getMonthsForFiscalYear(widget.fiscalYear, startMonth);
      
      dataForChart = fiscalYearMonths.map(({ year, month }) => {
        const found = salesData.find(record => record.year === year && record.month === month);
        if (found) return found;

        return {
          id: `${year}-${String(month).padStart(2, '0')}`,
          year,
          month,
          salesTarget: 0,
          salesActual: 0,
          achievementRate: 0,
        };
      });
    } else {
        // Handle non-sales kpi data generation if needed
    }
    
    return dataForChart
      .map(d => ({ month: `${d.year}-${String(d.month).padStart(2, '0')}`, salesActual: d.salesActual, salesTarget: d.salesTarget, achievementRate: d.achievementRate }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [salesData, widget]);

  const canEdit = currentUser?.role === 'executive';

  return (
    <Card key={widget.id} className={cn(
      "flex flex-col",
      widget.status === 'active' && "ring-2 ring-primary"
    )}>
      <CardHeader className='flex-row items-center justify-between pb-2'>
        <CardTitle className="text-base flex items-center gap-2">
          {widget.status === 'active' && <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />}
          {widget.title}
        </CardTitle>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {widget.status !== 'active' && (
                <DropdownMenuItem onClick={() => onSetActive(widget.id)}>
                  <Star className="mr-2 h-4 w-4"/>アプリで表示
                </DropdownMenuItem>
              )}
              <WidgetDialog widget={widget} onSave={(data) => onSave(data, widget.id)} defaultScope={widget.scope} currentUser={currentUser}>
                <DropdownMenuItem onSelect={e => e.preventDefault()}>
                    <Edit className="mr-2 h-4 w-4"/>編集
                </DropdownMenuItem>
              </WidgetDialog>
               {widget.kpi === 'sales_revenue' && (
                  <SalesDataManagementDialog widget={widget} onSave={(records) => onSaveRecords(widget.id, records)}>
                      <DropdownMenuItem onSelect={e => e.preventDefault()}>
                          <Database className="mr-2 h-4 w-4"/>データ編集
                      </DropdownMenuItem>
                  </SalesDataManagementDialog>
              )}
               <DropdownMenuSeparator />
               <AlertDialog>
                <AlertDialogTrigger asChild>
                   <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4"/>削除
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>ウィジェットを削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      ウィジェット「{widget.title}」を削除します。この操作は元に戻せません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(widget.id)}>削除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="h-60 w-full flex-grow">
         <WidgetPreview 
           widget={widget as any}
           chartData={getChartDataForWidget()}
         />
      </CardContent>
      <CardFooter className='flex justify-between text-xs text-muted-foreground pt-2'>
         <span>
           {kpiOptions[widget.scope].find(k => k.value === widget.kpi)?.label || 'N/A'}
         </span>
         <span>
           {chartOptions.find(c => c.value === widget.chartType)?.label || 'N/A'}
         </span>
      </CardFooter>
    </Card>
  );
}

function WidgetList({
  widgets,
  onSave,
  onDelete,
  onSetActive,
  onSaveRecords,
  currentUser
}: {
  widgets: Goal[];
  onSave: (data: Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>, id?: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onSaveRecords: (goalId: string, records: Omit<SalesRecord, 'id'>[]) => void;
  currentUser: Member | null;
}) {
  if (widgets.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>この単位のウィジェットはまだありません。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {widgets.map(widget => (
        <WidgetCard
          key={widget.id}
          widget={widget}
          onSave={onSave}
          onDelete={onDelete}
          onSetActive={onSetActive}
          onSaveRecords={onSaveRecords}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
}

export default function DashboardSettingsPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: authUser, isUserLoading } = useUser();
    
    const [currentUserData, setCurrentUserData] = useState<Member | null>(null);
    const [activeTab, setActiveTab] = useState<WidgetScope>('company');
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        setIsMounted(true);
        if (authUser && firestore && !currentUserData) {
            getDocs(query(collection(firestore, 'users'), where('uid', '==', authUser.uid), limit(1))).then(snapshot => {
                if (!snapshot.empty) {
                    const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Member;
                    setCurrentUserData(userData);
                }
            });
        }
    }, [authUser, firestore, currentUserData]);
    
    const goalsQuery = useMemoFirebase(() => {
        if (!firestore || !currentUserData || activeTab !== 'company') return null;
        if (currentUserData.role !== 'admin' && currentUserData.role !== 'executive') return null;
        if (!currentUserData.company) return null;
        
        return query(
            collection(firestore, 'goals'), 
            where('scope', '==', 'company'),
            where('scopeId', '==', currentUserData.company)
        );
    }, [firestore, currentUserData, activeTab]);

    const { data: widgets, isLoading: isLoadingWidgets } = useCollection<Goal>(goalsQuery as Query<Goal> | null);

    const handleSaveWidget = async (data: Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>, id?: string) => {
        if (!firestore || !authUser) return;
        
        try {
            if (id) {
                const widgetRef = doc(firestore, 'goals', id);
                await updateDoc(widgetRef, { ...data, updatedAt: serverTimestamp() });
                toast({ title: "成功", description: "ウィジェットを更新しました。" });
            } else {
                const currentActive = widgets?.find(w => w.scope === data.scope && w.status === 'active');
                await addDoc(collection(firestore, 'goals'), {
                    ...data,
                    authorId: authUser.uid,
                    status: currentActive ? 'inactive' : 'active',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                toast({ title: "成功", description: "新規ウィジェットを追加しました。" });
            }
        } catch (error) {
            console.error("Error saving widget:", error);
            toast({ title: "エラー", description: "ウィジェットの保存に失敗しました。", variant: 'destructive' });
        }
    };

    const handleDeleteWidget = async (id: string) => {
      if (!firestore) return;
      try {
        await deleteDoc(doc(firestore, 'goals', id));
        // TODO: Also delete associated sales records in subcollection
        toast({ title: "成功", description: "ウィジェットを削除しました。" });
      } catch (error) {
        console.error("Error deleting widget:", error);
        toast({ title: "エラー", description: "ウィジェットの削除に失敗しました。", variant: 'destructive' });
      }
    };

    const handleSetActiveWidget = async (id: string) => {
      if (!firestore || !widgets) return;
      
      const widgetToActivate = widgets.find(w => w.id === id);
      if (!widgetToActivate) return;
      
      const batch = writeBatch(firestore);
      widgets.forEach(w => {
          if (w.scope === widgetToActivate.scope) {
              const widgetRef = doc(firestore, 'goals', w.id);
              batch.update(widgetRef, { status: w.id === id ? 'active' : 'inactive' });
          }
      });
      
      try {
        await batch.commit();
        toast({ title: "成功", description: "表示ウィジェットを更新しました。" });
      } catch (error) {
        console.error("Error setting active widget:", error);
        toast({ title: "エラー", description: "表示ウィジェットの更新に失敗しました。", variant: 'destructive' });
      }
    };

    const handleSaveRecords = async (goalId: string, newRecords: Omit<SalesRecord, 'id'>[]) => {
      if (!firestore || newRecords.length === 0) return;
      
      const batch = writeBatch(firestore);
      newRecords.forEach(record => {
          const recordId = `${record.year}-${String(record.month).padStart(2, '0')}`;
          const recordRef = doc(firestore, 'goals', goalId, 'salesRecords', recordId);
          batch.set(recordRef, record, { merge: true });
      });
      
      try {
        await batch.commit();
      } catch (error) {
        console.error("Error saving sales records:", error);
        toast({ title: "エラー", description: "売上データの保存に失敗しました。", variant: 'destructive' });
      }
    };
    
    const widgetsForTab = useMemo(() => {
      if (!widgets) return [];
      return [...widgets].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return (b.fiscalYear ?? 0) - (a.fiscalYear ?? 0) || a.title.localeCompare(b.title);
      });
    }, [widgets]);

  const isLoading = isUserLoading || isLoadingWidgets || !isMounted || !currentUserData;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const canManageCompanyGoals = currentUserData?.role === 'admin' || currentUserData?.role === 'executive';

  return (
    <div className="w-full space-y-8">
      <div>
         <div className="flex items-center justify-between mb-6">
            <div className='flex flex-col'>
              <h1 className="text-lg font-semibold md:text-2xl">目標設定</h1>
              <p className="text-sm text-muted-foreground">表示する指標やグラフの種類をカスタマイズします。</p>
            </div>

            {currentUserData?.role === 'executive' && (
              <div className='flex items-center gap-4'>
                  <div className='flex items-center gap-2'>
                    <WidgetDialog onSave={handleSaveWidget} defaultScope={activeTab} currentUser={currentUserData}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            新規ウィジェット追加
                        </Button>
                    </WidgetDialog>
                  </div>
              </div>
            )}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WidgetScope)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="company">会社単位</TabsTrigger>
              <TabsTrigger value="team" disabled>組織単位</TabsTrigger>
              <TabsTrigger value="personal" disabled>個人単位</TabsTrigger>
            </TabsList>
            <TabsContent value="company">
                {canManageCompanyGoals ? (
                  <WidgetList 
                      widgets={widgetsForTab} 
                      onSave={handleSaveWidget} 
                      onDelete={handleDeleteWidget}
                      onSetActive={handleSetActiveWidget}
                      onSaveRecords={handleSaveRecords}
                      currentUser={currentUserData}
                  />
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>会社単位の目標を管理する権限がありません。</p>
                  </div>
                )}
            </TabsContent>
            <TabsContent value="team">
                <div className="text-center py-10 text-muted-foreground">
                    <p>この機能は現在準備中です。</p>
                </div>
            </TabsContent>
            <TabsContent value="personal">
                 <div className="text-center py-10 text-muted-foreground">
                    <p>この機能は現在準備中です。</p>
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
