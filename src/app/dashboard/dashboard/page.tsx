
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlusCircle, MoreHorizontal, Trash2, Edit, Database, Archive, Undo, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import dynamic from 'next/dynamic';
import type { Widget } from '@/components/dashboard/widget-preview';
import { ScrollArea } from '@/components/ui/scroll-area';

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


export type SalesRecord = {
    id: string;
    year: number;
    month: number;
    salesTarget: number;
    salesActual: number;
    achievementRate: number;
}

const calculateAchievementRate = (actual: number, target: number) => {
  if (target === 0) return 0;
  return Math.round((actual / target) * 100);
}

const initialWidgets: Widget[] = [
    { id: '1', title: '全社売上高の推移', kpi: 'sales_revenue', scope: 'company', chartType: 'composed', status: 'active' },
    { id: '2', title: '営業チームのタスク完了率', kpi: 'task_completion_rate', scope: 'team', chartType: 'pie', status: 'active' },
    { id: '3', title: '個人の学習時間の記録', kpi: 'self_learning_time', scope: 'personal', chartType: 'line', status: 'active' },
];

const initialSalesRecords: SalesRecord[] = [
    // 2023 Data
    { id: '2023-08', year: 2023, month: 8, salesTarget: 70, salesActual: 65, achievementRate: calculateAchievementRate(65, 70) },
    { id: '2023-09', year: 2023, month: 9, salesTarget: 72, salesActual: 75, achievementRate: calculateAchievementRate(75, 72) },
    { id: '2023-10', year: 2023, month: 10, salesTarget: 75, salesActual: 78, achievementRate: calculateAchievementRate(78, 75) },
    { id: '2023-11', year: 2023, month: 11, salesTarget: 75, salesActual: 78, achievementRate: calculateAchievementRate(78, 75) },
    { id: '2023-12', year: 2023, month: 12, salesTarget: 75, salesActual: 78, achievementRate: calculateAchievementRate(78, 75) },
    // 2024 Data
    { id: '2024-01', year: 2024, month: 1, salesTarget: 75, salesActual: 78, achievementRate: calculateAchievementRate(78, 75) },
    { id: '2024-02', year: 2024, month: 2, salesTarget: 75, salesActual: 78, achievementRate: calculateAchievementRate(78, 75) },
    { id: '2024-03', year: 2024, month: 3, salesTarget: 75, salesActual: 78, achievementRate: calculateAchievementRate(78, 75) },
    { id: '2024-04', year: 2024, month: 4, salesTarget: 80, salesActual: 75, achievementRate: calculateAchievementRate(75, 80) },
    { id: '2024-05', year: 2024, month: 5, salesTarget: 85, salesActual: 88, achievementRate: calculateAchievementRate(88, 85) },
    { id: '2024-06', year: 2024, month: 6, salesTarget: 90, salesActual: 92, achievementRate: calculateAchievementRate(92, 90) },
    { id: '2024-07', year: 2024, month: 7, salesTarget: 95, salesActual: 93, achievementRate: calculateAchievementRate(93, 95) },
    // Data for FY2025
    { id: '2024-08', year: 2024, month: 8, salesTarget: 98, salesActual: 100, achievementRate: calculateAchievementRate(100, 98) },
    { id: '2024-09', year: 2024, month: 9, salesTarget: 100, salesActual: 98, achievementRate: calculateAchievementRate(98, 100) },
    // Data for FY2026
    { id: '2025-08', year: 2025, month: 8, salesTarget: 100, salesActual: 105, achievementRate: calculateAchievementRate(105, 100) },
    { id: '2025-09', year: 2025, month: 9, salesTarget: 102, salesActual: 100, achievementRate: calculateAchievementRate(100, 102) },
];


function WidgetDialog({ widget, onSave, children, defaultScope }: { widget?: Widget | null, onSave: (data: Omit<Widget, 'id' | 'status'>) => void, children: React.ReactNode, defaultScope: WidgetScope }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<WidgetScope>(defaultScope);
  const [kpi, setKpi] = useState('');
  const [chartType, setChartType] = useState('');

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
    onSave({ title, scope, kpi, chartType });
    setOpen(false);
  };
  
  useEffect(() => {
    if (open) {
      const initialScope = widget?.scope || defaultScope;
      setTitle(widget?.title || '');
      setScope(initialScope);
      setKpi(widget?.kpi || '');
      setChartType(widget?.chartType || '');
    }
  }, [widget, open, defaultScope]);

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
  records,
  onSave,
  onDelete,
  children
}: {
  records: SalesRecord[];
  onSave: (data: Omit<SalesRecord, 'id' | 'achievementRate'>, id?: string) => void;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>売上実績データ管理</DialogTitle>
          <DialogDescription>月次の売上目標と実績を登録・管理します。ここで登録したデータがグラフに反映されます。</DialogDescription>
        </DialogHeader>
        <SalesRecordTable records={records} onSave={onSave} onDelete={onDelete} />
      </DialogContent>
    </Dialog>
  );
}


