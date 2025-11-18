
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LineChart, BarChart, PieChart, Donut, PlusCircle, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, CartesianGrid, XAxis } from 'recharts';
import dynamic from 'next/dynamic';

const ComposedChart = dynamic(
  () => import('recharts').then(mod => mod.ComposedChart),
  { ssr: false }
);


const kpiOptions = {
  company: [
    { value: 'sales_revenue', label: '売上高' },
    { value: 'profit_margin', label: '営業利益率' },
    { value: 'new_customers', label: '新規顧客獲得数' },
    { value: 'delivery_compliance', label: 'プロジェクトの納期遵守率' },
  ],
  team: [
    { value: 'task_completion_rate', label: 'タスク完了率' },
    { value: 'project_progress', label: 'プロジェクト進捗率' },
  ],
  personal: [
    { value: 'personal_sales_achievement', label: '個人の売上達成率' },
    { value: 'personal_task_achievement', label: 'タスク達成率' },
    { value: 'self_learning_time', label: '自己学習時間' },
    { value: 'leave_acquisition_rate', label: '休暇取得率' },
  ],
};

const chartOptions = [
  { value: 'line', label: '折れ線グラフ', icon: LineChart },
  { value: 'bar', label: '棒グラフ', icon: BarChart },
  { value: 'stacked_bar', label: '積み上げ棒グラフ', icon: BarChart },
  { value: 'pie', label: '円グラフ', icon: PieChart },
  { value: 'donut', label: 'ドーナツチャート', icon: Donut },
];

const getChartIcon = (chartType: string) => {
  const chart = chartOptions.find(c => c.value === chartType);
  return chart ? <chart.icon className="h-5 w-5 text-muted-foreground" /> : null;
};

type WidgetScope = 'company' | 'team' | 'personal';

type Widget = {
  id: string;
  title: string;
  kpi: string;
  scope: WidgetScope;
  chartType: string;
};

type SalesRecord = {
    id: string;
    year: number;
    month: number;
    salesTarget: number;
    salesActual: number;
    profitRate: number;
}

const initialWidgets: Widget[] = [
    { id: '1', title: '全社売上高の推移', kpi: 'sales_revenue', scope: 'company', chartType: 'bar' },
    { id: '2', title: '営業チームのタスク完了率', kpi: 'task_completion_rate', scope: 'team', chartType: 'donut' },
    { id: '3', title: '個人の学習時間の記録', kpi: 'self_learning_time', scope: 'personal', chartType: 'line' },
];

const initialSalesRecords: SalesRecord[] = [
    { id: '2024-04', year: 2024, month: 4, salesTarget: 80, salesActual: 75, profitRate: 15 },
    { id: '2024-05', year: 2024, month: 5, salesTarget: 85, salesActual: 88, profitRate: 18 },
    { id: '2024-06', year: 2024, month: 6, salesTarget: 90, salesActual: 92, profitRate: 20 },
];

const salesChartConfig = {
  salesActual: { label: "実績", color: "hsl(var(--primary))" },
  salesTarget: { label: "目標", color: "hsl(var(--primary) / 0.3)" },
};


