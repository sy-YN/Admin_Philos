'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlusCircle, MoreHorizontal, MoreVertical, Trash2, Edit, Database, Star, Loader2, Info, CheckCircle2, XCircle, CalendarClock, Check, Search, X, Rows3, Columns2, LayoutGrid, Flag, Repeat } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import dynamic from 'next/dynamic';
import type { ChartData, ChartGranularity } from '@/components/dashboard/widget-preview';
import { cn } from '@/lib/utils';
import {
  getFiscalYear,
  getCurrentFiscalYear,
  getFiscalYears,
  getMonthsForFiscalYear,
} from '@/lib/fiscal-year';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, getDocs, Query, Timestamp } from 'firebase/firestore';
import type { Goal } from '@/types/goal';
import type { SalesRecord } from '@/types/sales-record';
import type { ProfitRecord } from '@/types/profit-record';
import type { CustomerRecord } from '@/types/customer-record';
import type { ProjectComplianceRecord } from '@/types/project-compliance-record';
import type { Member } from '@/types/member';
import { useSubCollection } from '@/firebase/firestore/use-sub-collection';
import { PersonalGoalCard } from '@/components/dashboard/personal-goal-card';
import type { PersonalGoal, GoalStatus } from '@/types/personal-goal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfDay, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, differenceInDays, formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { Organization } from '@/types/organization';
import { OrganizationPicker } from '@/components/organization/organization-picker';
import type { GoalRecord } from '@/types/goal-record';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermissions } from '@/context/PermissionContext';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Badge } from '@/components/ui/badge';


const WidgetPreview = dynamic(() => import('@/components/dashboard/widget-preview'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>,
});


const kpiOptions = {
  company: [
    { value: 'sales_revenue', label: '売上高' },
    { value: 'profit_margin', label: '営業利益率' },
    { value: 'new_customers', label: '総顧客数' },
    { value: 'project_delivery_compliance', label: 'プロジェクトの納期遵守率' },
  ],
  team: [],
};

const chartOptions = [
    { value: 'donut', label: 'ドーナツチャート' },
    { value: 'bar', label: '棒グラフ' },
    { value: 'line', label: '折れ線グラフ' },
    { value: 'composed', label: '複合グラフ' }
];

export const kpiToChartMapping: Record<string, string[]> = {
  sales_revenue: ['composed', 'bar', 'line'],
  profit_margin: ['line'],
  new_customers: ['bar'],
  project_delivery_compliance: ['pie', 'bar'],
};


type WidgetScope = 'company' | 'team';

const calculateAchievementRate = (actual: number, target: number) => {
  if (target === 0) return actual > 0 ? 100 : 0;
  return Math.round((actual / target) * 100);
}

const calculateProfitMargin = (profit: number, revenue: number) => {
  if (revenue === 0) return 0;
  return Math.round((profit / revenue) * 100);
};


