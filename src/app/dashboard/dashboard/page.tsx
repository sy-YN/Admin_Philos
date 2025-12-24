
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlusCircle, MoreHorizontal, Trash2, Edit, Database, Star, Loader2, Info, Share2, CheckCircle2, XCircle } from 'lucide-react';
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
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, getDocs, Query, getDoc, Timestamp } from 'firebase/firestore';
import type { Goal } from '@/types/goal';
import type { SalesRecord } from '@/types/sales-record';
import type { ProfitRecord } from '@/types/profit-record';
import type { CustomerRecord } from '@/types/customer-record';
import type { ProjectComplianceRecord } from '@/types/project-compliance-record';
import type { Member } from '@/types/member';
import { useSubCollection } from '@/firebase/firestore/use-sub-collection';
import type { Role } from '@/types/role';
import { PersonalGoalCard } from '@/components/dashboard/personal-goal-card';
import type { PersonalGoal, GoalStatus } from '@/types/personal-goal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { Organization } from '@/types/organization';
import { OrganizationPicker } from '@/components/organization/organization-picker';


const WidgetPreview = dynamic(() => import('@/components/dashboard/widget-preview'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>,
});


const kpiOptions = {
  company: [
    { value: 'sales_revenue', label: '売上高' },
    { value: 'profit_margin', label: '営業利益率' },
    { value: 'new_customers', label: '総顧客数' },
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
  sales_revenue: ['composed', 'bar', 'line'],
  profit_margin: ['line'],
  new_customers: ['bar'],
  project_delivery_compliance: ['pie', 'bar'],
  // Team & Personal
  task_completion_rate: ['donut', 'pie', 'bar'],
  project_progress: ['donut'],
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
  const [currentValue, setCurrentValue] = useState(0);
  const [unit, setUnit] = useState('%');
  const [teamScopeId, setTeamScopeId] = useState('');

  const availableChartOptions = useMemo(() => {
    if (!kpi) return [];
    let allowedChartTypes = kpiToChartMapping[kpi] || [];
    if(scope === 'team') {
       allowedChartTypes = ['donut', 'bar', 'line', 'composed'];
    }
    return chartOptions.filter(option => allowedChartTypes.includes(option.value));
  }, [kpi, scope]);

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
    
    let scopeId = '';
    if (scope === 'company') scopeId = currentUser.company || '';
    if (scope === 'team') scopeId = teamScopeId;
    if (scope === 'personal') scopeId = currentUser.uid;

    if (!scopeId) {
        alert("ユーザー情報から対象を特定できませんでした。");
        return;
    }

    const baseData: Partial<Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>> = {
      title,
      scope,
      scopeId,
      kpi,
      chartType,
    };
    
    if (scope === 'company') {
      const needsFiscalYear = kpi === 'sales_revenue' || kpi === 'profit_margin' || kpi === 'new_customers' || kpi === 'project_delivery_compliance';
      if (needsFiscalYear) {
        baseData.fiscalYear = fiscalYear;
        baseData.fiscalYearStartMonth = fiscalYearStartMonth;
      }
    } else if (scope === 'team') {
        if(!dateRange?.from || !dateRange?.to) {
            alert('期間を選択してください。');
            return;
        }
        baseData.startDate = Timestamp.fromDate(dateRange.from);
        baseData.endDate = Timestamp.fromDate(dateRange.to);
        baseData.targetValue = targetValue;
        baseData.currentValue = currentValue;
        baseData.unit = unit;
    }

    onSave(baseData);
    setOpen(false);
  };
  
  useEffect(() => {
    if (open) {
      const initialScope = widget?.scope || defaultScope;
      setTitle(widget?.title || '');
      setScope(initialScope);
      setKpi(widget?.kpi || '');
      setChartType(widget?.chartType || '');

      if (initialScope === 'company') {
        const startMonth = widget?.fiscalYearStartMonth || 8;
        setFiscalYear(widget?.fiscalYear || getCurrentFiscalYear(startMonth));
        setFiscalYearStartMonth(startMonth);
      } else if (initialScope === 'team') {
        setDateRange({ from: widget?.startDate?.toDate(), to: widget?.endDate?.toDate() });
        setTargetValue(widget?.targetValue || 100);
        setCurrentValue(widget?.currentValue || 0);
        setUnit(widget?.unit || '%');
        setTeamScopeId(widget?.scopeId || '');
      }
    } else {
      // Reset form on close
      setTitle('');
      setScope(defaultScope);
      setKpi('');
      setChartType('');
      setFiscalYear(getCurrentFiscalYear());
      setFiscalYearStartMonth(8);
      setDateRange(undefined);
      setTargetValue(100);
      setCurrentValue(0);
      setUnit('%');
      setTeamScopeId('');
    }
  }, [widget, open, defaultScope]);

  const needsFiscalYear = scope === 'company' && (kpi === 'sales_revenue' || kpi === 'profit_margin' || kpi === 'new_customers' || kpi === 'project_delivery_compliance');
  const needsTeamFields = scope === 'team';
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

            <div className="grid gap-2">
              <Label htmlFor="widget-scope">対象単位</Label>
              <Select value={scope} onValueChange={(v: any) => { setScope(v); setKpi(''); setChartType(''); }} disabled={isCompanyScopeOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">会社単位</SelectItem>
                  <SelectItem value="team">組織単位</SelectItem>
                  <SelectItem value="personal">個人単位</SelectItem>
                </SelectContent>
              </Select>
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
            
            {needsTeamFields && (
                <>
                 <div className="grid gap-2">
                    <Label htmlFor="team-org-picker">対象組織</Label>
                    <OrganizationPicker organizations={organizations} value={teamScopeId} onChange={setTeamScopeId} />
                 </div>
                  <div className="grid gap-2">
                     <Label>期間</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant="outline" className={cn('w-full justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, 'PPP', { locale: ja })} - {format(dateRange.to, 'PPP', { locale: ja })}</>) : (format(dateRange.from, 'PPP', { locale: ja }))) : (<span>日付を選択</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus locale={ja} /></PopoverContent>
                      </Popover>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                          <Label>目標値</Label>
                          <Input type="number" value={targetValue} onChange={e => setTargetValue(Number(e.target.value))} />
                      </div>
                      <div className="grid gap-2">
                          <Label>単位</Label>
                          <Input value={unit} onChange={e => setUnit(e.target.value)} />
                      </div>
                  </div>
                   <div className="grid gap-2">
                       <Label>現在の進捗</Label>
                       <Input type="number" value={currentValue} onChange={e => setCurrentValue(Number(e.target.value))} />
                   </div>
                </>
            )}

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

function ProfitDataManagementDialog({
  widget,
  onSave,
  children
}: {
  widget: Goal;
  onSave: (records: Omit<ProfitRecord, 'id'>[]) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: profitRecords } = useSubCollection<ProfitRecord>('goals', widget.id, 'profitRecords');
  const [monthlyData, setMonthlyData] = useState<Map<string, { operatingProfit: string; salesRevenue: string }>>(new Map());

  const fiscalYearMonths = useMemo(() => {
    if (!widget.fiscalYear) return [];
    return getMonthsForFiscalYear(widget.fiscalYear, widget.fiscalYearStartMonth);
  }, [widget.fiscalYear, widget.fiscalYearStartMonth]);

  useEffect(() => {
    if (open && profitRecords) {
      const initialData = new Map();
      fiscalYearMonths.forEach(({ year, month }) => {
        const record = profitRecords.find(r => r.year === year && r.month === month);
        initialData.set(`${year}-${String(month).padStart(2, '0')}`, {
          operatingProfit: record?.operatingProfit.toString() || '0',
          salesRevenue: record?.salesRevenue.toString() || '0',
        });
      });
      setMonthlyData(initialData);
    }
  }, [open, profitRecords, fiscalYearMonths]);

  const handleInputChange = (id: string, field: 'operatingProfit' | 'salesRevenue', value: string) => {
    setMonthlyData(prev => {
      const newData = new Map(prev);
      const current = newData.get(id) || { operatingProfit: '0', salesRevenue: '0' };
      current[field] = value;
      newData.set(id, current);
      return newData;
    });
  };

  const handleSave = () => {
    const newRecords: Omit<ProfitRecord, 'id'>[] = [];
    let hasError = false;

    monthlyData.forEach((values, id) => {
        const [year, month] = id.split('-').map(Number);
        const operatingProfit = parseFloat(values.operatingProfit) || 0;
        const salesRevenue = parseFloat(values.salesRevenue) || 0;
        
        if (isNaN(operatingProfit) || isNaN(salesRevenue)) {
            hasError = true;
        }

        newRecords.push({
            year,
            month,
            operatingProfit,
            salesRevenue,
            profitMargin: calculateProfitMargin(operatingProfit, salesRevenue),
        });
    });
    
    if (hasError) {
        toast({ title: "入力エラー", description: "有効な数値を入力してください。", variant: "destructive" });
        return;
    }

    onSave(newRecords);
    toast({ title: "成功", description: "営業利益データを保存しました。" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>営業利益データ編集 ({widget.fiscalYear}年度)</DialogTitle>
          <DialogDescription>
            {widget.fiscalYear}年度（{widget.fiscalYearStartMonth}月始まり）の月次営業利益と売上高を入力します。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">年月</TableHead>
                <TableHead>営業利益 (百万円)</TableHead>
                <TableHead>売上高 (百万円)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fiscalYearMonths.map(({ year, month }) => {
                 const id = `${year}-${String(month).padStart(2, '0')}`;
                 const values = monthlyData.get(id) || { operatingProfit: '0', salesRevenue: '0' };
                 return (
                  <TableRow key={id}>
                    <TableCell className="font-medium">{year}年 {month}月</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={values.operatingProfit}
                        onChange={(e) => handleInputChange(id, 'operatingProfit', e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={values.salesRevenue}
                        onChange={(e) => handleInputChange(id, 'salesRevenue', e.target.value)}
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

function CustomerDataManagementDialog({
  widget,
  onSave,
  children,
}: {
  widget: Goal;
  onSave: (records: Omit<CustomerRecord, 'id'>[]) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: customerRecords } = useSubCollection<CustomerRecord>(
    'goals',
    widget.id,
    'customerRecords'
  );
  const [monthlyData, setMonthlyData] = useState<Map<string, string>>(new Map());

  const fiscalYearMonths = useMemo(() => {
    if (!widget.fiscalYear) return [];
    return getMonthsForFiscalYear(
      widget.fiscalYear,
      widget.fiscalYearStartMonth
    );
  }, [widget.fiscalYear, widget.fiscalYearStartMonth]);

  useEffect(() => {
    if (open && customerRecords) {
      const initialData = new Map();
      fiscalYearMonths.forEach(({ year, month }) => {
        const record = customerRecords.find(
          (r) => r.year === year && r.month === month
        );
        initialData.set(
          `${year}-${String(month).padStart(2, '0')}`,
          record?.totalCustomers.toString() || '0'
        );
      });
      setMonthlyData(initialData);
    }
  }, [open, customerRecords, fiscalYearMonths]);

  const handleInputChange = (id: string, value: string) => {
    setMonthlyData((prev) => new Map(prev).set(id, value));
  };

  const handleSave = () => {
    const newRecords: Omit<CustomerRecord, 'id'>[] = [];
    let hasError = false;

    monthlyData.forEach((value, id) => {
      const [year, month] = id.split('-').map(Number);
      const totalCustomers = parseInt(value, 10) || 0;

      if (isNaN(totalCustomers)) {
        hasError = true;
      }

      newRecords.push({
        year,
        month,
        totalCustomers,
      });
    });

    if (hasError) {
      toast({
        title: '入力エラー',
        description: '有効な数値を入力してください。',
        variant: 'destructive',
      });
      return;
    }

    onSave(newRecords);
    toast({ title: '成功', description: '顧客数データを保存しました。' });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>総顧客数データ編集 ({widget.fiscalYear}年度)</DialogTitle>
          <DialogDescription>
            {widget.fiscalYear}年度（{widget.fiscalYearStartMonth}月始まり）の月次総顧客数を入力します。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">年月</TableHead>
                <TableHead>総顧客数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fiscalYearMonths.map(({ year, month }) => {
                const id = `${year}-${String(month).padStart(2, '0')}`;
                const value = monthlyData.get(id) || '0';
                return (
                  <TableRow key={id}>
                    <TableCell className="font-medium">
                      {year}年 {month}月
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleInputChange(id, e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>一括保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectComplianceDataManagementDialog({
  widget,
  onSave,
  children,
}: {
  widget: Goal;
  onSave: (records: Omit<ProjectComplianceRecord, 'id'>[]) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: records } = useSubCollection<ProjectComplianceRecord>('goals', widget.id, 'projectComplianceRecords');
  const [monthlyData, setMonthlyData] = useState<Map<string, { compliant: string; minor_delay: string; delayed: string }>>(new Map());

  const fiscalYearMonths = useMemo(() => {
    if (!widget.fiscalYear) return [];
    return getMonthsForFiscalYear(widget.fiscalYear, widget.fiscalYearStartMonth);
  }, [widget.fiscalYear, widget.fiscalYearStartMonth]);

  useEffect(() => {
    if (open && records) {
      const initialData = new Map();
      fiscalYearMonths.forEach(({ year, month }) => {
        const record = records.find(r => r.year === year && r.month === month);
        initialData.set(`${year}-${String(month).padStart(2, '0')}`, {
          compliant: record?.counts?.compliant.toString() || '0',
          minor_delay: record?.counts?.minor_delay.toString() || '0',
          delayed: record?.counts?.delayed.toString() || '0',
        });
      });
      setMonthlyData(initialData);
    }
  }, [open, records, fiscalYearMonths]);

  const handleInputChange = (id: string, field: 'compliant' | 'minor_delay' | 'delayed', value: string) => {
    setMonthlyData(prev => {
      const newData = new Map(prev);
      const current = newData.get(id) || { compliant: '0', minor_delay: '0', delayed: '0' };
      current[field] = value;
      newData.set(id, current);
      return newData;
    });
  };

  const handleSave = () => {
    const newRecords: Omit<ProjectComplianceRecord, 'id'>[] = [];
    let hasError = false;

    monthlyData.forEach((values, id) => {
      const [year, month] = id.split('-').map(Number);
      const counts = {
        compliant: parseInt(values.compliant, 10) || 0,
        minor_delay: parseInt(values.minor_delay, 10) || 0,
        delayed: parseInt(values.delayed, 10) || 0,
      };
      
      if (isNaN(counts.compliant) || isNaN(counts.minor_delay) || isNaN(counts.delayed)) {
        hasError = true;
      }

      newRecords.push({ year, month, counts });
    });
    
    if (hasError) {
      toast({ title: "入力エラー", description: "有効な数値を入力してください。", variant: "destructive" });
      return;
    }

    onSave(newRecords);
    toast({ title: "成功", description: "プロジェクト遵守率データを保存しました。" });
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>プロジェクト遵守率データ編集 ({widget.fiscalYear}年度)</DialogTitle>
          <DialogDescription>
            {widget.fiscalYear}年度（{widget.fiscalYearStartMonth}月始まり）の月次プロジェクト件数を入力します。
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">年月</TableHead>
                <TableHead>遵守</TableHead>
                <TableHead>軽微な遅延</TableHead>
                <TableHead>遅延</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fiscalYearMonths.map(({ year, month }) => {
                 const id = `${year}-${String(month).padStart(2, '0')}`;
                 const values = monthlyData.get(id) || { compliant: '0', minor_delay: '0', delayed: '0' };
                 return (
                  <TableRow key={id}>
                    <TableCell className="font-medium">{year}年 {month}月</TableCell>
                    <TableCell>
                      <Input type="number" value={values.compliant} onChange={(e) => handleInputChange(id, 'compliant', e.target.value)} placeholder="0" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={values.minor_delay} onChange={(e) => handleInputChange(id, 'minor_delay', e.target.value)} placeholder="0" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={values.delayed} onChange={(e) => handleInputChange(id, 'delayed', e.target.value)} placeholder="0" />
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
  onSaveSalesRecords,
  onSaveProfitRecords,
  onSaveCustomerRecords,
  onSaveProjectComplianceRecords,
  currentUser,
  canEdit,
  organizations,
}: {
  widget: Goal;
  onSave: (data: Partial<Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>>, id?: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onSaveSalesRecords: (goalId: string, records: Omit<SalesRecord, 'id'>[]) => void;
  onSaveProfitRecords: (goalId: string, records: Omit<ProfitRecord, 'id'>[]) => void;
  onSaveCustomerRecords: (goalId: string, records: Omit<CustomerRecord, 'id'>[]) => void;
  onSaveProjectComplianceRecords: (goalId: string, records: Omit<ProjectComplianceRecord, 'id'>[]) => void;
  currentUser: Member | null;
  canEdit: boolean;
  organizations: Organization[];
}) {
  const { data: salesData } = useSubCollection<SalesRecord>('goals', widget.id, 'salesRecords');
  const { data: profitData } = useSubCollection<ProfitRecord>('goals', widget.id, 'profitRecords');
  const { data: customerData } = useSubCollection<CustomerRecord>('goals', widget.id, 'customerRecords');
  const { data: projectComplianceData } = useSubCollection<ProjectComplianceRecord>('goals', widget.id, 'projectComplianceRecords');

  const getChartDataForWidget = useCallback((): ChartData[] => {
    if (widget.scope === 'company') {
        if (!widget.fiscalYear) return [];
        const startMonth = widget.fiscalYearStartMonth || 8;
        const fiscalYearMonths = getMonthsForFiscalYear(widget.fiscalYear, startMonth);
        
        return fiscalYearMonths.map(({ year, month }) => {
            let chartEntry: ChartData = {
                month: `${year}-${String(month).padStart(2, '0')}`,
                salesActual: 0, salesTarget: 0, achievementRate: 0,
                profitMargin: 0,
                totalCustomers: 0,
                projectCompliant: 0, projectMinorDelay: 0, projectDelayed: 0,
            };
            if (widget.kpi === 'sales_revenue' && salesData) {
                const record = salesData.find(r => r.year === year && r.month === month);
                if (record) {
                    chartEntry.salesActual = record.salesActual;
                    chartEntry.salesTarget = record.salesTarget;
                    chartEntry.achievementRate = record.achievementRate;
                }
            }
            if (widget.kpi === 'profit_margin' && profitData) {
                const record = profitData.find(r => r.year === year && r.month === month);
                if (record) {
                    chartEntry.profitMargin = record.profitMargin;
                }
            }
            if (widget.kpi === 'new_customers' && customerData) {
              const record = customerData.find(r => r.year === year && r.month === month);
              if (record) {
                chartEntry.totalCustomers = record.totalCustomers;
              }
            }
            if (widget.kpi === 'project_delivery_compliance' && projectComplianceData) {
              const record = projectComplianceData.find(r => r.year === year && r.month === month);
              if (record) {
                  chartEntry.projectCompliant = record.counts.compliant;
                  chartEntry.projectMinorDelay = record.counts.minor_delay;
                  chartEntry.projectDelayed = record.counts.delayed;
              }
            }
            return chartEntry;
        }).sort((a, b) => a.month.localeCompare(b.month));
    }
    return []; // Team and personal charts might not use this format
  }, [salesData, profitData, customerData, projectComplianceData, widget]);

  let kpiLabel = 'N/A';
  if(widget.scope === 'company' || widget.scope === 'personal') {
    kpiLabel = kpiOptions[widget.scope].find(k => k.value === widget.kpi)?.label || 'N/A';
  } else if (widget.scope === 'team') {
    kpiLabel = widget.title; // For team goals, the title is the main label
  }

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
              <WidgetDialog widget={widget} onSave={(data) => onSave(data, widget.id)} defaultScope={widget.scope} currentUser={currentUser} organizations={organizations}>
                <DropdownMenuItem onSelect={e => e.preventDefault()}>
                    <Edit className="mr-2 h-4 w-4"/>編集
                </DropdownMenuItem>
              </WidgetDialog>
               {widget.scope === 'company' && widget.kpi === 'sales_revenue' && (
                  <SalesDataManagementDialog widget={widget} onSave={(records) => onSaveSalesRecords(widget.id, records)}>
                      <DropdownMenuItem onSelect={e => e.preventDefault()}>
                          <Database className="mr-2 h-4 w-4"/>データ編集
                      </DropdownMenuItem>
                  </SalesDataManagementDialog>
              )}
              {widget.scope === 'company' && widget.kpi === 'profit_margin' && (
                <ProfitDataManagementDialog widget={widget} onSave={(records) => onSaveProfitRecords(widget.id, records)}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Database className="mr-2 h-4 w-4" />
                    データ編集
                  </DropdownMenuItem>
                </ProfitDataManagementDialog>
              )}
              {widget.scope === 'company' && widget.kpi === 'new_customers' && (
                <CustomerDataManagementDialog
                  widget={widget}
                  onSave={(records) => onSaveCustomerRecords(widget.id, records)}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Database className="mr-2 h-4 w-4" />
                    データ編集
                  </DropdownMenuItem>
                </CustomerDataManagementDialog>
              )}
              {widget.scope === 'company' && widget.kpi === 'project_delivery_compliance' && (
                <ProjectComplianceDataManagementDialog widget={widget} onSave={(records) => onSaveProjectComplianceRecords(widget.id, records)}>
                    <DropdownMenuItem onSelect={e => e.preventDefault()}>
                        <Database className="mr-2 h-4 w-4"/>データ編集
                    </DropdownMenuItem>
                </ProjectComplianceDataManagementDialog>
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
                      ウィジェット「{widget.title}」を削除します。関連する月次データも全て削除され、この操作は元に戻せません。
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
           widget={widget}
           chartData={getChartDataForWidget()}
         />
      </CardContent>
      <CardFooter className='flex justify-between items-end text-xs text-muted-foreground pt-2'>
        <div>
          {widget.scope === 'company' && widget.fiscalYear && (
            <div className="text-xs">
              {widget.fiscalYear}年度 ({widget.fiscalYearStartMonth || 'N/A'}月始まり)
            </div>
          )}
           {widget.scope === 'team' && widget.startDate && widget.endDate && (
             <div className="text-xs">
               {format(widget.startDate.toDate(), 'yyyy/MM/dd')} - {format(widget.endDate.toDate(), 'yyyy/MM/dd')}
             </div>
           )}
          <div className="font-semibold text-foreground">{kpiLabel}</div>
        </div>
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
  onSaveSalesRecords,
  onSaveProfitRecords,
  onSaveCustomerRecords,
  onSaveProjectComplianceRecords,
  currentUser,
  canEdit,
  organizations,
  scope
}: {
  widgets: Goal[];
  onSave: (data: Partial<Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>>, id?: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string, scopeId: string) => void;
  onSaveSalesRecords: (goalId: string, records: Omit<SalesRecord, 'id'>[]) => void;
  onSaveProfitRecords: (goalId: string, records: Omit<ProfitRecord, 'id'>[]) => void;
  onSaveCustomerRecords: (goalId: string, records: Omit<CustomerRecord, 'id'>[]) => void;
  onSaveProjectComplianceRecords: (goalId: string, records: Omit<ProjectComplianceRecord, 'id'>[]) => void;
  currentUser: Member | null;
  canEdit: boolean;
  organizations: Organization[];
  scope: WidgetScope;
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
          onSetActive={() => onSetActive(widget.id, widget.scopeId)}
          onSaveSalesRecords={onSaveSalesRecords}
          onSaveProfitRecords={onSaveProfitRecords}
          onSaveCustomerRecords={onSaveCustomerRecords}
          onSaveProjectComplianceRecords={onSaveProjectComplianceRecords}
          currentUser={currentUser}
          canEdit={canEdit}
          organizations={organizations}
        />
      ))}
    </div>
  );
}

function PersonalGoalsList({
  user,
  onSave,
  onDelete,
}: {
  user: Member;
  onSave: (goal: Partial<PersonalGoal>, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const firestore = useFirestore();
  const [selectedGoal, setSelectedGoal] = useState<PersonalGoal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const personalGoalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'personalGoals'));
  }, [firestore, user.uid]);

  const { data: goals, isLoading: areGoalsLoading } = useCollection<PersonalGoal>(personalGoalsQuery);

  const { ongoing, completed, failed } = useMemo(() => {
    if (!goals) return { ongoing: [], completed: [], failed: [] };
    return {
      ongoing: goals.filter(g => g.status === '進行中'),
      completed: goals.filter(g => g.status === '達成済'),
      failed: goals.filter(g => g.status === '未達成'),
    };
  }, [goals]);

  const handleEdit = (goal: PersonalGoal) => {
    setSelectedGoal(goal);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedGoal(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
  };

  if (areGoalsLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }
  
  const hasOngoingGoal = ongoing.length > 0;

  return (
    <>
      <PersonalGoalDialog
        goal={selectedGoal}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={onSave}
        hasOngoingGoal={hasOngoingGoal}
      />
      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">進行中の目標</h3>
             {!hasOngoingGoal && (
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg max-w-md">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>
                        新しい目標を作成しましょう。メッセージは、あなたの目標達成に向けたポジティブな言葉や、次にとるべきアクションのヒントをAIが提案します。
                        </p>
                    </div>
                    <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 text-white">
                        目標を保存してメッセージを生成！
                    </Button>
                </div>
            )}
          </div>
           {hasOngoingGoal && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ongoing.map(goal => (
                <PersonalGoalCard key={goal.id} goal={goal} onEdit={() => handleEdit(goal)} onDelete={() => handleDelete(goal.id)} />
              ))}
            </div>
           )}
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">過去の目標</h3>
          {completed.length > 0 || failed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completed.map(goal => (
                 <PersonalGoalCard key={goal.id} goal={goal} onEdit={() => handleEdit(goal)} onDelete={() => handleDelete(goal.id)} />
              ))}
              {failed.map(goal => (
                 <PersonalGoalCard key={goal.id} goal={goal} onEdit={() => handleEdit(goal)} onDelete={() => handleDelete(goal.id)} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">完了した目標はまだありません。</p>
          )}
        </div>
      </div>
    </>
  );
}

function PersonalGoalDialog({
  goal,
  open,
  onOpenChange,
  onSave,
  hasOngoingGoal,
}: {
  goal: PersonalGoal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goal: Partial<PersonalGoal>, id?: string) => void;
  hasOngoingGoal: boolean;
}) {
  const [title, setTitle] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [progress, setProgress] = useState(0);
  const [isPublic, setIsPublic] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setTitle(goal?.title || '');
      setDateRange({
        from: goal?.startDate?.toDate(),
        to: goal?.endDate?.toDate(),
      });
      setProgress(goal?.progress || 0);
      setIsPublic(goal?.isPublic ?? true);
    }
  }, [goal, open]);

  const handleSubmit = () => {
    if (!title) {
      toast({ title: 'エラー', description: '目標タイトルは必須です。', variant: 'destructive' });
      return;
    }
    if (!dateRange?.from || !dateRange?.to) {
      toast({ title: 'エラー', description: '目標期間は必須です。', variant: 'destructive' });
      return;
    }

    if (!goal && hasOngoingGoal) {
      toast({ title: 'エラー', description: '「進行中」の目標は同時に複数設定できません。', variant: 'destructive' });
      return;
    }

    const today = startOfDay(new Date());
    let status: GoalStatus = '進行中';
    if (progress === 100) {
      status = '達成済';
    } else if (dateRange.to < today) {
      status = '未達成';
    }

    const goalData: Partial<PersonalGoal> = {
      title,
      startDate: Timestamp.fromDate(dateRange.from),
      endDate: Timestamp.fromDate(dateRange.to),
      progress,
      status,
      isPublic,
    };

    onSave(goalData, goal?.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? '個人目標を編集' : '新しい個人目標を作成'}</DialogTitle>
          <DialogDescription>
            あなたの目標を設定し、進捗を管理しましょう。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal-title">目標</Label>
            <Input id="goal-title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-date">期間</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="goal-date" variant="outline" className={cn('w-full justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'PPP', { locale: ja })} - {format(dateRange.to, 'PPP', { locale: ja })}
                      </>
                    ) : (
                      format(dateRange.from, 'PPP', { locale: ja })
                    )
                  ) : (
                    <span>日付を選択</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus locale={ja} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>進捗 ({progress}%)</Label>
            <Slider value={[progress]} onValueChange={([val]) => setProgress(val)} max={100} step={1} />
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="is-public-switch" checked={isPublic} onCheckedChange={setIsPublic} />
            <Label htmlFor="is-public-switch">他のメンバーに共有する</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={handleSubmit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function DashboardSettingsPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
    
    const [currentUserData, setCurrentUserData] = useState<Member | null>(null);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [isCurrentUserLoading, setIsCurrentUserLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<WidgetScope>('company');
    
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [editableOrgs, setEditableOrgs] = useState<Organization[]>([]);
    const { data: allOrganizations, isLoading: isLoadingOrgs } = useCollection<Organization>(useMemoFirebase(() => firestore ? query(collection(firestore, 'organizations')) : null, [firestore]));

    const fetchUserWithPermissions = useCallback(async (uid: string) => {
      if (!firestore) return { user: null, permissions: [] };

      const userDocRef = doc(firestore, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) return { user: null, permissions: [] };

      const userData = { id: userDoc.id, ...userDoc.data() } as Member;
      
      const roleDocRef = doc(firestore, 'roles', userData.role);
      const userPermsDocRef = doc(firestore, 'user_permissions', uid);

      const [roleDoc, userPermsDoc] = await Promise.all([
        getDoc(roleDocRef),
        getDoc(userPermsDocRef),
      ]);

      const rolePermissions = roleDoc.exists() ? (roleDoc.data() as Role).permissions : [];
      const individualPermissions = userPermsDoc.exists() ? userPermsDoc.data().permissions : [];
      
      const allPermissions = [...new Set([...rolePermissions, ...individualPermissions])];
      
      return { user: userData, permissions: allPermissions };
    }, [firestore]);


    useEffect(() => {
        if (isAuthUserLoading || isLoadingOrgs) return;
        
        if (authUser && allOrganizations) {
            setIsCurrentUserLoading(true);
            fetchUserWithPermissions(authUser.uid).then(({ user, permissions }) => {
                setCurrentUserData(user);
                setUserPermissions(permissions);

                const getSubTreeIds = (orgId: string, orgs: Organization[]): string[] => {
                    let children = orgs.filter(o => o.parentId === orgId);
                    let subTreeIds: string[] = [orgId];
                    children.forEach(child => {
                        subTreeIds = subTreeIds.concat(getSubTreeIds(child.id, orgs));
                    });
                    return subTreeIds;
                };

                if (user?.organizationId && permissions.includes('org_personal_goal_setting')) {
                    const userOrgTreeIds = getSubTreeIds(user.organizationId, allOrganizations);
                    setEditableOrgs(allOrganizations.filter(org => userOrgTreeIds.includes(org.id)));
                    setSelectedOrgId(user.organizationId);
                }
                
                if (!permissions.includes('company_goal_setting') && permissions.includes('org_personal_goal_setting')) {
                  setActiveTab('team');
                } else {
                  setActiveTab('company');
                }
                setIsCurrentUserLoading(false);
            });
        } else {
            setIsCurrentUserLoading(false);
        }
    }, [authUser, isAuthUserLoading, fetchUserWithPermissions, allOrganizations, isLoadingOrgs]);
    
    const goalsQuery = useMemoFirebase(() => {
        if (!firestore || !currentUserData || isAuthUserLoading || isCurrentUserLoading) return null;
        
        let queryConstraints = [where('scope', '==', activeTab)];

        if (activeTab === 'company') {
          if (!currentUserData.company) return null;
          queryConstraints.push(where('scopeId', '==', currentUserData.company));
        } else if (activeTab === 'team') {
          if (!selectedOrgId) return null;
          queryConstraints.push(where('scopeId', '==', selectedOrgId));
        } else if (activeTab === 'personal') {
          return null;
        }

        return query(collection(firestore, 'goals'), ...queryConstraints);

    }, [firestore, currentUserData, activeTab, isAuthUserLoading, isCurrentUserLoading, selectedOrgId]);

    const { data: widgets, isLoading: isLoadingWidgets } = useCollection<Goal>(goalsQuery as Query<Goal> | null);

    const handleSaveWidget = async (data: Partial<Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>>, id?: string) => {
        if (!firestore || !authUser || !widgets) return;
        
        try {
            if (id) {
                const widgetRef = doc(firestore, 'goals', id);
                await updateDoc(widgetRef, { ...data, updatedAt: serverTimestamp() });
                toast({ title: "成功", description: "ウィジェットを更新しました。" });
            } else {
                const currentActive = widgets.find(w => w.scope === data.scope && w.scopeId === data.scopeId && w.status === 'active');
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
        const goalRef = doc(firestore, 'goals', id);
        const subcollectionNames = ['salesRecords', 'profitRecords', 'customerRecords', 'projectComplianceRecords'];
        
        for (const subcollectionName of subcollectionNames) {
            const subcollectionRef = collection(goalRef, subcollectionName);
            const subcollectionSnapshot = await getDocs(subcollectionRef);
            if (!subcollectionSnapshot.empty) {
                const deleteBatch = writeBatch(firestore);
                subcollectionSnapshot.docs.forEach(doc => {
                    deleteBatch.delete(doc.ref);
                });
                await deleteBatch.commit();
            }
        }

        await deleteDoc(goalRef);
        
        toast({ title: "成功", description: "ウィジェットと関連データを削除しました。" });

      } catch (error) {
        console.error("Error deleting widget and its subcollections:", error);
        toast({ title: "エラー", description: "ウィジェットの削除に失敗しました。", variant: 'destructive' });
      }
    };

    const handleSetActiveWidget = async (id: string, scopeId: string) => {
      if (!firestore || !widgets) return;
      
      const batch = writeBatch(firestore);
      widgets.forEach(w => {
          if (w.scopeId === scopeId) {
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

    const handleSaveSalesRecords = async (goalId: string, newRecords: Omit<SalesRecord, 'id'>[]) => {
      if (!firestore || newRecords.length === 0) return;
      
      const batch = writeBatch(firestore);
      const subCollectionRef = collection(firestore, 'goals', goalId, 'salesRecords');
      
      newRecords.forEach(record => {
          const recordId = `${record.year}-${String(record.month).padStart(2, '0')}`;
          const recordRef = doc(subCollectionRef, recordId);
          batch.set(recordRef, record, { merge: true });
      });
      
      try {
        await batch.commit();
      } catch (error) {
        console.error("Error saving sales records:", error);
        toast({ title: "エラー", description: "売上データの保存に失敗しました。", variant: 'destructive' });
      }
    };
    
    const handleSaveProfitRecords = async (goalId: string, newRecords: Omit<ProfitRecord, 'id'>[]) => {
      if (!firestore || newRecords.length === 0) return;

      const batch = writeBatch(firestore);
      const subCollectionRef = collection(firestore, 'goals', goalId, 'profitRecords');
      
      newRecords.forEach(record => {
        const recordId = `${record.year}-${String(record.month).padStart(2, '0')}`;
        const recordRef = doc(subCollectionRef, recordId);
        batch.set(recordRef, record, { merge: true });
      });

      try {
        await batch.commit();
      } catch (error) {
        console.error("Error saving profit records:", error);
        toast({ title: "エラー", description: "営業利益データの保存に失敗しました。", variant: "destructive" });
      }
    };

    const handleSaveCustomerRecords = async (goalId: string, newRecords: Omit<CustomerRecord, 'id'>[]) => {
        if (!firestore || newRecords.length === 0) return;

        const batch = writeBatch(firestore);
        const subCollectionRef = collection(firestore, 'goals', goalId, 'customerRecords');
        
        newRecords.forEach(record => {
            const recordId = `${record.year}-${String(record.month).padStart(2, '0')}`;
            const recordRef = doc(subCollectionRef, recordId);
            batch.set(recordRef, record, { merge: true });
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error saving customer records:", error);
            toast({ title: "エラー", description: "顧客数データの保存に失敗しました。", variant: "destructive" });
        }
    };
    
    const handleSaveProjectComplianceRecords = async (goalId: string, newRecords: Omit<ProjectComplianceRecord, 'id'>[]) => {
        if (!firestore) return;
        const batch = writeBatch(firestore);
        const subCollectionRef = collection(firestore, 'goals', goalId, 'projectComplianceRecords');
        
        newRecords.forEach(record => {
            const recordId = `${record.year}-${String(record.month).padStart(2, '0')}`;
            const recordRef = doc(subCollectionRef, recordId);
            batch.set(recordRef, record, { merge: true });
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error saving project compliance records:", error);
            toast({ title: "エラー", description: "プロジェクト遵守率データの保存に失敗しました。", variant: "destructive" });
        }
    };

    const handleSavePersonalGoal = async (data: Partial<PersonalGoal>, id?: string) => {
      if (!firestore || !currentUserData) return;
      const collectionRef = collection(firestore, 'users', currentUserData.uid, 'personalGoals');

      try {
        if (id) {
          const docRef = doc(collectionRef, id);
          await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
          toast({ title: "成功", description: "個人目標を更新しました。" });
        } else {
          await addDoc(collectionRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          toast({ title: "成功", description: "新しい個人目標を作成しました。" });
        }
      } catch (error) {
        console.error("Error saving personal goal:", error);
        toast({ title: "エラー", description: "個人目標の保存に失敗しました。", variant: 'destructive' });
      }
    };

    const handleDeletePersonalGoal = async (id: string) => {
      if (!firestore || !currentUserData) return;
      try {
        await deleteDoc(doc(firestore, 'users', currentUserData.uid, 'personalGoals', id));
        toast({ title: "成功", description: "個人目標を削除しました。" });
      } catch (error) {
        console.error("Error deleting personal goal:", error);
        toast({ title: "エラー", description: "個人目標の削除に失敗しました。", variant: 'destructive' });
      }
    };

    
    const widgetsForTab = useMemo(() => {
      if (!widgets) return [];
      return [...widgets].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        if (a.scope === 'company') {
           return (b.fiscalYear ?? 0) - (a.fiscalYear ?? 0) || a.title.localeCompare(b.title);
        }
        if (a.scope === 'team') {
            const dateA = a.startDate?.toDate() ?? new Date(0);
            const dateB = b.startDate?.toDate() ?? new Date(0);
            return dateB.getTime() - dateA.getTime();
        }
        return a.title.localeCompare(b.title);
      });
    }, [widgets]);

  const isLoading = isAuthUserLoading || isCurrentUserLoading || isLoadingOrgs;

  const canManageCompanyGoals = userPermissions.includes('company_goal_setting');
  const canManageOrgPersonalGoals = userPermissions.includes('org_personal_goal_setting');

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="w-full space-y-8">
      <div>
         <div className="flex items-center justify-between mb-6">
            <div className='flex flex-col'>
              <h1 className="text-lg font-semibold md:text-2xl">目標設定</h1>
              <p className="text-sm text-muted-foreground">表示する指標やグラフの種類をカスタマイズします。</p>
            </div>
            {(activeTab !== 'personal' && (
              (activeTab === 'company' && canManageCompanyGoals) ||
              (activeTab === 'team' && canManageOrgPersonalGoals)
            )) && (
              <div className='flex items-center gap-4'>
                  <WidgetDialog onSave={handleSaveWidget} defaultScope={activeTab} currentUser={currentUserData} organizations={editableOrgs}>
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          新規ウィジェット追加
                      </Button>
                  </WidgetDialog>
              </div>
            )}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WidgetScope)}>
          <TabsList className={cn("grid w-full mb-6", (canManageCompanyGoals && canManageOrgPersonalGoals) ? "grid-cols-3" : (canManageOrgPersonalGoals ? "grid-cols-2" : (canManageCompanyGoals ? "grid-cols-1 max-w-[150px]" : "hidden")))}>
              {canManageCompanyGoals && <TabsTrigger value="company">会社単位</TabsTrigger>}
              {canManageOrgPersonalGoals && (
                <>
                  <TabsTrigger value="team">組織単位</TabsTrigger>
                  <TabsTrigger value="personal">個人単位</TabsTrigger>
                </>
              )}
            </TabsList>
            <TabsContent value="company">
                {canManageCompanyGoals ? (
                  isLoadingWidgets ? <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin"/></div> :
                  <WidgetList 
                      widgets={widgetsForTab} 
                      onSave={handleSaveWidget} 
                      onDelete={handleDeleteWidget}
                      onSetActive={handleSetActiveWidget}
                      onSaveSalesRecords={handleSaveSalesRecords}
                      onSaveProfitRecords={handleSaveProfitRecords}
                      onSaveCustomerRecords={handleSaveCustomerRecords}
                      onSaveProjectComplianceRecords={handleSaveProjectComplianceRecords}
                      currentUser={currentUserData}
                      canEdit={canManageCompanyGoals}
                      organizations={allOrganizations || []}
                      scope="company"
                  />
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>会社単位の目標を管理する権限がありません。</p>
                  </div>
                )}
            </TabsContent>
            <TabsContent value="team">
                {canManageOrgPersonalGoals ? (
                    <>
                    <div className="max-w-xs mb-6">
                        <OrganizationPicker
                          organizations={editableOrgs}
                          value={selectedOrgId}
                          onChange={setSelectedOrgId}
                        />
                    </div>
                     {isLoadingWidgets ? <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin"/></div> :
                      <WidgetList 
                          widgets={widgetsForTab} 
                          onSave={handleSaveWidget} 
                          onDelete={handleDeleteWidget}
                          onSetActive={handleSetActiveWidget}
                          onSaveSalesRecords={handleSaveSalesRecords}
                          onSaveProfitRecords={handleSaveProfitRecords}
                          onSaveCustomerRecords={handleSaveCustomerRecords}
                          onSaveProjectComplianceRecords={handleSaveProjectComplianceRecords}
                          currentUser={currentUserData}
                          canEdit={canManageOrgPersonalGoals}
                          organizations={allOrganizations || []}
                          scope="team"
                      />}
                    </>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>組織単位の目標を管理する権限がありません。</p>
                  </div>
                )}
            </TabsContent>
            <TabsContent value="personal">
                 {canManageOrgPersonalGoals ? (
                    !currentUserData ? (
                      <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin"/></div>
                    ) : (
                      <PersonalGoalsList
                        user={currentUserData}
                        onSave={handleSavePersonalGoal}
                        onDelete={handleDeletePersonalGoal}
                      />
                    )
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>個人単位の目標を管理する権限がありません。</p>
                  </div>
                )}
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
