'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlusCircle, MoreHorizontal, MoreVertical, Trash2, Edit, Database, Star, Loader2, Info, Share2, CheckCircle2, XCircle, CalendarClock, Check, Search, X, Rows3, Columns2, LayoutGrid, Flag, Repeat } from 'lucide-react';
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
import { format, startOfDay, getWeek, getMonth, getYear, startOfWeek, endOfWeek, eachDayOfInterval, addDays, differenceInDays, differenceInWeeks, differenceInMonths, formatDistanceToNow } from 'date-fns';
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
import { Separator } from '@/components/ui/separator';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Badge } from '@/components/ui/badge';


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
    // This is now dynamic based on title, so this list might be deprecated
  ],
  personal: [
    { value: 'personal_sales_achievement', label: '個人の売上達成率' },
    { value: 'task_achievement_rate', label: 'タスク達成率' },
    { value: 'self_learning_time', label: '自己学習時間' },
    { value: 'vacation_acquisition_rate', label: '健康管理指標（休暇取得率）' },
  ],
};

const chartOptions = [
    { value: 'donut', label: 'ドーナツチャート' },
    { value: 'bar', label: '棒グラフ' },
    { value: 'line', label: '折れ線グラフ' },
    { value: 'composed', label: '複合グラフ' }
];