function SalesRecordTable({
  records,
  onSave,
  onDelete
}: {
  records: SalesRecord[];
  onSave: (data: Omit<SalesRecord, 'id' | 'achievementRate'>, id?: string) => void;
  onDelete: (id: string) => void;
}) {
    return (
        <Card>
            <CardContent className='pt-6 max-h-[60vh] overflow-y-auto'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>年月</TableHead>
                            <TableHead>売上目標</TableHead>
                            <TableHead>売上実績</TableHead>
                            <TableHead>達成率</TableHead>
                            <TableHead><span className='sr-only'>Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.sort((a, b) => a.id.localeCompare(b.id)).map(record => (
                            <TableRow key={record.id}>
                                <TableCell>{record.year}年{record.month}月</TableCell>
                                <TableCell>{record.salesTarget}百万円</TableCell>
                                <TableCell>{record.salesActual}百万円</TableCell>
                                <TableCell>{record.achievementRate}%</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <SalesRecordDialog record={record} onSave={(data) => onSave(data, record.id)}>
                                                <DropdownMenuItem onSelect={e => e.preventDefault()}>編集</DropdownMenuItem>
                                            </SalesRecordDialog>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">削除</DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => onDelete(record.id)}>削除</AlertDialogAction>
                                                </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
                <SalesRecordDialog onSave={(data) => onSave(data)}>
                    <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>新規実績を登録</Button>
                </SalesRecordDialog>
            </CardFooter>
        </Card>
    )
}

function SalesRecordDialog({ record, onSave, children }: { record?: SalesRecord | null, onSave: (data: Omit<SalesRecord, 'id' | 'achievementRate'>) => void, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [salesTarget, setSalesTarget] = useState(0);
    const [salesActual, setSalesActual] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ year, month, salesTarget, salesActual });
        setOpen(false);
    };

    useEffect(() => {
        if(open) {
            setYear(record?.year || new Date().getFullYear());
            setMonth(record?.month || new Date().getMonth() + 1);
            setSalesTarget(record?.salesTarget || 0);
            setSalesActual(record?.salesActual || 0);
        }
    }, [record, open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{record ? '売上実績を編集' : '新規売上実績を登録'}</DialogTitle>
                    </DialogHeader>
                     <div className="grid gap-4 py-4">
                        <div className='flex gap-2'>
                           <div className="grid gap-2 flex-1">
                             <Label>対象年</Label>
                             <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
                           </div>
                           <div className="grid gap-2 flex-1">
                             <Label>対象月</Label>
                             <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                               <SelectTrigger>
                                 <SelectValue placeholder="月を選択" />
                               </SelectTrigger>
                               <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                  <SelectItem key={m} value={String(m)}>{m}月</SelectItem>
                                ))}
                               </SelectContent>
                             </Select>
                           </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>売上目標 (百万円)</Label>
                            <Input type="number" value={salesTarget} onChange={e => setSalesTarget(Number(e.target.value))} />
                        </div>
                         <div className="grid gap-2">
                            <Label>売上実績 (百万円)</Label>
                            <Input type="number" value={salesActual} onChange={e => setSalesActual(Number(e.target.value))} />
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

