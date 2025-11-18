
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LineChart, BarChart, PieChart, Donut, PlusCircle, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  return chart ? <chart.icon className="h-5 w-5" /> : null;
};

type Widget = {
  id: string;
  title: string;
  kpi: string;
  scope: 'company' | 'team' | 'personal';
  chartType: string;
};

const initialWidgets: Widget[] = [
    { id: '1', title: '全社売上高の推移', kpi: 'sales_revenue', scope: 'company', chartType: 'line' },
    { id: '2', title: '営業チームのタスク完了率', kpi: 'task_completion_rate', scope: 'team', chartType: 'donut' },
    { id: '3', title: '個人の学習時間の記録', kpi: 'self_learning_time', scope: 'personal', chartType: 'bar' },
];

function WidgetDialog({ widget, onSave, children }: { widget?: Widget | null, onSave: (data: Omit<Widget, 'id'>) => void, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(widget?.title || '');
  const [scope, setScope] = useState<'company' | 'team' | 'personal'>(widget?.scope || 'company');
  const [kpi, setKpi] = useState(widget?.kpi || '');
  const [chartType, setChartType] = useState(widget?.chartType || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, scope, kpi, chartType });
    setOpen(false);
  };
  
  useEffect(() => {
    if (open) {
      setTitle(widget?.title || '');
      setScope(widget?.scope || 'company');
      setKpi(widget?.kpi || '');
      setChartType(widget?.chartType || '');
    }
  }, [widget, open]);

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

export default function DashboardSettingsPage() {
    const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);

    const handleSaveWidget = (data: Omit<Widget, 'id'>, id?: string) => {
        if (id) {
            setWidgets(widgets.map(w => w.id === id ? { ...w, ...data } : w));
        } else {
            setWidgets([...widgets, { ...data, id: new Date().toISOString() }]);
        }
    };

    const handleDeleteWidget = (id: string) => {
        setWidgets(widgets.filter(w => w.id !== id));
    };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className='flex flex-col'>
          <h1 className="text-lg font-semibold md:text-2xl">ダッシュボード設定</h1>
          <p className="text-sm text-muted-foreground">表示する指標やグラフの種類をカスタマイズします。</p>
        </div>
        <WidgetDialog onSave={(data) => handleSaveWidget(data)}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            新規ウィジェット追加
          </Button>
        </WidgetDialog>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {widgets.map(widget => (
          <Card key={widget.id}>
            <CardHeader className='flex-row items-center justify-between'>
              <CardTitle className="text-base">{widget.title}</CardTitle>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <WidgetDialog widget={widget} onSave={(data) => handleSaveWidget(data, widget.id)}>
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
                        <AlertDialogAction onClick={() => handleDeleteWidget(widget.id)}>削除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
                <div className='flex items-center justify-center bg-muted/50 rounded-md h-40'>
                    {getChartIcon(widget.chartType)}
                </div>
            </CardContent>
            <CardFooter className='flex justify-between text-xs text-muted-foreground'>
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
    </div>
  );
}
