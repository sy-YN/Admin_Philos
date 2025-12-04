
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


const WidgetPreview = dynamic(() => import('@/components/dashboard/widget-preview'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>,
});


export type Widget = {
  id: string;
  title: string;
  scope: 'company' | 'team' | 'personal';
  kpi: string;
  chartType: string;
  status: 'active' | 'inactive';
  fiscalYear?: number;
  fiscalYearStartMonth?: number;
};


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


export type SalesRecord = {
    id: string; // YYYY-MM
    year: number;
    month: number;
    salesTarget: number;
    salesActual: number;
    achievementRate: number;
}

const calculateAchievementRate = (actual: number, target: number) => {
  if (target === 0) return actual > 0 ? 100 : 0;
  return Math.round((actual / target) * 100);
}

const initialWidgets: Widget[] = [
    { id: '1', title: '全社売上高の推移 (2024年度)', kpi: 'sales_revenue', scope: 'company', chartType: 'composed', status: 'active', fiscalYear: 2024, fiscalYearStartMonth: 8 },
    { id: '4', title: '新規顧客獲得数', kpi: 'new_customers', scope: 'company', chartType: 'bar', status: 'inactive' },
    { id: '2', title: '営業チームのタスク完了率', kpi: 'task_completion_rate', scope: 'team', chartType: 'pie', status: 'active' },
    { id: '3', title: '個人の学習時間の記録', kpi: 'self_learning_time', scope: 'personal', chartType: 'line', status: 'active' },
    { id: '5', title: '全社売上高の推移 (2025年度)', kpi: 'sales_revenue', scope: 'company', chartType: 'composed', status: 'inactive', fiscalYear: 2025, fiscalYearStartMonth: 8 },
    { id: '6', title: '全社売上高の推移 (2026年度)', kpi: 'sales_revenue', scope: 'company', chartType: 'composed', status: 'inactive', fiscalYear: 2026, fiscalYearStartMonth: 8 },
];

const initialSalesRecords: SalesRecord[] = [
    // --- FY2024 Data (Aug 2023 - Jul 2024) ---
    { id: '2023-08', year: 2023, month: 8, salesTarget: 70, salesActual: 65, achievementRate: calculateAchievementRate(65, 70) },
    { id: '2023-09', year: 2023, month: 9, salesTarget: 72, salesActual: 75, achievementRate: calculateAchievementRate(75, 72) },
    { id: '2023-10', year: 2023, month: 10, salesTarget: 75, salesActual: 78, achievementRate: calculateAchievementRate(78, 75) },
    { id: '2023-11', year: 2023, month: 11, salesTarget: 78, salesActual: 70, achievementRate: calculateAchievementRate(70, 78) },
    { id: '2023-12', year: 2023, month: 12, salesTarget: 80, salesActual: 85, achievementRate: calculateAchievementRate(85, 80) },
    { id: '2024-01', year: 2024, month: 1, salesTarget: 82, salesActual: 83, achievementRate: calculateAchievementRate(83, 82) },
    { id: '2024-02', year: 2024, month: 2, salesTarget: 85, salesActual: 80, achievementRate: calculateAchievementRate(80, 85) },
    { id: '2024-03', year: 2024, month: 3, salesTarget: 88, salesActual: 90, achievementRate: calculateAchievementRate(90, 88) },
    { id: '2024-04', year: 2024, month: 4, salesTarget: 80, salesActual: 75, achievementRate: calculateAchievementRate(75, 80) },
    { id: '2024-05', year: 2024, month: 5, salesTarget: 85, salesActual: 88, achievementRate: calculateAchievementRate(88, 85) },
    { id: '2024-06', year: 2024, month: 6, salesTarget: 90, salesActual: 92, achievementRate: calculateAchievementRate(92, 90) },
    { id: '2024-07', year: 2024, month: 7, salesTarget: 95, salesActual: 98, achievementRate: calculateAchievementRate(98, 95) },

    // --- FY2025 Data (Aug 2024 - Jul 2025) ---
    { id: '2024-08', year: 2024, month: 8, salesTarget: 98, salesActual: 100, achievementRate: calculateAchievementRate(100, 98) },
    { id: '2024-09', year: 2024, month: 9, salesTarget: 100, salesActual: 98, achievementRate: calculateAchievementRate(98, 100) },
    { id: '2024-10', year: 2024, month: 10, salesTarget: 102, salesActual: 105, achievementRate: calculateAchievementRate(105, 102) },
    { id: '2024-11', year: 2024, month: 11, salesTarget: 105, salesActual: 103, achievementRate: calculateAchievementRate(103, 105) },
    { id: '2024-12', year: 2024, month: 12, salesTarget: 110, salesActual: 112, achievementRate: calculateAchievementRate(112, 110) },
    { id: '2025-01', year: 2025, month: 1, salesTarget: 108, salesActual: 110, achievementRate: calculateAchievementRate(110, 108) },
    { id: '2025-02', year: 2025, month: 2, salesTarget: 105, salesActual: 108, achievementRate: calculateAchievementRate(108, 105) },
    { id: '2025-03', year: 2025, month: 3, salesTarget: 112, salesActual: 115, achievementRate: calculateAchievementRate(115, 112) },
    { id: '2025-04', year: 2025, month: 4, salesTarget: 115, salesActual: 110, achievementRate: calculateAchievementRate(110, 115) },
    { id: '2025-05', year: 2025, month: 5, salesTarget: 118, salesActual: 120, achievementRate: calculateAchievementRate(120, 118) },
    { id: '2025-06', year: 2025, month: 6, salesTarget: 120, salesActual: 125, achievementRate: calculateAchievementRate(125, 120) },
    { id: '2025-07', year: 2025, month: 7, salesTarget: 125, salesActual: 128, achievementRate: calculateAchievementRate(128, 125) },

    // --- FY2026 Data (Aug 2025 - Jul 2026) ---
    { id: '2025-08', year: 2025, month: 8, salesTarget: 120, salesActual: 0, achievementRate: 0 },
    { id: '2025-09', year: 2025, month: 9, salesTarget: 122, salesActual: 0, achievementRate: 0 },
    { id: '2025-10', year: 2025, month: 10, salesTarget: 125, salesActual: 0, achievementRate: 0 },
    { id: '2025-11', year: 2025, month: 11, salesTarget: 128, salesActual: 0, achievementRate: 0 },
    { id: '2025-12', year: 2025, month: 12, salesTarget: 130, salesActual: 0, achievementRate: 0 },
    { id: '2026-01', year: 2026, month: 1, salesTarget: 132, salesActual: 0, achievementRate: 0 },
    { id: '2026-02', year: 2026, month: 2, salesTarget: 135, salesActual: 0, achievementRate: 0 },
    { id: '2026-03', year: 2026, month: 3, salesTarget: 138, salesActual: 0, achievementRate: 0 },
    { id: '2026-04', year: 2026, month: 4, salesTarget: 140, salesActual: 0, achievementRate: 0 },
    { id: '2026-05', year: 2026, month: 5, salesTarget: 142, salesActual: 0, achievementRate: 0 },
    { id: '2026-06', year: 2026, month: 6, salesTarget: 145, salesActual: 0, achievementRate: 0 },
    { id: '2026-07', year: 2026, month: 7, salesTarget: 150, salesActual: 0, achievementRate: 0 },
];