function WidgetDialog({ widget, onSave, children, defaultScope }: { widget?: Widget | null, onSave: (data: Omit<Widget, 'id'>) => void, children: React.ReactNode, defaultScope: WidgetScope }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<WidgetScope>(defaultScope);
  const [kpi, setKpi] = useState('');
  const [chartType, setChartType] = useState('');

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
              <Select value={scope} onValueChange={(v: any) => { setScope(v); setKpi(''); }}>
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
              <Select value={kpi} onValueChange={(v: any) => setKpi(v)} required>
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
              <Select value={chartType} onValueChange={(v: any) => setChartType(v)} required>
                <SelectTrigger><SelectValue placeholder="グラフを選択" /></SelectTrigger>
                <SelectContent>
                  {chartOptions.map(option => (
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

function SalesRecordDialog({ record, onSave, children }: { record?: SalesRecord | null, onSave: (data: Omit<SalesRecord, 'id'>) => void, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [salesTarget, setSalesTarget] = useState(0);
    const [salesActual, setSalesActual] = useState(0);
    const [profitRate, setProfitRate] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ year, month, salesTarget, salesActual, profitRate });
        setOpen(false);
    };

    useEffect(() => {
        if(open) {
            setYear(record?.year || new Date().getFullYear());
            setMonth(record?.month || new Date().getMonth() + 1);
            setSalesTarget(record?.salesTarget || 0);
            setSalesActual(record?.salesActual || 0);
            setProfitRate(record?.profitRate || 0);
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
                             <Input type="number" value={month} onChange={e => setMonth(Number(e.target.value))} />
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
                         <div className="grid gap-2">
                            <Label>利益率 (%)</Label>
                            <Input type="number" value={profitRate} onChange={e => setProfitRate(Number(e.target.value))} />
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


function WidgetList({ widgets, salesData, onSave, onDelete, scope }: { widgets: Widget[], salesData: SalesRecord[], onSave: (data: Omit<Widget, 'id'>, id?: string) => void, onDelete: (id: string) => void, scope: WidgetScope }) {
  const chartData = useMemo(() => 
    salesData.map(d => ({ month: `${d.month}月`, salesActual: d.salesActual, salesTarget: d.salesTarget }))
    , [salesData]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {widgets.map(widget => (
          <Card key={widget.id}>
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
                        <Edit className="mr-2 h-4 w-4"/>編集
                    </DropdownMenuItem>
                  </WidgetDialog>
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4"/>削除
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
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
            <CardContent>
                {widget.kpi === 'sales_revenue' ? (
                     <ChartContainer config={salesChartConfig} className="h-40 w-full">
                        <ComposedChart accessibilityLayer data={chartData}>
                           <CartesianGrid vertical={false} />
                           <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{fontSize: 12}} />
                           <ChartTooltip content={<ChartTooltipContent />} />
                           <Bar dataKey="salesTarget" fill="var(--color-salesTarget)" radius={4} />
                           <Bar dataKey="salesActual" fill="var(--color-salesActual)" radius={4} />
                        </ComposedChart>
                    </ChartContainer>
                ) : (
                  <div className='flex items-center justify-center bg-muted/50 rounded-md h-40'>
                      {getChartIcon(widget.chartType)}
                  </div>
                )}
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

    const handleSaveWidget = (data: Omit<Widget, 'id'>, id?: string) => {
        if (id) {
            setWidgets(widgets.map(w => w.id === id ? { ...w, ...data, id } : w));
        } else {
            setWidgets([...widgets, { ...data, id: new Date().toISOString() }]);
        }
    };

    const handleDeleteWidget = (id: string) => {
        setWidgets(widgets.filter(w => w.id !== id));
    };

    const handleSaveRecord = (data: Omit<SalesRecord, 'id'>, id?: string) => {
        const recordId = id || `${data.year}-${String(data.month).padStart(2, '0')}`;
        const exists = salesRecords.some(r => r.id === recordId);
        if(exists) {
            setSalesRecords(salesRecords.map(r => r.id === recordId ? { ...data, id: recordId } : r));
        } else {
            setSalesRecords([...salesRecords, { ...data, id: recordId }].sort((a,b) => a.id.localeCompare(b.id)));
        }
    }

    const handleDeleteRecord = (id: string) => {
        setSalesRecords(salesRecords.filter(r => r.id !== id));
    }

    const filteredWidgets = useMemo(() => {
        return widgets.filter(w => w.scope === activeTab);
    }, [widgets, activeTab]);

  return (
    <div className="w-full space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>売上実績データ</CardTitle>
          <CardDescription>月次の売上目標と実績を登録・管理します。ここで登録したデータがグラフに反映されます。</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>年月</TableHead>
                        <TableHead>売上目標</TableHead>
                        <TableHead>売上実績</TableHead>
                        <TableHead>利益率</TableHead>
                        <TableHead><span className='sr-only'>Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {salesRecords.map(record => (
                        <TableRow key={record.id}>
                            <TableCell>{record.year}年{record.month}月</TableCell>
                            <TableCell>{record.salesTarget}百万円</TableCell>
                            <TableCell>{record.salesActual}百万円</TableCell>
                            <TableCell>{record.profitRate}%</TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <SalesRecordDialog record={record} onSave={(data) => handleSaveRecord(data, record.id)}>
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
                                                <AlertDialogAction onClick={() => handleDeleteRecord(record.id)}>削除</AlertDialogAction>
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
            <SalesRecordDialog onSave={(data) => handleSaveRecord(data)}>
                <Button variant="outline"><PlusCircle className="mr-2"/>新規実績を登録</Button>
            </SalesRecordDialog>
        </CardFooter>
      </Card>


      <div>
         <div className="flex items-center justify-between mb-6">
            <div className='flex flex-col'>
            <h1 className="text-lg font-semibold md:text-2xl">ダッシュボード設定</h1>
            <p className="text-sm text-muted-foreground">表示する指標やグラフの種類をカスタマイズします。</p>
            </div>
            <WidgetDialog onSave={(data) => handleSaveWidget(data)} defaultScope={activeTab}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                新規ウィジェット追加
            </Button>
            </WidgetDialog>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WidgetScope)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="company">会社単位</TabsTrigger>
            <TabsTrigger value="team">チーム単位</TabsTrigger>
            <TabsTrigger value="personal">個人単位</TabsTrigger>
            </TabsList>
            <TabsContent value="company">
            <WidgetList widgets={filteredWidgets} salesData={salesRecords} onSave={handleSaveWidget} onDelete={handleDeleteWidget} scope="company" />
            </TabsContent>
            <TabsContent value="team">
            <WidgetList widgets={filteredWidgets} salesData={salesRecords} onSave={handleSaveWidget} onDelete={handleDeleteWidget} scope="team" />
            </TabsContent>
            <TabsContent value="personal">
                <WidgetList widgets={filteredWidgets} salesData={salesRecords} onSave={handleSaveWidget} onDelete={handleDeleteWidget} scope="personal" />
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