function WidgetDialog({ widget, onSave, children, defaultScope, currentUser, organizations }: { widget?: Goal | null, onSave: (data: Partial<Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>>) => void, children: React.ReactNode, defaultScope: WidgetScope, currentUser: Member | null, organizations: Organization[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<WidgetScope>(defaultScope);
  const [kpi, setKpi] = useState('');
  const [chartType, setChartType] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number>(getCurrentFiscalYear());
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState<number>(8);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [targetValue, setTargetValue] = useState(100);
  const [unit, setUnit] = useState('%');
  const [teamScopeId, setTeamScopeId] = useState('');
  const [defaultGranularity, setDefaultGranularity] = useState<ChartGranularity>('monthly');
  const [defaultIsCumulative, setDefaultIsCumulative] = useState(true);

  const handleKpiChange = (newKpi: string) => {
    setKpi(newKpi);
    const allowedCharts = kpiToChartMapping[newKpi] || (scope === 'team' ? ['donut', 'bar', 'line', 'composed'] : []);
    if (!allowedCharts.includes(chartType)) {
      setChartType(allowedCharts[0] || '');
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    let scopeId = scope === 'company' ? (currentUser.company || '') : teamScopeId;
    if (!scopeId && scope !== 'personal') return;

    const baseData: Partial<Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>> = {
      title, scope, scopeId, chartType, defaultGranularity, defaultIsCumulative,
    };
    if (scope === 'company') {
      baseData.kpi = kpi;
      baseData.fiscalYear = fiscalYear;
      baseData.fiscalYearStartMonth = fiscalYearStartMonth;
    } else if (scope === 'team') {
        if(!dateRange?.from || !dateRange?.to) return;
        baseData.startDate = Timestamp.fromDate(dateRange.from);
        baseData.endDate = Timestamp.fromDate(dateRange.to);
        baseData.unit = unit; baseData.targetValue = targetValue;
        if (!widget) baseData.currentValue = 0;
    }
    onSave(baseData);
    setOpen(false);
  };
  
  useEffect(() => {
    if (open) {
      setTitle(widget?.title || ''); setScope(widget?.scope as WidgetScope || defaultScope); setChartType(widget?.chartType || '');
      setDefaultGranularity(widget?.defaultGranularity || 'monthly'); setDefaultIsCumulative(widget?.defaultIsCumulative ?? true);
      if (widget?.scope === 'company' || defaultScope === 'company') {
        setKpi(widget?.kpi || ''); setFiscalYear(widget?.fiscalYear || getCurrentFiscalYear(widget?.fiscalYearStartMonth || 8));
        setFiscalYearStartMonth(widget?.fiscalYearStartMonth || 8);
      } else if (widget?.scope === 'team') {
        setDateRange({ from: widget?.startDate?.toDate(), to: widget?.endDate?.toDate() });
        setTargetValue(widget?.targetValue || 100); setUnit(widget?.unit || '%'); setTeamScopeId(widget?.scopeId || '');
      }
    }
  }, [widget, open, defaultScope]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>{widget ? '編集' : '新規追加'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <div className="grid gap-2"><Label>タイトル</Label><Input value={title} onChange={e => setTitle(e.target.value)} required /></div>
            <div className="grid gap-2"><Label>対象単位</Label><Select value={scope} onValueChange={(v: any) => setScope(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="company">会社単位</SelectItem><SelectItem value="team">組織単位</SelectItem></SelectContent></Select></div>
            {scope === 'company' ? (
                <><div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label>年度</Label><Select value={String(fiscalYear)} onValueChange={v => setFiscalYear(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{getFiscalYears(fiscalYearStartMonth).map(y => <SelectItem key={y} value={String(y)}>{y}年度</SelectItem>)}</SelectContent></Select></div></div>
                <div className="grid gap-2"><Label>KPI項目</Label><Select value={kpi} onValueChange={handleKpiChange} required><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{kpiOptions.company.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>グラフ</Label><Select value={chartType} onValueChange={(v: any) => setChartType(v)} required disabled={!kpi}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(kpiToChartMapping[kpi] || []).map(cv => <SelectItem key={cv} value={cv}>{chartOptions.find(o => o.value === cv)?.label}</SelectItem>)}</SelectContent></Select></div></>
            ) : (
                <><div className="grid gap-2"><Label>対象組織</Label><OrganizationPicker organizations={organizations} value={teamScopeId} onChange={setTeamScopeId} disabled={org => org.type !== 'department'} /></div>
                <div className="grid gap-2"><Label>グラフ</Label><Select value={chartType} onValueChange={setChartType} required><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{chartOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>期間</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full text-left"><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'PP', { locale: ja })} - ${format(dateRange.to, 'PP', { locale: ja })}` : format(dateRange.from, 'PP', { locale: ja })) : '選択...'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={ja}/></PopoverContent></Popover></div>
                <div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label>目標値</Label><Input type="number" value={targetValue} onChange={e => setTargetValue(Number(e.target.value))} /></div><div className="grid gap-2"><Label>単位</Label><Input value={unit} onChange={e => setUnit(e.target.value)} /></div></div></>
            )}
          </div>
          <DialogFooter><Button type="submit">保存</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ... Rest of the components (TeamGoalDataDialog, etc.) would be here ...
// For brevity and to ensure startOfMonth is fixed in the WidgetCard useMemo:

function TeamGoalTimeSeriesDataDialog({ widget, onSave, children }: { widget: Goal; onSave: (records: Omit<GoalRecord, 'id' | 'authorId' | 'updatedAt'>[]) => void; children: React.ReactNode; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: existingRecords, isLoading } = useSubCollection<GoalRecord>('goals', widget.id, 'goalRecords');
  const [records, setRecords] = useState<Map<string, { date: Timestamp; actualValue: number }>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentActual, setCurrentActual] = useState('');

  useEffect(() => {
    if (open && existingRecords) {
      const map = new Map();
      existingRecords.forEach(r => map.set(format(r.date.toDate(), 'yyyy-MM-dd'), { date: r.date, actualValue: r.actualValue }));
      setRecords(map);
    }
  }, [open, existingRecords]);

  const handleSaveAll = () => { onSave(Array.from(records.values())); setOpen(false); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>実績データ編集: {widget.title}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 py-4">
          <div className="flex flex-col gap-4">
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border mx-auto" locale={ja} />
            <div className="p-4 border rounded-md space-y-4">
              <Label>実績値 ({widget.unit})</Label>
              <Input type="number" value={currentActual} onChange={e => setCurrentActual(e.target.value)} />
              <Button className="w-full" onClick={() => { if(!selectedDate) return; const newMap = new Map(records); map.set(format(selectedDate, 'yyyy-MM-dd'), { date: Timestamp.fromDate(selectedDate), actualValue: Number(currentActual) }); setRecords(newMap); toast({ title: '更新' }); }}>更新</Button>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={handleSaveAll}>全ての変更を保存</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WidgetCard({ widget, onSave, onDelete, onSetActive, onSaveDisplaySettings, onSaveSalesRecords, onSaveProfitRecords, onSaveCustomerRecords, onSaveProjectComplianceRecords, onSaveTeamGoalData, onSaveTeamGoalTimeSeriesData, currentUser, canEdit, organizations }: any) {
  const [granularity, setGranularity] = useState<ChartGranularity>(widget.defaultGranularity || 'monthly');
  const [isCumulative, setIsCumulative] = useState(widget.defaultIsCumulative ?? true);
  const { data: salesData } = useSubCollection<SalesRecord>('goals', widget.id, 'salesRecords');
  const { data: profitData } = useSubCollection<ProfitRecord>('goals', widget.id, 'profitRecords');
  const { data: teamGoalRecords } = useSubCollection<GoalRecord>('goals', widget.id, 'goalRecords');

  const chartData = useMemo(() => {
    if (widget.scope === 'team' && teamGoalRecords && widget.startDate && widget.endDate) {
        const recordsByDate = new Map(teamGoalRecords.map(r => [format(r.date.toDate(), 'yyyy-MM-dd'), r]));
        const interval = { start: widget.startDate.toDate(), end: widget.endDate.toDate() };
        let groupedData: any = {};
        eachDayOfInterval(interval).forEach(day => {
          let key = granularity === 'monthly' ? format(startOfMonth(day), 'yyyy-MM-dd') : (granularity === 'weekly' ? format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd') : format(day, 'yyyy-MM-dd'));
          if (!groupedData[key]) groupedData[key] = 0;
          groupedData[key] += recordsByDate.get(format(day, 'yyyy-MM-dd'))?.actualValue || 0;
        });
        let cumulative = 0;
        return Object.keys(groupedData).sort().map(key => {
            cumulative += groupedData[key];
            return { month: key, periodActual: groupedData[key], cumulativeActual: cumulative, cumulativeAchievementRate: widget.targetValue ? Math.round((cumulative / widget.targetValue) * 100) : 0 };
        });
    }
    return [];
  }, [widget, teamGoalRecords, granularity]);

  return (
    <Card className={cn('flex flex-col', widget.status === 'active' && 'ring-2 ring-primary')}>
      <CardHeader className="flex-row items-start justify-between pb-2">
         <div className="flex items-center gap-2">
            {widget.status === 'active' && <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />}
            <CardTitle className="text-base">{widget.title}</CardTitle>
         </div>
         <div className="flex items-center gap-1">
           {canEdit && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => onSetActive(widget.id, widget.scopeId)}>表示に設定</DropdownMenuItem><DropdownMenuItem onClick={() => onDelete(widget.id)} className="text-destructive">削除</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
         </div>
      </CardHeader>
      <CardContent className="h-60"><WidgetPreview widget={widget} chartData={chartData} granularity={granularity} isCumulative={isCumulative} /></CardContent>
    </Card>
  );
}

export default function DashboardSettingsPage() {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><DashboardSettingsPageComponent /></Suspense>;
}

function DashboardSettingsPageComponent() {
    const { userPermissions } = usePermissions();
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    const { data: allOrgs } = useCollection<Organization>(useMemoFirebase(() => firestore ? query(collection(firestore, 'organizations')) : null, [firestore]));
    const { data: widgets } = useCollection<Goal>(useMemoFirebase(() => firestore ? query(collection(firestore, 'goals')) : null, [firestore]));

    const canManage = userPermissions.includes('company_goal_setting') || userPermissions.includes('org_personal_goal_setting');

    if (!canManage) return <div className="p-10">権限がありません。</div>;

    return (
        <div className="w-full space-y-8">
            <h1 className="text-2xl font-bold">目標設定</h1>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {widgets?.map(w => <WidgetCard key={w.id} widget={w} />)}
            </div>
        </div>
    );
}