function WidgetDialog({ widget, onSave, children, defaultScope }: { widget?: Widget | null, onSave: (data: Omit<Widget, 'id' | 'status'>) => void, children: React.ReactNode, defaultScope: WidgetScope }) {
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
    onSave({ 
      title, 
      scope, 
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
              <Select value={scope} onValueChange={(v: any) => { setScope(v); setKpi(''); setChartType(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">会社単位</SelectItem>
                  <SelectItem value="team">チーム単位</SelectItem>
                  <SelectItem value="personal">個人単位</SelectItem>
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
  salesRecords,
  onSave,
  children
}: {
  widget: Widget;
  salesRecords: SalesRecord[];
  onSave: (records: SalesRecord[]) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [monthlyData, setMonthlyData] = useState<Map<string, { target: string; actual: string }>>(new Map());

  const fiscalYearMonths = useMemo(() => {
    if (!widget.fiscalYear) return [];
    return getMonthsForFiscalYear(widget.fiscalYear, widget.fiscalYearStartMonth);
  }, [widget.fiscalYear, widget.fiscalYearStartMonth]);
  
  useEffect(() => {
    if (open) {
      const initialData = new Map();
      fiscalYearMonths.forEach(({ year, month }) => {
        const id = `${year}-${String(month).padStart(2, '0')}`;
        const record = salesRecords.find(r => r.id === id);
        initialData.set(id, {
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
    const newRecords: SalesRecord[] = [];
    let hasError = false;

    monthlyData.forEach((values, id) => {
        const [year, month] = id.split('-').map(Number);
        const salesTarget = parseFloat(values.target) || 0;
        const salesActual = parseFloat(values.actual) || 0;
        
        if (isNaN(salesTarget) || isNaN(salesActual)) {
            hasError = true;
        }

        newRecords.push({
            id,
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


function WidgetList({
  widgets,
  salesData,
  onSave,
  onDelete,
  onSetActive,
  onSaveRecords
}: {
  widgets: Widget[];
  salesData: SalesRecord[];
  onSave: (data: Omit<Widget, 'id' | 'status'>, id?: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onSaveRecords: (records: SalesRecord[]) => void;
}) {

  const getChartDataForWidget = useCallback((widget: Widget): ChartData[] => {
    let dataForChart: SalesRecord[] = [];

    if (widget.kpi === 'sales_revenue' && widget.fiscalYear) {
      const startMonth = widget.fiscalYearStartMonth || 8;
      const fiscalYearMonths = getMonthsForFiscalYear(widget.fiscalYear, startMonth);
      
      dataForChart = fiscalYearMonths.map(({ year, month }) => {
        const id = `${year}-${String(month).padStart(2, '0')}`;
        const found = salesData.find(record => record.id === id);
        if (found) return found;

        // If no record, return a default object
        return {
          id,
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
  }, [salesData]);


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
        <Card key={widget.id} className={cn(
          "flex flex-col",
          widget.status === 'active' && "ring-2 ring-primary"
        )}>
          <CardHeader className='flex-row items-center justify-between pb-2'>
            <CardTitle className="text-base flex items-center gap-2">
              {widget.status === 'active' && <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />}
              {widget.title}
            </CardTitle>
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
                <WidgetDialog widget={widget} onSave={(data) => onSave(data, widget.id)} defaultScope={widget.scope}>
                  <DropdownMenuItem onSelect={e => e.preventDefault()}>
                      <Edit className="mr-2 h-4 w-4"/>編集
                  </DropdownMenuItem>
                </WidgetDialog>
                 {widget.kpi === 'sales_revenue' && (
                    <SalesDataManagementDialog widget={widget} salesRecords={salesData} onSave={onSaveRecords}>
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
          </CardHeader>
          <CardContent className="h-60 w-full flex-grow">
             <WidgetPreview 
               widget={widget} 
               chartData={getChartDataForWidget(widget)}
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
      ))}
    </div>
  );
}


export default function DashboardSettingsPage() {
    const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
    const [activeTab, setActiveTab] = useState<WidgetScope>('company');
    const [salesRecords, setSalesRecords] = useState<SalesRecord[]>(initialSalesRecords);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleSaveWidget = (data: Omit<Widget, 'id' | 'status'>, id?: string) => {
        if (id) {
            setWidgets(widgets.map(w => w.id === id ? { ...w, ...data, id } : w));
        } else {
            const currentActive = widgets.find(w => w.scope === data.scope && w.status === 'active');
            const newWidget: Widget = { ...data, id: new Date().toISOString(), status: currentActive ? 'inactive' : 'active' };
            setWidgets([...widgets, newWidget]);
        }
    };

    const handleDeleteWidget = (id: string) => {
      setWidgets(widgets.filter(w => w.id !== id));
    };

    const handleSetActiveWidget = (id: string) => {
      const widgetToActivate = widgets.find(w => w.id === id);
      if (!widgetToActivate) return;
    
      setWidgets(widgets.map(w => {
        if (w.scope === widgetToActivate.scope) {
          return { ...w, status: w.id === id ? 'active' : 'inactive' };
        }
        return w;
      }));
    };

    const handleSaveRecords = (newRecords: SalesRecord[]) => {
      setSalesRecords(prevRecords => {
        const newRecordIds = new Set(newRecords.map(r => r.id));
        // Keep old records that are not in the new batch
        const oldRecordsToKeep = prevRecords.filter(r => !newRecordIds.has(r.id));
        return [...oldRecordsToKeep, ...newRecords].sort((a,b) => a.id.localeCompare(b.id));
      });
    };

    const widgetsForTab = useMemo(() => {
      return widgets.filter(w => w.scope === activeTab).sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return (b.fiscalYear ?? 0) - (a.fiscalYear ?? 0) || a.title.localeCompare(b.title);
      });
    }, [widgets, activeTab]);

  if (!isMounted) {
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

            <div className='flex items-center gap-4'>
                <div className='flex items-center gap-2'>
                  <WidgetDialog onSave={handleSaveWidget} defaultScope={activeTab}>
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          新規ウィジェット追加
                      </Button>
                  </WidgetDialog>
                </div>
            </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WidgetScope)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="company">会社単位</TabsTrigger>
            <TabsTrigger value="team">チーム単位</TabsTrigger>
            <TabsTrigger value="personal">個人単位</TabsTrigger>
            </TabsList>
            <TabsContent value="company">
                <WidgetList 
                    widgets={widgetsForTab} 
                    salesData={salesRecords} 
                    onSave={handleSaveWidget} 
                    onDelete={handleDeleteWidget}
                    onSetActive={handleSetActiveWidget}
                    onSaveRecords={handleSaveRecords}
                />
            </TabsContent>
            <TabsContent value="team">
                <WidgetList 
                    widgets={widgetsForTab} 
                    salesData={salesRecords} 
                    onSave={handleSaveWidget} 
                    onDelete={handleDeleteWidget}
                    onSetActive={handleSetActiveWidget}
                    onSaveRecords={handleSaveRecords}
                />
            </TabsContent>
            <TabsContent value="personal">
                 <WidgetList 
                    widgets={widgetsForTab} 
                    salesData={salesRecords} 
                    onSave={handleSaveWidget} 
                    onDelete={handleDeleteWidget}
                    onSetActive={handleSetActiveWidget}
                    onSaveRecords={handleSaveRecords}
                />
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