function WidgetDisplay({ 
    widget, 
    salesData, 
    onSave, 
    onArchive, 
    scope, 
    onSaveRecord, 
    onDeleteRecord 
}: { 
  widget: Widget | undefined, 
  salesData: SalesRecord[], 
  onSave: (data: Omit<Widget, 'id' | 'status'>, id?: string) => void, 
  onArchive: (id: string) => void, 
  scope: WidgetScope, 
  onSaveRecord: (data: Omit<SalesRecord, 'id' | 'achievementRate'>, id?: string) => void, 
  onDeleteRecord: (id: string) => void,
}) {
  const chartData = useMemo(() =>
    salesData
      .map(d => ({ month: `${d.month}月`, salesActual: d.salesActual, salesTarget: d.salesTarget, achievementRate: d.achievementRate }))
      .sort((a, b) => {
          const monthA = parseInt(a.month.replace('月', ''), 10);
          const monthB = parseInt(b.month.replace('月', ''), 10);
          return monthA - monthB;
      })
    , [salesData]);

  if (!widget) {
    return (
        <Card className="flex flex-col items-center justify-center min-h-[250px] border-dashed">
            <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">この単位のウィジェットはまだ設定されていません。</p>
                <WidgetDialog onSave={(data) => onSave(data)} defaultScope={scope}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        新規ウィジェット追加
                    </Button>
                </WidgetDialog>
            </div>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between pb-2'>
        <CardTitle className="text-base">{widget.title}</CardTitle>
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <WidgetDialog widget={widget} onSave={(data) => onSave(data, widget.id)} defaultScope={scope}>
              <DropdownMenuItem onSelect={e => e.preventDefault()}>
                  <Edit className="mr-2 h-4 w-4"/>ウィジェット設定
              </DropdownMenuItem>
            </WidgetDialog>
             {widget.kpi === 'sales_revenue' && (
                <SalesDataManagementDialog records={salesData} onSave={onSaveRecord} onDelete={onDeleteRecord}>
                    <DropdownMenuItem onSelect={e => e.preventDefault()}>
                        <Database className="mr-2 h-4 w-4"/>データ編集
                    </DropdownMenuItem>
                </SalesDataManagementDialog>
            )}
             <DropdownMenuSeparator />
             <AlertDialog>
              <AlertDialogTrigger asChild>
                 <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">
                  <Archive className="mr-2 h-4 w-4"/>アーカイブ
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ウィジェットをアーカイブしますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    ウィジェット「{widget.title}」をアーカイブ（非表示）します。後から復元できます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onArchive(widget.id)}>アーカイブ</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="h-60 w-full">
         <WidgetPreview 
           widget={widget} 
           chartData={chartData} 
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


function ArchivedWidgetsDialog({ widgets, onRestore, onPermanentDelete, children }: { 
  widgets: Widget[],
  onRestore: (id: string) => void,
  onPermanentDelete: (id: string) => void,
  children: React.ReactNode
}) {
  const archivedWidgets = widgets.filter(w => w.status === 'archived');
  
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>アーカイブ済みウィジェット</DialogTitle>
          <DialogDescription>削除したウィジェットを復元または完全に削除できます。</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {archivedWidgets.length > 0 ? (
             <ScrollArea className="h-72">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>対象単位</TableHead>
                    <TableHead>KPI</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {archivedWidgets.map(widget => (
                    <TableRow key={widget.id}>
                        <TableCell className="font-medium">{widget.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {widget.scope === 'company' ? '会社' : widget.scope === 'team' ? 'チーム' : '個人'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{kpiOptions[widget.scope].find(k => k.value === widget.kpi)?.label}</TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => onRestore(widget.id)}><Undo className="mr-2 h-4 w-4" />復元</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />完全に削除</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>本当に完全に削除しますか？</AlertDialogTitle>
                                <AlertDialogDescription>
                                ウィジェット「{widget.title}」を完全に削除します。この操作は元に戻せません。
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onPermanentDelete(widget.id)}>完全に削除</AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">アーカイブ済みのウィジェットはありません。</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


export default function DashboardSettingsPage() {
    const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
    const [activeTab, setActiveTab] = useState<WidgetScope>('company');
    const [salesRecords, setSalesRecords] = useState<SalesRecord[]>(initialSalesRecords);
    const [isMounted, setIsMounted] = useState(false);
    
    // 現在の年を、利用可能な会計年度の最新のものに設定
    const [currentYear, setCurrentYear] = useState(() => {
        const years = [...new Set(initialSalesRecords.map(d => {
            return d.month >= 8 ? d.year + 1 : d.year;
        }))].sort((a,b) => b-a);
        return years[0] || new Date().getFullYear();
    });

    const availableYears = useMemo(() => {
      const yearSet = new Set<number>();
      salesRecords.forEach(record => {
          const fiscalYear = record.month >= 8 ? record.year + 1 : record.year;
          yearSet.add(fiscalYear);
      });
      return Array.from(yearSet).sort((a,b) => b-a);
    }, [salesRecords]);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    useEffect(() => {
        if(availableYears.length > 0 && !availableYears.includes(currentYear)){
            setCurrentYear(availableYears[0]);
        }
    }, [availableYears, currentYear]);


    const handleYearChange = (direction: 'prev' | 'next') => {
        const currentIndex = availableYears.indexOf(currentYear);
        if (direction === 'prev' && currentIndex < availableYears.length - 1) {
            setCurrentYear(availableYears[currentIndex + 1]);
        }
        if (direction === 'next' && currentIndex > 0) {
            setCurrentYear(availableYears[currentIndex - 1]);
        }
    };
    
    const canGoPrev = availableYears.indexOf(currentYear) < availableYears.length - 1;
    const canGoNext = availableYears.indexOf(currentYear) > 0;

    const handleSaveWidget = (data: Omit<Widget, 'id' | 'status'>, id?: string) => {
        if (id) {
            // Editing existing widget
            setWidgets(widgets.map(w => w.id === id ? { ...w, ...data, id } : w));
        } else {
            // Adding a new widget for the scope
            // Archive any existing active widget for this scope
            const newWidgets = widgets.map(w => 
                w.scope === data.scope && w.status === 'active' ? { ...w, status: 'archived' as const } : w
            );
            setWidgets([...newWidgets, { ...data, id: new Date().toISOString(), status: 'active' }]);
        }
    };

    const handleArchiveWidget = (id: string) => {
        setWidgets(widgets.map(w => w.id === id ? { ...w, status: 'archived' } : w));
    };

    const handleRestoreWidget = (id: string) => {
      const widgetToRestore = widgets.find(w => w.id === id);
      if (!widgetToRestore) return;

      const newWidgets = widgets.map(w => {
        // Archive the currently active widget for the same scope
        if (w.scope === widgetToRestore.scope && w.status === 'active') {
          return { ...w, status: 'archived' as const };
        }
        // Restore the selected widget
        if (w.id === id) {
          return { ...w, status: 'active' as const };
        }
        return w;
      });
      setWidgets(newWidgets);
    }

    const handlePermanentDeleteWidget = (id: string) => {
      setWidgets(widgets.filter(w => w.id !== id));
    }

    const handleSaveRecord = (data: Omit<SalesRecord, 'id' | 'achievementRate'>, id?: string) => {
        const achievementRate = calculateAchievementRate(data.salesActual, data.salesTarget);
        const recordId = id || `${data.year}-${String(data.month).padStart(2, '0')}`;
        const exists = salesRecords.some(r => r.id === recordId);
        
        if (exists) {
            setSalesRecords(salesRecords.map(r => (r.id === recordId ? { ...data, id: recordId, achievementRate } : r)));
        } else {
            setSalesRecords([...salesRecords, { ...data, id: recordId, achievementRate }].sort((a,b) => a.id.localeCompare(b.id)));
        }
    }

    const handleDeleteRecord = (id: string) => {
        setSalesRecords(salesRecords.filter(r => r.id !== id));
    }

    const activeWidgetForTab = useMemo(() => {
        return widgets.find(w => w.scope === activeTab && w.status === 'active');
    }, [widgets, activeTab]);

    const filteredSalesData = useMemo(() => {
        if (!salesRecords || salesRecords.length === 0) {
            return [];
        }

        // 選択された年は会計年度の「締め年」
        const endYear = currentYear;
        const startYear = endYear - 1;

        const fiscalYearData = salesRecords.filter(record => {
            // 前年の8月〜12月のデータを含める
            if (record.year === startYear && record.month >= 8) {
                return true;
            }
            // 締め年の1月〜7月のデータを含める
            if (record.year === endYear && record.month <= 7) {
                return true;
            }
            return false;
        });

        return fiscalYearData;
    }, [salesRecords, currentYear]);


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
              <h1 className="text-lg font-semibold md:text-2xl">ダッシュボード設定</h1>
              <p className="text-sm text-muted-foreground">表示する指標やグラフの種類をカスタマイズします。</p>
            </div>

            <div className='flex items-center gap-4'>
               <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="icon" className='h-7 w-7' onClick={() => handleYearChange('prev')} disabled={!canGoPrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-24 text-center">{currentYear}年度</span>
                   <Button variant="outline" size="icon" className='h-7 w-7' onClick={() => handleYearChange('next')} disabled={!canGoNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className='flex items-center gap-2'>
                  <ArchivedWidgetsDialog widgets={widgets} onRestore={handleRestoreWidget} onPermanentDelete={handlePermanentDeleteWidget}>
                     <Button variant="outline">
                        <Archive className="mr-2 h-4 w-4" />
                        アーカイブ済み
                    </Button>
                  </ArchivedWidgetsDialog>
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
                <WidgetDisplay 
                    widget={activeWidgetForTab} 
                    salesData={filteredSalesData} 
                    onSave={handleSaveWidget} 
                    onArchive={handleArchiveWidget} 
                    scope="company" 
                    onSaveRecord={handleSaveRecord} 
                    onDeleteRecord={handleDeleteRecord} 
                />
            </TabsContent>
            <TabsContent value="team">
                <WidgetDisplay 
                    widget={activeWidgetForTab} 
                    salesData={filteredSalesData} 
                    onSave={handleSaveWidget} 
                    onArchive={handleArchiveWidget} 
                    scope="team" 
                    onSaveRecord={handleSaveRecord} 
                    onDeleteRecord={handleDeleteRecord} 
                />
            </TabsContent>
            <TabsContent value="personal">
                 <WidgetDisplay 
                    widget={activeWidgetForTab} 
                    salesData={filteredSalesData} 
                    onSave={handleSaveWidget} 
                    onArchive={handleArchiveWidget} 
                    scope="personal" 
                    onSaveRecord={handleSaveRecord} 
                    onDeleteRecord={handleDeleteRecord} 
                />
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

    