export const kpiToChartMapping: Record<string, string[]> = {
  // Company
  sales_revenue: ['composed', 'bar', 'line'],
  profit_margin: ['line'],
  new_customers: ['bar'],
  project_delivery_compliance: ['pie', 'bar'],
  // Team & Personal (These might be deprecated as team goals are now dynamic)
  task_completion_rate: ['donut', 'pie', 'bar'],
  project_progress: ['donut'],
  personal_sales_achievement: ['donut', 'bar'],
  task_achievement_rate: ['donut'],
  self_learning_time: ['line', 'bar'],
  vacation_acquisition_rate: ['donut', 'bar'],
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
    
    let scopeId = '';
    if (scope === 'company') scopeId = currentUser.company || '';
    if (scope === 'team') scopeId = teamScopeId;

    if (!scopeId && scope !== 'personal') {
        alert("ユーザー情報から対象を特定できませんでした。");
        return;
    }

    const baseData: Partial<Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>> = {
      title,
      scope,
      scopeId,
      chartType,
      defaultGranularity,
      defaultIsCumulative,
    };
    
    if (scope === 'company') {
      baseData.kpi = kpi;
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
        baseData.unit = unit;
        baseData.targetValue = targetValue;
        
        // When creating a new goal, currentValue is 0.
        if (!widget) {
          baseData.currentValue = 0;
        }
    }

    onSave(baseData);
    setOpen(false);
  };
  
  useEffect(() => {
    if (open) {
      const initialScope = widget?.scope || defaultScope;
      setTitle(widget?.title || '');
      setScope(initialScope);
      setChartType(widget?.chartType || '');
      setDefaultGranularity(widget?.defaultGranularity || 'monthly');
      setDefaultIsCumulative(widget?.defaultIsCumulative ?? true);

      if (initialScope === 'company') {
        setKpi(widget?.kpi || '');
        const startMonth = widget?.fiscalYearStartMonth || 8;
        setFiscalYear(widget?.fiscalYear || getCurrentFiscalYear(startMonth));
        setFiscalYearStartMonth(startMonth);
      } else if (initialScope === 'team') {
        setDateRange({ from: widget?.startDate?.toDate(), to: widget?.endDate?.toDate() });
        setTargetValue(widget?.targetValue || 100);
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
      setUnit('%');
      setTeamScopeId('');
      setDefaultGranularity('monthly');
      setDefaultIsCumulative(true);
    }
  }, [widget, open, defaultScope]);

  const needsFiscalYear = scope === 'company' && (kpi === 'sales_revenue' || kpi === 'profit_margin' || kpi === 'new_customers' || kpi === 'project_delivery_compliance');
  const isCompanyScopeOnly = scope === 'company' && (currentUser?.role !== 'admin' && currentUser?.role !== 'executive');
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{widget ? 'ウィジェットを編集' : '新規ウィジェットを追加'}</DialogTitle>
            <DialogDescription>表示したい目標とグラフの種類を選択してください。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <div className="grid gap-2">
              <Label htmlFor="widget-title">ウィジェットタイトル</Label>
              <Input id="widget-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="例: 四半期新規契約数" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="widget-scope">対象単位</Label>
              <Select value={scope} onValueChange={(v: any) => { setScope(v); setKpi(''); setChartType(''); }} disabled={isCompanyScopeOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">会社単位</SelectItem>
                  <SelectItem value="team">組織単位</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {scope === 'company' ? (
                <>
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
                <Label htmlFor="widget-kpi">KPI項目</Label>
                <Select value={kpi} onValueChange={handleKpiChange} required>
                    <SelectTrigger><SelectValue placeholder="KPIを選択" /></SelectTrigger>
                    <SelectContent>
                    {kpiOptions.company.map(option => (
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
                    {(kpiToChartMapping[kpi] || []).map(chartVal => {
                        const option = chartOptions.find(o => o.value === chartVal);
                        return option ? <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem> : null;
                    })}
                    </SelectContent>
                </Select>
                </div>
                </>
            ) : ( // Team Scope
                <>
                <div className="grid gap-2">
                    <Label htmlFor="team-org-picker">対象組織</Label>
                    <OrganizationPicker
                      organizations={organizations}
                      value={teamScopeId}
                      onChange={setTeamScopeId}
                      disabled={(org) => org.type === 'holding' || org.type === 'company'}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>グラフの種類</Label>
                    <Select value={chartType} onValueChange={(v) => setChartType(v)} required>
                        <SelectTrigger><SelectValue placeholder="グラフを選択" /></SelectTrigger>
                        <SelectContent>
                        {chartOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
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
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            locale={ja}
                        />
                    </PopoverContent>
                    </Popover>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>期間全体の目標値</Label>
                        <Input type="number" value={targetValue} onChange={e => setTargetValue(Number(e.target.value))} />
                    </div>
                    <div className="grid gap-2">
                        <Label>単位</Label>
                        <Select value={unit} onValueChange={setUnit}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="%">%</SelectItem>
                                <SelectItem value="件">件</SelectItem>
                                <SelectItem value="円">円</SelectItem>
                                <SelectItem value="百万円">百万円</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {chartType !== 'donut' && (
                  <div className="border-t pt-4 mt-2">
                      <h4 className="text-sm font-medium mb-2">デフォルト表示設定</h4>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                              <Label>時間軸</Label>
                              <Select value={defaultGranularity} onValueChange={(v) => setDefaultGranularity(v as ChartGranularity)}>
                                  <SelectTrigger><SelectValue/></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="monthly">月ごと</SelectItem>
                                      <SelectItem value="weekly">週ごと</SelectItem>
                                      <SelectItem value="daily">日ごと</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="flex flex-col gap-2 pt-2">
                              <Label>実績の積み上げ</Label>
                              <div className="flex items-center space-x-2 mt-2">
                                  <Switch id="is-cumulative-switch" checked={defaultIsCumulative} onCheckedChange={setDefaultIsCumulative} />
                                  <Label htmlFor="is-cumulative-switch">{defaultIsCumulative ? 'ON' : 'OFF'}</Label>
                              </div>
                          </div>
                      </div>
                  </div>
                )}
                </>
            )}
          </div>
          <DialogFooter>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamGoalDataDialog({
  widget,
  onSave,
  children,
}: {
  widget: Goal;
  onSave: (data: { currentValue: number }) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState(widget.currentValue || 0);

  useEffect(() => {
    if (open) {
      setCurrentValue(widget.currentValue || 0);
    }
  }, [open, widget.currentValue]);

  const handleSave = () => {
    onSave({ currentValue });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>進捗データ入力</DialogTitle>
          <DialogDescription>
            「{widget.title}」の現在の進捗値を更新します。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>目標値</Label>
            <Input value={`${widget.targetValue || 0} ${widget.unit || ''}`} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="current-value">現在の進捗</Label>
            <Input
              id="current-value"
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamGoalTimeSeriesDataDialog({
  widget,
  onSave,
  children,
}: {
  widget: Goal;
  onSave: (records: Omit<GoalRecord, 'id' | 'authorId' | 'updatedAt'>[]) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: existingRecords, isLoading: isLoadingRecords } = useSubCollection<GoalRecord>('goals', widget.id, 'goalRecords');
  const [records, setRecords] = useState<Map<string, { id?: string; date: Timestamp; actualValue: number }>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentActual, setCurrentActual] = useState('');
  const [selectedRecordKeys, setSelectedRecordKeys] = useState<string[]>([]);


  useEffect(() => {
    if (open && existingRecords) {
      const initialRecords = new Map();
      existingRecords.forEach((rec) => {
        initialRecords.set(format(rec.date.toDate(), 'yyyy-MM-dd'), {
          id: rec.id,
          date: rec.date,
          actualValue: rec.actualValue,
        });
      });
      setRecords(initialRecords);
      setSelectedRecordKeys([]);
    }
  }, [open, existingRecords]);

  const selectedDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const recordForSelectedDate = records.get(selectedDateString);

  useEffect(() => {
    if (selectedDate && records.has(selectedDateString)) {
      setCurrentActual(recordForSelectedDate?.actualValue.toString() || '');
    } else {
      setCurrentActual('');
    }
  }, [selectedDate, records, selectedDateString, recordForSelectedDate]);

  const handleAddOrUpdateRecord = () => {
    if (!selectedDate) return;
    const actual = parseFloat(currentActual);
    if(isNaN(actual)) {
       toast({ title: '入力エラー', description: '実績には数値を入力してください。', variant: 'destructive'});
       return;
    }

    const newRecords = new Map(records);
    const existingRecord = newRecords.get(selectedDateString);

    newRecords.set(selectedDateString, {
      id: existingRecord?.id,
      date: Timestamp.fromDate(selectedDate),
      actualValue: actual,
    });
    setRecords(newRecords);
    toast({
      title: '一時保存',
      description: `${selectedDateString}のデータを更新しました。最後に「全ての変更を保存」ボタンを押してください。`,
    });
  };

  const handleDeleteSelected = () => {
    if (selectedRecordKeys.length === 0) return;
    const newRecords = new Map(records);
    selectedRecordKeys.forEach(key => newRecords.delete(key));
    setRecords(newRecords);
    setSelectedRecordKeys([]);
    toast({ title: '一時削除', description: `${selectedRecordKeys.length}件のデータを削除しました。最後に「全ての変更を保存」ボタンを押してください。`});
  };

  const handleSaveAll = () => {
    const recordsToSave = Array.from(records.values()).map(({id, ...rest}) => rest); // remove id property
    onSave(recordsToSave);
    setOpen(false);
  };
  
  const sortedRecords = useMemo(
    () =>
      Array.from(records.entries()).map(([key, value]) => ({ key, ...value })).sort(
        (a, b) => b.date.toMillis() - a.date.toMillis()
      ),
    [records]
  );
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecordKeys(sortedRecords.map(r => r.key));
    } else {
      setSelectedRecordKeys([]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>実績データ編集: {widget.title}</DialogTitle>
          <DialogDescription>
            カレンダーから日付を選択し、その日の実績値を入力してください。
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 py-4">
          <div className="flex flex-col gap-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border mx-auto"
              disabled={(date) =>
                (widget.startDate && date < startOfDay(widget.startDate.toDate())) ||
                (widget.endDate && date > startOfDay(widget.endDate.toDate())) ||
                false
              }
              initialFocus
            />
            <div className="space-y-4 p-4 border rounded-md">
              <h3 className="font-semibold text-sm">
                {selectedDate
                  ? format(selectedDate, 'yyyy年M月d日')
                  : '日付を選択してください'}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="actual-value">実績値 ({widget.unit})</Label>
                  <Input
                    id="actual-value"
                    type="number"
                    value={currentActual}
                    onChange={(e) => setCurrentActual(e.target.value)}
                    disabled={!selectedDate}
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={(e) => { e.preventDefault(); handleAddOrUpdateRecord(); }}
                disabled={!selectedDate}
                className="w-full"
              >
                この日付のデータを追加/更新
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">記録済みデータ</h3>
              {selectedRecordKeys.length > 0 && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="h-8">
                          <Trash2 className="mr-2 h-4 w-4" />
                          選択した{selectedRecordKeys.length}件を削除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>選択項目を削除しますか？</AlertDialogTitle><AlertDialogDescription>この操作は、下の「全ての変更を保存」ボタンを押すまで確定されません。</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected}>削除</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              )}
            </div>
            <ScrollArea className="h-[450px] border rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="w-12 px-3 py-2 text-left">
                        <Checkbox checked={selectedRecordKeys.length > 0 && selectedRecordKeys.length === sortedRecords.length} onCheckedChange={handleSelectAll} />
                      </th>
                      <th className="py-2 text-left font-medium">日付</th>
                      <th className="py-2 text-left font-medium">実績</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingRecords ? (
                      <tr><td colSpan={3} className="text-center p-10"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></td></tr>
                    ) : sortedRecords.length > 0 ? (
                      sortedRecords.map((rec) => (
                        <tr
                          key={rec.key}
                          onClick={() => setSelectedDate(rec.date.toDate())}
                          className="cursor-pointer border-t"
                          data-state={selectedRecordKeys.includes(rec.key) ? 'selected' : ''}
                        >
                           <td className="px-3">
                             <Checkbox 
                               checked={selectedRecordKeys.includes(rec.key)}
                               onCheckedChange={(checked) => {
                                 setSelectedRecordKeys(prev => 
                                   checked ? [...prev, rec.key] : prev.filter(k => k !== rec.key)
                                 );
                               }}
                               onClick={(e) => e.stopPropagation()}
                              />
                           </td>
                          <td className="py-2">
                            {format(rec.date.toDate(), 'yy/MM/dd')}
                          </td>
                          <td className="py-2">
                            {rec.actualValue} {widget.unit}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center text-muted-foreground h-24"
                        >
                          データがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSaveAll}>全ての変更を保存</Button>
        </DialogFooter>
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
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                    <tr>
                    <th className="py-2 px-4 text-left font-medium w-[120px]">年月</th>
                    <th className="py-2 px-4 text-left font-medium">売上目標 (百万円)</th>
                    <th className="py-2 px-4 text-left font-medium">売上実績 (百万円)</th>
                    </tr>
                </thead>
                <tbody>
                {fiscalYearMonths.map(({ year, month }) => {
                    const id = `${year}-${String(month).padStart(2, '0')}`;
                    const values = monthlyData.get(id) || { target: '0', actual: '0' };
                    return (
                    <tr key={id} className="border-t">
                        <td className="px-4 py-2 font-medium">{year}年 {month}月</td>
                        <td className="px-4 py-2">
                        <Input
                            type="number"
                            value={values.target}
                            onChange={(e) => handleInputChange(id, 'target', e.target.value)}
                            placeholder="0"
                        />
                        </td>
                        <td className="px-4 py-2">
                        <Input
                            type="number"
                            value={values.actual}
                            onChange={(e) => handleInputChange(id, 'actual', e.target.value)}
                            placeholder="0"
                        />
                        </td>
                    </tr>
                    )
                })}
                </tbody>
            </table>
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
            <table className="w-full text-sm">
                 <thead className="sticky top-0 bg-muted">
                    <tr>
                    <th className="py-2 px-4 text-left font-medium w-[120px]">年月</th>
                    <th className="py-2 px-4 text-left font-medium">営業利益 (百万円)</th>
                    <th className="py-2 px-4 text-left font-medium">売上高 (百万円)</th>
                    </tr>
                </thead>
                <tbody>
                {fiscalYearMonths.map(({ year, month }) => {
                    const id = `${year}-${String(month).padStart(2, '0')}`;
                    const values = monthlyData.get(id) || { operatingProfit: '0', salesRevenue: '0' };
                    return (
                    <tr key={id} className="border-t">
                        <td className="px-4 py-2 font-medium">{year}年 {month}月</td>
                        <td className="px-4 py-2">
                        <Input
                            type="number"
                            value={values.operatingProfit}
                            onChange={(e) => handleInputChange(id, 'operatingProfit', e.target.value)}
                            placeholder="0"
                        />
                        </td>
                        <td className="px-4 py-2">
                        <Input
                            type="number"
                            value={values.salesRevenue}
                            onChange={(e) => handleInputChange(id, 'salesRevenue', e.target.value)}
                            placeholder="0"
                        />
                        </td>
                    </tr>
                    )
                })}
                </tbody>
            </table>
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
           <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                    <tr>
                    <th className="py-2 px-4 text-left font-medium w-[120px]">年月</th>
                    <th className="py-2 px-4 text-left font-medium">総顧客数</th>
                    </tr>
                </thead>
                <tbody>
                {fiscalYearMonths.map(({ year, month }) => {
                    const id = `${year}-${String(month).padStart(2, '0')}`;
                    const value = monthlyData.get(id) || '0';
                    return (
                    <tr key={id} className="border-t">
                        <td className="px-4 py-2 font-medium">{year}年 {month}月</td>
                        <td className="px-4 py-2">
                        <Input
                            type="number"
                            value={value}
                            onChange={(e) => handleInputChange(id, e.target.value)}
                            placeholder="0"
                        />
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
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
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                    <tr>
                    <th className="py-2 px-4 text-left font-medium w-[120px]">年月</th>
                    <th className="py-2 px-4 text-left font-medium">遵守</th>
                    <th className="py-2 px-4 text-left font-medium">軽微な遅延</th>
                    <th className="py-2 px-4 text-left font-medium">遅延</th>
                    </tr>
                </thead>
                <tbody>
                {fiscalYearMonths.map(({ year, month }) => {
                    const id = `${year}-${String(month).padStart(2, '0')}`;
                    const values = monthlyData.get(id) || { compliant: '0', minor_delay: '0', delayed: '0' };
                    return (
                    <tr key={id} className="border-t">
                        <td className="px-4 py-2 font-medium">{year}年 {month}月</td>
                        <td className="px-4 py-2">
                            <Input type="number" value={values.compliant} onChange={(e) => handleInputChange(id, 'compliant', e.target.value)} placeholder="0" />
                        </td>
                        <td className="px-4 py-2">
                            <Input type="number" value={values.minor_delay} onChange={(e) => handleInputChange(id, 'minor_delay', e.target.value)} placeholder="0" />
                        </td>
                        <td className="px-4 py-2">
                            <Input type="number" value={values.delayed} onChange={(e) => handleInputChange(id, 'delayed', e.target.value)} placeholder="0" />
                        </td>
                    </tr>
                    )
                })}
                </tbody>
            </table>
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
  onSaveDisplaySettings,
  onSaveSalesRecords,
  onSaveProfitRecords,
  onSaveCustomerRecords,
  onSaveProjectComplianceRecords,
  onSaveTeamGoalData,
  onSaveTeamGoalTimeSeriesData,
  currentUser,
  canEdit,
  organizations,
}: {
  widget: Goal;
  onSave: (data: Partial<Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>>, id?: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onSaveDisplaySettings: (id: string, settings: { defaultGranularity: ChartGranularity, defaultIsCumulative: boolean }) => void;
  onSaveSalesRecords: (goalId: string, records: Omit<SalesRecord, 'id'>[]) => void;
  onSaveProfitRecords: (goalId: string, records: Omit<ProfitRecord, 'id'>[]) => void;
  onSaveCustomerRecords: (goalId: string, records: Omit<CustomerRecord, 'id'>[]) => void;
  onSaveProjectComplianceRecords: (goalId: string, records: Omit<ProjectComplianceRecord, 'id'>[]) => void;
  onSaveTeamGoalData: (goalId: string, data: { currentValue: number }) => void;
  onSaveTeamGoalTimeSeriesData: (
    goalId: string,
    records: Omit<GoalRecord, 'id' | 'authorId' | 'updatedAt'>[]
  ) => void;
  currentUser: Member | null;
  canEdit: boolean;
  organizations: Organization[];
}) {
  const [granularity, setGranularity] = useState<ChartGranularity>(widget.defaultGranularity || 'monthly');
  const [isCumulative, setIsCumulative] = useState(widget.defaultIsCumulative ?? true);
  const { data: salesData } = useSubCollection<SalesRecord>('goals', widget.id, 'salesRecords');
  const { data: profitData } = useSubCollection<ProfitRecord>('goals', widget.id, 'profitRecords');
  const { data: customerData } = useSubCollection<CustomerRecord>('goals', widget.id, 'customerRecords');
  const { data: projectComplianceData } = useSubCollection<ProjectComplianceRecord>(
    'goals',
    widget.id,
    'projectComplianceRecords'
  );
  const { data: teamGoalRecords } = useSubCollection<GoalRecord>('goals', widget.id, 'goalRecords');

  const handleGranularityChange = (value: ChartGranularity) => {
    setGranularity(value);
    onSaveDisplaySettings(widget.id, { defaultGranularity: value, defaultIsCumulative: isCumulative });
  }

  const handleCumulativeChange = (checked: boolean) => {
    setIsCumulative(checked);
    onSaveDisplaySettings(widget.id, { defaultGranularity: granularity, defaultIsCumulative: checked });
  }

  const chartData = useMemo(() => {
    if (widget.scope === 'company') {
        if (!widget.fiscalYear) return [];
        const startMonth = widget.fiscalYearStartMonth || 8;
        const fiscalYearMonths = getMonthsForFiscalYear(widget.fiscalYear, startMonth);

        return fiscalYearMonths.map(({ year, month }) => {
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const entry: ChartData = { month: monthStr, salesActual: 0, salesTarget: 0, achievementRate: 0, profitMargin: 0, totalCustomers: 0, projectCompliant: 0, projectMinorDelay: 0, projectDelayed: 0, periodActual: 0, periodTarget: 0, cumulativeActual: 0, cumulativeAchievementRate: 0 };
            
            if (widget.kpi === 'sales_revenue' && salesData) { const r = salesData.find(d => d.year === year && d.month === month); if (r) Object.assign(entry, { salesActual: r.salesActual, salesTarget: r.salesTarget, achievementRate: r.achievementRate }); }
            if (widget.kpi === 'profit_margin' && profitData) { const r = profitData.find(d => d.year === year && d.month === month); if (r) entry.profitMargin = r.profitMargin; }
            if (widget.kpi === 'new_customers' && customerData) { const r = customerData.find(d => d.year === year && d.month === month); if (r) entry.totalCustomers = r.totalCustomers; }
            if (widget.kpi === 'project_delivery_compliance' && projectComplianceData) { const r = projectComplianceData.find(d => d.year === year && d.month === month); if (r) { entry.projectCompliant = r.counts.compliant; entry.projectMinorDelay = r.counts.minor_delay; entry.projectDelayed = r.counts.delayed; } }

            return entry;
        });
    }

    if (widget.scope === 'team' && teamGoalRecords && widget.startDate && widget.endDate) {
        if (widget.chartType === 'donut') return [];
        
        const recordsByDate = new Map<string, GoalRecord>();
        teamGoalRecords.forEach(r => recordsByDate.set(format(r.date.toDate(), 'yyyy-MM-dd'), r));
        
        const interval = { start: widget.startDate.toDate(), end: widget.endDate.toDate() };
        
        let groupedData: { [key: string]: { actuals: number[] } } = {};
  
        eachDayOfInterval(interval).forEach(day => {
          const dayString = format(day, 'yyyy-MM-dd');
          const record = recordsByDate.get(dayString);
          let key: string;
  
          if (granularity === 'monthly') {
            key = format(startOfMonth(day), 'yyyy-MM-dd');
          } else if (granularity === 'weekly') {
            key = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Monday
          } else { // daily
            key = dayString;
          }
  
          if (!groupedData[key]) {
            groupedData[key] = { actuals: [] };
          }
          groupedData[key].actuals.push(record?.actualValue || 0);
        });
        
        const sortedKeys = Object.keys(groupedData).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
        
        let cumulativeActual = 0;
        return sortedKeys.map(key => {
            const { actuals } = groupedData[key];
            const periodActual = actuals.reduce((sum, val) => sum + val, 0);
            cumulativeActual += periodActual;
            const cumulativeAchievementRate = widget.targetValue ? Math.round((cumulativeActual / widget.targetValue) * 100) : 0;
            return {
                month: key,
                periodActual,
                cumulativeActual,
                periodTarget: 0, // This will be calculated in the preview component
                cumulativeAchievementRate,
                // Compatibility fields
                salesActual: 0, salesTarget: 0, achievementRate: 0, profitMargin: 0, totalCustomers: 0, projectCompliant: 0, projectMinorDelay: 0, projectDelayed: 0,
            };
        });
    }
    
    return [];
  }, [widget, salesData, profitData, customerData, projectComplianceData, teamGoalRecords, granularity]);


  return (
    <Card className={cn('flex flex-col', widget.status === 'active' && 'ring-2 ring-primary')}>
      <CardHeader className="flex-row items-start justify-between pb-2">
         <div className="flex items-center gap-2">
            {widget.status === 'active' && <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />}
            <CardTitle className="text-base">
            {widget.title}
            </CardTitle>
         </div>

        <div className="flex items-center gap-1">
           {widget.scope === 'team' && widget.chartType !== 'donut' && (
             <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <Switch id={`cumulative-switch-${widget.id}`} checked={isCumulative} onCheckedChange={handleCumulativeChange} />
                  <Label htmlFor={`cumulative-switch-${widget.id}`} className="text-xs font-normal">
                    実績を積上
                  </Label>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <CalendarClock className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => handleGranularityChange('monthly')}>
                      <Check className={cn('mr-2 h-4 w-4', granularity === 'monthly' ? 'opacity-100' : 'opacity-0')} />
                      月ごと
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleGranularityChange('weekly')}>
                      <Check className={cn('mr-2 h-4 w-4', granularity === 'weekly' ? 'opacity-100' : 'opacity-0')} />
                      週ごと
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleGranularityChange('daily')}>
                      <Check className={cn('mr-2 h-4 w-4', granularity === 'daily' ? 'opacity-100' : 'opacity-0')} />
                      日ごと
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          )}

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" forceMount>
                {/* 表示設定 */}
                {widget.status !== 'active' && (
                  <DropdownMenuItem onClick={() => onSetActive(widget.id)}>
                    <Star className="mr-2 h-4 w-4" />
                    アプリで表示
                  </DropdownMenuItem>
                )}

                {/* 編集 */}
                <WidgetDialog
                  widget={widget}
                  onSave={(data) => onSave(data, widget.id)}
                  defaultScope={widget.scope as WidgetScope}
                  currentUser={currentUser}
                  organizations={organizations}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Edit className="mr-2 h-4 w-4" />
                    編集
                  </DropdownMenuItem>
                </WidgetDialog>
                
                {/* --- データ入力メニュー --- */}
                {widget.scope === 'team' && widget.chartType === 'donut' && (
                  <TeamGoalDataDialog
                    widget={widget}
                    onSave={(data) => onSaveTeamGoalData(widget.id, data)}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Database className="mr-2 h-4 w-4" />
                      進捗入力
                    </DropdownMenuItem>
                  </TeamGoalDataDialog>
                )}
                {widget.scope === 'team' && widget.chartType !== 'donut' && (
                  <TeamGoalTimeSeriesDataDialog
                    widget={widget}
                    onSave={(records) => onSaveTeamGoalTimeSeriesData(widget.id, records)}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Database className="mr-2 h-4 w-4" />
                      データ入力
                    </DropdownMenuItem>
                  </TeamGoalTimeSeriesDataDialog>
                )}
                {widget.scope === 'company' && widget.kpi === 'sales_revenue' && (
                  <SalesDataManagementDialog widget={widget} onSave={(records) => onSaveSalesRecords(widget.id, records)}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Database className="mr-2 h-4 w-4" />データ編集
                    </DropdownMenuItem>
                  </SalesDataManagementDialog>
                )}
                {widget.scope === 'company' && widget.kpi === 'profit_margin' && (
                  <ProfitDataManagementDialog widget={widget} onSave={(records) => onSaveProfitRecords(widget.id, records)}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Database className="mr-2 h-4 w-4" />データ編集
                    </DropdownMenuItem>
                  </ProfitDataManagementDialog>
                )}
                {widget.scope === 'company' && widget.kpi === 'new_customers' && (
                  <CustomerDataManagementDialog widget={widget} onSave={(records) => onSaveCustomerRecords(widget.id, records)}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Database className="mr-2 h-4 w-4" />データ編集
                    </DropdownMenuItem>
                  </CustomerDataManagementDialog>
                )}
                {widget.scope === 'company' && widget.kpi === 'project_delivery_compliance' && (
                  <ProjectComplianceDataManagementDialog widget={widget} onSave={(records) => onSaveProjectComplianceRecords(widget.id, records)}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Database className="mr-2 h-4 w-4" />データ編集
                    </DropdownMenuItem>
                  </ProjectComplianceDataManagementDialog>
                )}

                <DropdownMenuSeparator />

                {/* 削除 */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      削除
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ウィジェットを削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        「{widget.title}」を削除します。この操作は元に戻せません。
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
        </div>
      </CardHeader>

      <CardContent className="h-60">
        <WidgetPreview widget={widget} chartData={chartData} granularity={granularity} isCumulative={isCumulative} />
      </CardContent>
    </Card>
  );
}


function WidgetList({
  widgets,
  onSave,
  onDelete,
  onSetActive,
  onSaveDisplaySettings,
  onSaveSalesRecords,
  onSaveProfitRecords,
  onSaveCustomerRecords,
  onSaveProjectComplianceRecords,
  onSaveTeamGoalData,
  onSaveTeamGoalTimeSeriesData,
  currentUser,
  canEdit,
  organizations,
  scope,
  cardSize = 'md',
}: {
  widgets: Goal[];
  onSave: (data: Partial<Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>>, id?: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string, scopeId: string) => void;
  onSaveDisplaySettings: (id: string, settings: { defaultGranularity: ChartGranularity, defaultIsCumulative: boolean }) => void;
  onSaveSalesRecords: (goalId: string, records: Omit<SalesRecord, 'id'>[]) => void;
  onSaveProfitRecords: (goalId: string, records: Omit<ProfitRecord, 'id'>[]) => void;
  onSaveCustomerRecords: (goalId: string, records: Omit<CustomerRecord, 'id'>[]) => void;
  onSaveProjectComplianceRecords: (goalId: string, records: Omit<ProjectComplianceRecord, 'id'>[]) => void;
  onSaveTeamGoalData: (goalId: string, data: { currentValue: number }) => void;
  onSaveTeamGoalTimeSeriesData: (goalId: string, records: Omit<GoalRecord, 'id'|'authorId'|'updatedAt'>[]) => void;
  currentUser: Member | null;
  canEdit: boolean;
  organizations: Organization[];
  scope: WidgetScope;
  cardSize?: 'sm' | 'md' | 'lg';
}) {
  if (widgets.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>表示できるウィジェットがありません。</p>
      </div>
    );
  }

  const gridLayouts = {
    lg: 'grid-cols-1',
    md: 'grid-cols-1 md:grid-cols-2',
    sm: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  };

  return (
    <div className={cn('grid gap-6', gridLayouts[cardSize])}>
      {widgets.map(widget => (
        <WidgetCard
          key={widget.id}
          widget={widget}
          onSave={onSave}
          onDelete={onDelete}
          onSetActive={() => onSetActive(widget.id, widget.scopeId)}
          onSaveDisplaySettings={onSaveDisplaySettings}
          onSaveSalesRecords={onSaveSalesRecords}
          onSaveProfitRecords={onSaveProfitRecords}
          onSaveCustomerRecords={onSaveCustomerRecords}
          onSaveProjectComplianceRecords={onSaveProjectComplianceRecords}
          onSaveTeamGoalData={onSaveTeamGoalData}
          onSaveTeamGoalTimeSeriesData={onSaveTeamGoalTimeSeriesData}
          currentUser={currentUser}
          canEdit={canEdit}
          organizations={organizations}
        />
      ))}
    </div>
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
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={ja}
                />
               </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>進捗 ({progress}%)</Label>
            <Slider value={[progress]} onValueChange={([val]) => setProgress(val)} max={100} step={1} />
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="is-public-switch" checked={isPublic} onCheckedChange={setIsPublic} />
            <Label htmlFor="is-public-switch" className="font-normal">他のメンバーに共有する</Label>
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

function PastGoalCard({ goal, onEdit, onDelete }: { goal: PersonalGoal; onEdit: () => void; onDelete: () => void; }) {
  const { title, startDate, endDate, progress, status, updatedAt } = goal;

  const getStatusColor = () => {
    switch (status) {
      case '達成済':
        return 'text-green-500';
      case '未達成':
        return 'text-red-500';
      default: // 進行中
        return 'text-yellow-500';
    }
  };
  
  const getBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case '達成済':
        return 'default';
      case '未達成':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const statusColor = getStatusColor();
  const StatusIcon = status === '達成済' ? CheckCircle2 : XCircle;

  const formattedStartDate = startDate ? format(startDate.toDate(), 'yyyy/MM/dd', { locale: ja }) : 'N/A';
  const formattedEndDate = endDate ? format(endDate.toDate(), 'yyyy/MM/dd', { locale: ja }) : 'N/A';
  const formattedUpdatedAt = updatedAt ? formatDistanceToNow(updatedAt.toDate(), { addSuffix: true, locale: ja }) : 'N/A';

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between">
        <div className="flex flex-col space-y-1.5">
          <CardTitle className="text-lg font-bold">個人目標</CardTitle>
          <CardDescription>過去に設定した目標の記録です。</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              編集
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <svg className="h-32 w-32" viewBox="0 0 100 100">
              <circle
                className="stroke-current text-gray-200 dark:text-gray-700"
                strokeWidth="10"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
              ></circle>
              <circle
                className={cn("stroke-current", statusColor)}
                strokeWidth="10"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40 * (progress / 100)} ${2 * Math.PI * 40 * (1 - progress / 100)}`}
                strokeDashoffset={`${2 * Math.PI * 40 * 0.25}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-foreground">{progress}%</span>
              <span className="text-xs text-muted-foreground">進捗</span>
            </div>
          </div>
          <div className="text-center">
             <div className="flex items-center justify-center gap-2">
                {StatusIcon && <StatusIcon className={cn("h-5 w-5", statusColor)} />}
                <p className="font-semibold text-foreground text-lg">{title}</p>
            </div>
            <Badge variant={getBadgeVariant()} className="mt-1">{status}</Badge>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-4 w-4" />
            <span>期間: {formattedStartDate} ~ {formattedEndDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <Flag className="h-4 w-4" />
            <span>ステータス: {status}</span>
          </div>
          <div className="flex items-center gap-3">
            <Repeat className="h-4 w-4" />
            <span>最終更新: {formattedUpdatedAt}</span>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const [selectedGoal, setSelectedGoal] = useState<PersonalGoal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // States for past goals table
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | GoalStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);


  const firestore = useFirestore();
  const personalGoalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'personalGoals'));
  }, [firestore, user]);

  const { data: goals, isLoading: areGoalsLoading } = useCollection<PersonalGoal>(personalGoalsQuery);

  const { ongoing, pastGoals } = useMemo(() => {
    if (!goals) return { ongoing: [], pastGoals: [] };
    const sortedGoals = [...goals].sort((a,b) => b.endDate.toMillis() - a.endDate.toMillis());
    return {
      ongoing: sortedGoals.filter(g => g.status === '進行中'),
      pastGoals: sortedGoals.filter(g => g.status !== '進行中'),
    };
  }, [goals]);

  const filteredPastGoals = useMemo(() => {
    return pastGoals
      .filter(goal => {
        const searchMatch = searchTerm === '' || goal.title.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || goal.status === statusFilter;
        const dateMatch = !dateRange?.from || (goal.endDate.toDate() >= dateRange.from && goal.startDate.toDate() <= (dateRange.to || dateRange.from) );
        return searchMatch && statusMatch && dateMatch;
      });
  }, [pastGoals, searchTerm, statusFilter, dateRange]);

  const paginatedPastGoals = useMemo(() => {
    const startIndex = currentPage * rowsPerPage;
    return filteredPastGoals.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredPastGoals, currentPage, rowsPerPage]);
  
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, statusFilter, dateRange, rowsPerPage]);


  const handleEdit = (goal: PersonalGoal) => {
    setSelectedGoal(goal);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedGoal(null);
    setIsDialogOpen(true);
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
          <h3 className="text-lg font-semibold mb-4">進行中の目標</h3>
           {hasOngoingGoal ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ongoing.map(goal => (
                <PersonalGoalCard key={goal.id} goal={goal} onEdit={() => handleEdit(goal)} onDelete={() => onDelete(goal.id)} />
              ))}
            </div>
           ) : (
            <div className="my-8 flex flex-col items-center justify-center gap-4 text-center">
              <div className="flex max-w-md items-start gap-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  新しい目標を作成しましょう。メッセージは、あなたの目標達成に向けたポジティブな言葉や、次にとるべきアクションのヒントをAIが提案します。
                </p>
              </div>
              <Button onClick={handleCreate} className="bg-green-600 text-white hover:bg-green-700">
                目標を保存してメッセージを生成！
              </Button>
            </div>
           )}
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>過去の目標</CardTitle>
                <CardDescription>完了、または期限切れの目標の一覧です。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant="outline" className={cn('w-full md:w-auto justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, 'PPP', { locale: ja })} - {format(dateRange.to, 'PPP', { locale: ja })}</>) : (format(dateRange.from, 'PPP', { locale: ja }))) : (<span>期間で絞り込み</span>)}
                            </Button>
                        </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                locale={ja}
                            />
                        </PopoverContent>
                    </Popover>
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="タイトルで検索..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | GoalStatus)}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="ステータス" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">すべてのステータス</SelectItem>
                            <SelectItem value="達成済">達成済</SelectItem>
                            <SelectItem value="未達成">未達成</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {paginatedPastGoals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedPastGoals.map(goal => (
                      <PastGoalCard key={goal.id} goal={goal} onEdit={() => handleEdit(goal)} onDelete={() => onDelete(goal.id)} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>該当する過去の目標はありません。</p>
                  </div>
                )}
            </CardContent>
            <CardFooter>
                 <DataTablePagination
                    count={filteredPastGoals.length}
                    rowsPerPage={rowsPerPage}
                    page={currentPage}
                    onPageChange={setCurrentPage}
                    onRowsPerPageChange={setRowsPerPage}
                  />
            </CardFooter>
        </Card>
      </div>
    </>
  );
}


function DashboardSettingsPageComponent() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');

    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
    const { userPermissions, isCheckingPermissions } = usePermissions();

    const [currentUserData, setCurrentUserData] = useState<Member | null>(null);
    
    const [companySearchTerm, setCompanySearchTerm] = useState('');
    const [companyDateRange, setCompanyDateRange] = useState<DateRange | undefined>();
    const [companyCardSize, setCompanyCardSize] = useState<'sm' | 'md' | 'lg'>('md');
    const [companyCurrentPage, setCompanyCurrentPage] = useState(0);
    const [companyRowsPerPage, setCompanyRowsPerPage] = useState(4);

    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [teamDateRange, setTeamDateRange] = useState<DateRange | undefined>();
    const [teamCardSize, setTeamCardSize] = useState<'sm' | 'md' | 'lg'>('md');
    const [teamCurrentPage, setTeamCurrentPage] = useState(0);
    const [teamRowsPerPage, setTeamRowsPerPage] = useState(4);
    
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [editableOrgs, setEditableOrgs] = useState<Organization[]>([]);
    
    useEffect(() => {
        const sizeMap = { lg: 2, md: 4, sm: 6 };
        setTeamRowsPerPage(sizeMap[teamCardSize] || 4);
        setTeamCurrentPage(0);
    }, [teamCardSize]);
    
    useEffect(() => {
        const sizeMap = { lg: 2, md: 4, sm: 6 };
        setCompanyRowsPerPage(sizeMap[companyCardSize] || 4);
        setCompanyCurrentPage(0);
    }, [companyCardSize]);


    const { data: allOrganizations, isLoading: isLoadingOrgs } = useCollection<Organization>(useMemoFirebase(() => firestore ? query(collection(firestore, 'organizations')) : null, [firestore]));

    const usersQuery = useMemoFirebase(() => !firestore || isAuthUserLoading ? null : query(collection(firestore, 'users')), [firestore, isAuthUserLoading]);
    const { data: allUsers } = useCollection<Member>(usersQuery);

    useEffect(() => {
        if (authUser && allUsers) {
            setCurrentUserData(allUsers.find(u => u.uid === authUser.uid) || null);
        }
    }, [authUser, allUsers]);

    useEffect(() => {
        if (currentUserData && allOrganizations && userPermissions.includes('org_personal_goal_setting')) {
            const getSubTreeIds = (orgId: string, orgs: Organization[]): string[] => {
                let children = orgs.filter(o => o.parentId === orgId);
                let subTreeIds: string[] = [orgId];
                children.forEach(child => {
                    subTreeIds = subTreeIds.concat(getSubTreeIds(child.id, orgs));
                });
                return subTreeIds;
            };

            if (currentUserData.organizationId) {
                const userOrgTreeIds = getSubTreeIds(currentUserData.organizationId, allOrganizations);
                setEditableOrgs(allOrganizations.filter(org => userOrgTreeIds.includes(org.id)));
                if (!selectedOrgId) { // Only set initial if not already set
                  setSelectedOrgId(currentUserData.organizationId);
                }
            }
        }
    }, [currentUserData, allOrganizations, userPermissions, selectedOrgId]);


    const canManageCompanyGoals = userPermissions.includes('company_goal_setting');
    const canManageOrgPersonalGoals = userPermissions.includes('org_personal_goal_setting');

    const getDefaultTab = useCallback(() => {
        if (canManageCompanyGoals) return 'company';
        if (canManageOrgPersonalGoals) return 'team';
        return 'company'; // Fallback
    }, [canManageCompanyGoals, canManageOrgPersonalGoals]);
    
    const [activeTab, setActiveTab] = useState<WidgetScope | 'personal'>(getDefaultTab());

    useEffect(() => {
        const defaultTab = getDefaultTab();
        const requestedTab = tab;

        if (requestedTab && (requestedTab === 'company' || requestedTab === 'team' || requestedTab === 'personal')) {
            if (
                (requestedTab === 'company' && canManageCompanyGoals) ||
                (requestedTab === 'team' && canManageOrgPersonalGoals) ||
                (requestedTab === 'personal' && canManageOrgPersonalGoals)
            ) {
                setActiveTab(requestedTab as WidgetScope | 'personal');
            } else {
                setActiveTab(defaultTab);
            }
        } else {
             setActiveTab(defaultTab);
        }
    }, [tab, canManageCompanyGoals, canManageOrgPersonalGoals, getDefaultTab]);
    
    const pageSubTitle = useMemo(() => {
      if (activeTab === 'company') return '会社単位';
      if (activeTab === 'team') return '組織単位';
      if (activeTab === 'personal') return '個人単位';
      return '';
    }, [activeTab]);

    const companyGoalsQuery = useMemoFirebase(() => {
        if (!firestore || isCheckingPermissions || !canManageCompanyGoals || !currentUserData) return null;
        let queryConstraints: any[] = [where('scope', '==', 'company')];
        if (currentUserData.company) {
          queryConstraints.push(where('scopeId', '==', currentUserData.company));
        } else {
          // If user has no company, return a query that finds nothing.
          return query(collection(firestore, 'goals'), where('scopeId', '==', 'NO_COMPANY'));
        }
        return query(collection(firestore, 'goals'), ...queryConstraints);
    }, [firestore, currentUserData, isCheckingPermissions, canManageCompanyGoals]);


    const teamGoalsQuery = useMemoFirebase(() => {
        if (!firestore || isCheckingPermissions || !canManageOrgPersonalGoals) return null;
        return query(collection(firestore, 'goals'), where('scope', '==', 'team'));
    }, [firestore, isCheckingPermissions, canManageOrgPersonalGoals]);

    const { data: companyWidgets, isLoading: isLoadingCompanyWidgets } = useCollection<Goal>(companyGoalsQuery as Query<Goal> | null);
    const { data: teamWidgets, isLoading: isLoadingTeamWidgets } = useCollection<Goal>(teamGoalsQuery as Query<Goal> | null);
    
    const isLoadingWidgets = activeTab === 'company' ? isLoadingCompanyWidgets : isLoadingTeamWidgets;

    const filteredTeamWidgets = useMemo(() => {
        if (!teamWidgets) return [];
        return teamWidgets
            .filter(widget => {
                if (widget.scopeId !== selectedOrgId) return false;
                if (teamSearchTerm && !widget.title.toLowerCase().includes(teamSearchTerm.toLowerCase())) return false;
                if (teamDateRange?.from) {
                    const widgetStart = widget.startDate?.toDate();
                    const widgetEnd = widget.endDate?.toDate();
                    if (!widgetStart || !widgetEnd) return false;

                    const rangeEnd = teamDateRange.to || teamDateRange.from;

                    // Check for overlap
                    if (widgetStart > rangeEnd || widgetEnd < teamDateRange.from) {
                        return false;
                    }
                }
                return true;
            })
            .sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (b.status === 'active' && a.status !== 'active') return 1;
                const dateA = a.startDate?.toDate() ?? new Date(0);
                const dateB = b.startDate?.toDate() ?? new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
    }, [teamWidgets, selectedOrgId, teamSearchTerm, teamDateRange]);
    
    const filteredCompanyWidgets = useMemo(() => {
      if (!companyWidgets) return [];
      return companyWidgets
        .filter(widget => {
          if (companySearchTerm && !widget.title.toLowerCase().includes(companySearchTerm.toLowerCase())) {
            return false;
          }
          if (companyDateRange?.from) {
            if (!widget.fiscalYear || !widget.fiscalYearStartMonth) return false;
            
            const rangeEnd = companyDateRange.to || companyDateRange.from;

            const startMonth = widget.fiscalYearStartMonth;
            const widgetStartDate = new Date(startMonth >= 2 ? widget.fiscalYear : widget.fiscalYear -1, startMonth - 1, 1);
            const widgetEndDate = new Date(widgetStartDate.getFullYear() + 1, widgetStartDate.getMonth(), 0);

            if (widgetStartDate > rangeEnd || widgetEndDate < companyDateRange.from) {
              return false;
            }
          }
          return true;
        })
        .sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (b.status === 'active' && a.status !== 'active') return 1;
          return (b.fiscalYear ?? 0) - (a.fiscalYear ?? 0) || a.title.localeCompare(b.title);
        });
    }, [companyWidgets, companySearchTerm, companyDateRange]);


    const paginatedTeamWidgets = useMemo(() => {
        const startIndex = teamCurrentPage * teamRowsPerPage;
        return filteredTeamWidgets.slice(startIndex, startIndex + teamRowsPerPage);
    }, [filteredTeamWidgets, teamCurrentPage, teamRowsPerPage]);

    const paginatedCompanyWidgets = useMemo(() => {
      const startIndex = companyCurrentPage * companyRowsPerPage;
      return filteredCompanyWidgets.slice(startIndex, startIndex + companyRowsPerPage);
    }, [filteredCompanyWidgets, companyCurrentPage, companyRowsPerPage]);


    useEffect(() => {
        setTeamCurrentPage(0);
    }, [selectedOrgId, teamSearchTerm, teamDateRange]);

    useEffect(() => {
        setCompanyCurrentPage(0);
    }, [companySearchTerm, companyDateRange]);


    const handleSaveWidget = async (data: Partial<Omit<Goal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'authorId'>>, id?: string) => {
        if (!firestore || !authUser) return;
        
        const widgetsForScope = (data.scope === 'company' ? companyWidgets : teamWidgets)?.filter(w => w.scopeId === data.scopeId) || [];

        try {
            if (id) {
                const widgetRef = doc(firestore, 'goals', id);
                await updateDoc(widgetRef, { ...data, updatedAt: serverTimestamp() });
                toast({ title: "成功", description: "ウィジェットを更新しました。" });
            } else {
                const currentActive = widgetsForScope.find(w => w.status === 'active');
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
        const subcollectionNames = ['salesRecords', 'profitRecords', 'customerRecords', 'projectComplianceRecords', 'goalRecords'];
        
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
      if (!firestore) return;
      const widgetsToUpdate = activeTab === 'company' ? companyWidgets : teamWidgets;
      if (!widgetsToUpdate) return;
      
      const batch = writeBatch(firestore);
      widgetsToUpdate.forEach(w => {
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
    
    const handleSaveDisplaySettings = async (id: string, settings: { defaultGranularity: ChartGranularity, defaultIsCumulative: boolean }) => {
        if (!firestore) return;
        try {
            const widgetRef = doc(firestore, 'goals', id);
            await updateDoc(widgetRef, { ...settings, updatedAt: serverTimestamp() });
            toast({ title: "成功", description: "グラフの表示設定を保存しました。" });
        } catch (error) {
            console.error("Error saving display settings:", error);
            toast({ title: "エラー", description: "表示設定の保存に失敗しました。", variant: 'destructive' });
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

    const handleSaveTeamGoalData = async (goalId: string, data: { currentValue: number }) => {
      if (!firestore) return;
      try {
        const goalRef = doc(firestore, 'goals', goalId);
        await updateDoc(goalRef, {
          currentValue: data.currentValue,
          updatedAt: serverTimestamp(),
        });
        toast({ title: '成功', description: '進捗を更新しました。' });
      } catch (error) {
        console.error('Error updating team goal data:', error);
        toast({ title: 'エラー', description: '進捗の更新に失敗しました。', variant: 'destructive' });
      }
    };

    const handleSaveTeamGoalTimeSeriesData = async (goalId: string, records: Omit<GoalRecord, 'id' | 'authorId' | 'updatedAt'>[]) => {
      if (!firestore || !authUser) return;
      
      const batch = writeBatch(firestore);
      const subCollectionRef = collection(firestore, 'goals', goalId, 'goalRecords');

      const existingDocsSnapshot = await getDocs(subCollectionRef);
      const existingDocsMap = new Map(existingDocsSnapshot.docs.map(d => [format(d.data().date.toDate(), 'yyyy-MM-dd'), d.id]));
      
      const recordsToSaveMap = new Map(records.map(r => [format(r.date.toDate(), 'yyyy-MM-dd'), r]));

      // Delete records that are no longer in the new set
      for (const [dateStr, docId] of existingDocsMap.entries()) {
        if (!recordsToSaveMap.has(dateStr)) {
          batch.delete(doc(subCollectionRef, docId));
        }
      }
      
      // Add or update records
      for (const record of records) {
        const dateStr = format(record.date.toDate(), 'yyyy-MM-dd');
        const existingDocId = existingDocsMap.get(dateStr);
        const recordRef = existingDocId ? doc(subCollectionRef, existingDocId) : doc(subCollectionRef);
        batch.set(recordRef, {
            ...record,
            authorId: authUser.uid,
            updatedAt: serverTimestamp()
        }, { merge: true });
      }
      
      try {
        await batch.commit();
        toast({ title: '成功', description: '実績データを保存しました。' });
      } catch (error) {
        console.error("Error saving time series goal records:", error);
        toast({ title: "エラー", description: "実績データの保存に失敗しました。", variant: 'destructive' });
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

  const isLoading = isAuthUserLoading || isCheckingPermissions || isLoadingOrgs || !currentUserData;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageCompanyGoals && !canManageOrgPersonalGoals) {
    return (
        <div className="w-full max-w-7xl mx-auto">
            <div className="flex items-center mb-6">
                <h1 className="text-lg font-semibold md:text-2xl">目標設定</h1>
            </div>
            <p>目標を管理する権限がありません。</p>
        </div>
    );
  }
  
  return (
    <div className="w-full space-y-8">
       <div className="flex items-center justify-between">
        <div className="flex flex-col">
            <h1 className="text-lg font-semibold md:text-2xl">目標設定</h1>
            {pageSubTitle && <p className="text-sm text-muted-foreground">{pageSubTitle}</p>}
        </div>
        {(activeTab === 'company' && canManageCompanyGoals) && (
            <WidgetDialog onSave={handleSaveWidget} defaultScope="company" currentUser={currentUserData} organizations={allOrganizations || []}>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新規ウィジェット追加
                </Button>
            </WidgetDialog>
        )}
        {(activeTab === 'team' && canManageOrgPersonalGoals) && (
             <WidgetDialog onSave={handleSaveWidget} defaultScope="team" currentUser={currentUserData} organizations={allOrganizations || []}>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新規ウィジェット追加
                </Button>
            </WidgetDialog>
        )}
      </div>

      {activeTab === 'company' && (
        canManageCompanyGoals ? (
          <Card className="flex flex-col h-full">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-1 items-center gap-2">
                   <Popover>
                        <PopoverTrigger asChild>
                            <Button id="company-date-range" variant="outline" className={cn('w-full md:w-auto justify-start text-left font-normal', !companyDateRange && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {companyDateRange?.from ? (companyDateRange.to ? (<>{format(companyDateRange.from, 'PPP', { locale: ja })} - {format(companyDateRange.to, 'PPP', { locale: ja })}</>) : (format(companyDateRange.from, 'PPP', { locale: ja }))) : (<span>期間で絞り込み</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                           <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={companyDateRange?.from}
                                selected={companyDateRange}
                                onSelect={setCompanyDateRange}
                                numberOfMonths={2}
                                locale={ja}
                            />
                        </PopoverContent>
                    </Popover>
                    {companyDateRange && <Button variant="ghost" size="icon" onClick={() => setCompanyDateRange(undefined)}><X className="h-4 w-4" /></Button>}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="タイトルで検索..." className="pl-10" value={companySearchTerm} onChange={(e) => setCompanySearchTerm(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={companyCardSize === 'lg' ? 'secondary' : 'ghost'} size="icon" onClick={() => setCompanyCardSize('lg')} title="大表示"><Rows3 className="h-4 w-4" /></Button>
                  <Button variant={companyCardSize === 'md' ? 'secondary' : 'ghost'} size="icon" onClick={() => setCompanyCardSize('md')} title="中表示"><Columns2 className="h-4 w-4" /></Button>
                  <Button variant={companyCardSize === 'sm' ? 'secondary' : 'ghost'} size="icon" onClick={() => setCompanyCardSize('sm')} title="小表示"><LayoutGrid className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              {isLoadingWidgets ? <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin"/></div> :
              <WidgetList 
                  widgets={paginatedCompanyWidgets} 
                  onSave={handleSaveWidget} 
                  onDelete={handleDeleteWidget}
                  onSetActive={handleSetActiveWidget}
                  onSaveDisplaySettings={handleSaveDisplaySettings}
                  onSaveSalesRecords={handleSaveSalesRecords}
                  onSaveProfitRecords={handleSaveProfitRecords}
                  onSaveCustomerRecords={handleSaveCustomerRecords}
                  onSaveProjectComplianceRecords={handleSaveProjectComplianceRecords}
                  onSaveTeamGoalData={handleSaveTeamGoalData}
                  onSaveTeamGoalTimeSeriesData={handleSaveTeamGoalTimeSeriesData}
                  currentUser={currentUserData}
                  canEdit={canManageCompanyGoals}
                  organizations={allOrganizations || []}
                  scope="company"
                  cardSize={companyCardSize}
              />}
            </CardContent>
             <CardFooter>
                <DataTablePagination
                    count={filteredCompanyWidgets.length}
                    rowsPerPage={companyRowsPerPage}
                    page={companyCurrentPage}
                    onPageChange={setCompanyCurrentPage}
                />
            </CardFooter>
          </Card>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>会社単位の目標を管理する権限がありません。</p>
          </div>
        )
      )}
      {activeTab === 'team' && (
        canManageOrgPersonalGoals ? (
            <Card className="flex flex-col h-full">
               <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex flex-1 items-center gap-2">
                            <div className="w-full max-w-xs">
                                <OrganizationPicker
                                    organizations={editableOrgs}
                                    value={selectedOrgId}
                                    onChange={setSelectedOrgId}
                                    disabled={(org) => org.type === 'holding' || org.type === 'company'}
                                />
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="date" variant="outline" className={cn('w-full md:w-auto justify-start text-left font-normal', !teamDateRange && 'text-muted-foreground')}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {teamDateRange?.from ? (teamDateRange.to ? (<>{format(teamDateRange.from, 'PPP', { locale: ja })} - {format(teamDateRange.to, 'PPP', { locale: ja })}</>) : (format(teamDateRange.from, 'PPP', { locale: ja }))) : (<span>期間で絞り込み</span>)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={teamDateRange?.from}
                                        selected={teamDateRange}
                                        onSelect={setTeamDateRange}
                                        numberOfMonths={2}
                                        locale={ja}
                                    />
                                </PopoverContent>
                            </Popover>
                            {teamDateRange && <Button variant="ghost" size="icon" onClick={() => setTeamDateRange(undefined)}><X className="h-4 w-4" /></Button>}
                            <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="タイトルで検索..." className="pl-10" value={teamSearchTerm} onChange={(e) => setTeamSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant={teamCardSize === 'lg' ? 'secondary' : 'ghost'} size="icon" onClick={() => setTeamCardSize('lg')} title="大表示"><Rows3 className="h-4 w-4" /></Button>
                            <Button variant={teamCardSize === 'md' ? 'secondary' : 'ghost'} size="icon" onClick={() => setTeamCardSize('md')} title="中表示"><Columns2 className="h-4 w-4" /></Button>
                            <Button variant={teamCardSize === 'sm' ? 'secondary' : 'ghost'} size="icon" onClick={() => setTeamCardSize('sm')} title="小表示"><LayoutGrid className="h-4 w-4" /></Button>
                        </div>
                    </div>
               </CardHeader>
               <CardContent className="flex-1 space-y-6">
                  {isLoadingWidgets ? <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin"/></div> :
                  <WidgetList 
                      widgets={paginatedTeamWidgets} 
                      onSave={handleSaveWidget} 
                      onDelete={handleDeleteWidget}
                      onSetActive={handleSetActiveWidget}
                      onSaveDisplaySettings={handleSaveDisplaySettings}
                      onSaveSalesRecords={handleSaveSalesRecords}
                      onSaveProfitRecords={handleSaveProfitRecords}
                      onSaveCustomerRecords={handleSaveCustomerRecords}
                      onSaveProjectComplianceRecords={handleSaveProjectComplianceRecords}
                      onSaveTeamGoalData={handleSaveTeamGoalData}
                      onSaveTeamGoalTimeSeriesData={handleSaveTeamGoalTimeSeriesData}
                      currentUser={currentUserData}
                      canEdit={canManageOrgPersonalGoals}
                      organizations={allOrganizations || []}
                      scope="team"
                      cardSize={teamCardSize}
                  />}
                </CardContent>
                 <CardFooter>
                    <DataTablePagination
                      count={filteredTeamWidgets.length}
                      rowsPerPage={teamRowsPerPage}
                      page={teamCurrentPage}
                      onPageChange={setTeamCurrentPage}
                    />
                </CardFooter>
            </Card>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>組織単位の目標を管理する権限がありません。</p>
          </div>
        )
      )}
      {activeTab === 'personal' && (
        canManageOrgPersonalGoals ? (
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
        )
      )}
    </div>
  );
}

export default function DashboardSettingsPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <DashboardSettingsPageComponent />
        </Suspense>
    )
}
