
'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Pie,
  ReferenceLine,
} from 'recharts';
import * as RechartsPrimitive from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { Goal } from '@/types/goal';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ja } from 'date-fns/locale';

export type ChartData = {
    month: string; // Represents the time-series key (e.g., '2024-08-01', '2024-W32')
    salesActual: number;
    salesTarget: number;
    achievementRate: number;
    profitMargin: number;
    totalCustomers: number;
    projectCompliant: number;
    projectMinorDelay: number;
    projectDelayed: number;
    
    // For team goals
    periodActual: number;
    cumulativeActual: number;
    periodTarget: number;
    cumulativeAchievementRate: number;
}

export type ChartGranularity = 'daily' | 'weekly' | 'monthly';

export const salesChartConfig = {
  salesActual: { label: '実績(達成)', color: 'hsl(var(--primary))' },
  salesTarget: { label: '目標', color: 'hsl(var(--secondary))' },
  achievementRate: { label: '達成率', color: 'hsl(38 92% 50%)' },
  overAchievement: { label: '実績(超過)', color: 'hsl(221 83% 53%)' }, // Blue
  shortfall: { label: '目標(不足分)', color: 'hsl(var(--primary))'},
};

const profitChartConfig = {
  profitMargin: { label: "営業利益率", color: "hsl(var(--primary))" },
};

const customerChartConfig = {
  totalCustomers: { label: "総顧客数", color: "hsl(var(--primary))" },
};

const projectComplianceChartConfig = {
  compliant: { label: "遵守", color: "hsl(var(--primary))" },
  minor_delay: { label: "軽微な遅延", color: "hsl(180 80% 40%)" },
  delayed: { label: "遅延", color: "hsl(var(--destructive))" },
};

const teamGoalChartConfig = {
  periodActual: { label: "期間実績", color: "hsl(var(--primary))" },
  cumulativeActual: { label: "累計実績", color: "hsl(var(--primary))" },
  overAchievement: { label: "超過達成", color: "hsl(221 83% 53%)" }, // Blue for overachievement
  cumulativeAchievementRate: { label: '累計達成率', color: 'hsl(38 92% 50%)' },
  targetLine: { label: "期間目標", color: "hsl(var(--muted-foreground))" },
};

function ActualSalesComposedChart({ chartData, unit, granularity, xTickFormatter }: { chartData: ChartData[], unit?:string, granularity?: ChartGranularity, xTickFormatter?: (value: string, index: number) => string; }) {
    if (!chartData || chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">データがありません</div>;
    }
    
    const processedData = useMemo(() => {
        return chartData.map(d => {
            const hasActual = d.salesActual > 0;
            if (hasActual) {
                if (d.salesActual >= d.salesTarget) {
                    // 目標達成または超過
                    return {
                        ...d,
                        base: d.salesTarget,
                        over: d.salesActual - d.salesTarget,
                        shortfall: 0,
                    };
                } else {
                    // 目標未達
                    return {
                        ...d,
                        base: d.salesActual,
                        over: 0,
                        shortfall: d.salesTarget - d.salesActual,
                    };
                }
            }
            // 実績未入力
            return {
                ...d,
                base: 0,
                over: 0,
                shortfall: d.salesTarget, // 目標値全体を不足分として表示
            };
        });
    }, [chartData]);


    return (
        <ChartContainer config={salesChartConfig} className="h-full w-full">
            <ComposedChart accessibilityLayer data={processedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={xTickFormatter || ((value) => `${new Date(value).getMonth() + 1}月`)} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} unit={unit === '百万円' ? 'M' : unit} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  cursor={true}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) =>
                        `${new Date(label).getFullYear()}年 ${new Date(label).getMonth() + 1}月`
                      }
                      formatter={(value, name, item) => {
                        const { salesActual, salesTarget, achievementRate, over, shortfall } = item.payload as any;
                        const displayUnit = unit === '百万円' ? 'M' : (unit || '');
                        const renderItem = (label: string, value: string | number) => (
                           <div className="flex w-full items-center justify-between text-xs">
                              <span>{label}</span>
                              <span className="font-bold">{value}</span>
                           </div>
                        );

                        switch (item.dataKey) {
                            case 'base':
                              return renderItem("目標 / 実績", `${salesTarget}${displayUnit} / ${salesActual}${displayUnit}`);
                            case 'over':
                                if (over > 0) return renderItem("超過達成", `${over}${displayUnit}`);
                                return null;
                            case 'shortfall':
                                // Display '不足分' only when it's a real shortfall, not just an empty actual
                                if (shortfall > 0 && salesActual > 0) return renderItem("不足分", `${shortfall}${displayUnit}`);
                                return null;
                            case 'achievementRate':
                                return renderItem("達成率", `${achievementRate}%`);
                            default:
                                return null;
                        }
                      }}
                       itemSorter={(item) => {
                          if (item.dataKey === 'base') return 0;
                          if (item.dataKey === 'over') return 1;
                          if (item.dataKey === 'shortfall') return 2;
                          if (item.dataKey === 'achievementRate') return 3;
                          return 4;
                       }}
                    />
                  }
                />
                <ChartLegend 
                  content={
                    <ChartLegendContent 
                      payload={[
                        { value: '実績(未達/達成)', type: 'square', id: 'base', color: salesChartConfig.salesActual.color },
                        { value: '実績(超過)', type: 'square', id: 'over', color: salesChartConfig.overAchievement.color },
                        { value: '目標(不足分)', type: 'square', id: 'shortfall', color: 'hsl(var(--primary))', inactive: true },
                        { value: '達成率', type: 'line', id: 'achievementRate', color: salesChartConfig.achievementRate.color },
                      ]}
                      nameKey="value"
                    />
                  } 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />

                <Bar dataKey="base" name="実績" fill="var(--color-salesActual)" stackId="a" yAxisId="left" />
                <Bar dataKey="shortfall" name="不足分" fill="var(--color-shortfall)" stackId="a" yAxisId="left" fillOpacity={0.4} />
                <Bar dataKey="over" name="超過達成" fill="var(--color-overAchievement)" stackId="a" yAxisId="left" />
                
                <Line type="monotone" dataKey="achievementRate" stroke="var(--color-achievementRate)" yAxisId="right" dot={false} strokeWidth={2} name="達成率" />
            </ComposedChart>
        </ChartContainer>
    );
}

function ActualSalesBarChart({ chartData, unit, xTickFormatter }: { chartData: ChartData[], unit?: string, xTickFormatter?: (value: string, index: number) => string; }) {
    if (!chartData || chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">データがありません</div>;
    }
    const processedData = useMemo(() => {
        return chartData.map(d => {
            const hasActual = d.salesActual > 0;
            if (hasActual) {
                return d.salesActual >= d.salesTarget
                    ? { ...d, base: d.salesTarget, over: d.salesActual - d.salesTarget, shortfall: 0 }
                    : { ...d, base: d.salesActual, over: 0, shortfall: d.salesTarget - d.salesActual };
            }
            return { ...d, base: 0, over: 0, shortfall: d.salesTarget };
        });
    }, [chartData]);
    return (
        <ChartContainer config={salesChartConfig} className="h-full w-full">
            <ComposedChart data={processedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={xTickFormatter || ((value) => `${new Date(value).getMonth() + 1}月`)} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} unit={unit === '百万円' ? 'M' : unit} />
                <Tooltip
                  cursor={true}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => `${new Date(label).getFullYear()}年 ${new Date(label).getMonth() + 1}月`}
                      formatter={(value, name, item) => {
                          const { salesActual, salesTarget, over, shortfall } = item.payload as any;
                          const displayUnit = unit === '百万円' ? 'M' : (unit || '');
                          const renderItem = (label: string, value: string | number) => (
                             <div className="flex w-full items-center justify-between text-xs"><span>{label}</span><span className="font-bold">{value}</span></div>
                          );
                          switch (item.dataKey) {
                              case 'base': return renderItem("実績 / 目標", `${salesActual}${displayUnit} / ${salesTarget}${displayUnit}`);
                              case 'over': if (over > 0) return renderItem("超過達成", `${over}${displayUnit}`); return null;
                              case 'shortfall': if (shortfall > 0 && salesActual > 0) return renderItem("不足分", `${shortfall}${displayUnit}`); return null;
                              default: return null;
                          }
                      }}
                       itemSorter={(item) => {
                          if (item.dataKey === 'base') return 0;
                          if (item.dataKey === 'over') return 1;
                          if (item.dataKey === 'shortfall') return 2;
                          return 3;
                       }}
                    />
                  }
                />
                <ChartLegend 
                  content={
                    <ChartLegendContent 
                      payload={[
                        { value: '実績(未達/達成)', type: 'square', id: 'base', color: salesChartConfig.salesActual.color },
                        { value: '実績(超過)', type: 'square', id: 'over', color: salesChartConfig.overAchievement.color },
                        { value: '目標(不足分)', type: 'square', id: 'shortfall', color: 'hsl(var(--primary))', inactive: true },
                      ]}
                      nameKey="value"
                    />
                  } 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
                <Bar dataKey="base" name="実績" fill="var(--color-salesActual)" stackId="a" yAxisId="left" />
                <Bar dataKey="shortfall" name="不足分" fill="var(--color-shortfall)" stackId="a" yAxisId="left" fillOpacity={0.4} />
                <Bar dataKey="over" name="超過達成" fill="var(--color-overAchievement)" stackId="a" yAxisId="left" />
            </ComposedChart>
        </ChartContainer>
    );
}

function TargetAndActualLineChart({ chartData, unit, xTickFormatter }: { chartData: ChartData[], unit?: string, xTickFormatter?: (value: string, index: number) => string; }) {
    if (!chartData || chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">データがありません</div>;
    }

    const processedData = useMemo(() => {
        return chartData.map(d => ({
            ...d,
            projected: d.salesActual > 0 ? d.salesActual : null,
            target: d.salesTarget,
        }));
    }, [chartData]);
    
    const lineChartConfig = {
        projected: { label: "実績", color: "hsl(var(--primary))" },
        target: { label: "目標", color: "hsl(var(--muted-foreground))" },
    };
    const displayUnit = unit === '百万円' ? 'M' : (unit || '');

    return (
        <ChartContainer config={lineChartConfig} className="h-full w-full">
            <ComposedChart data={processedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={xTickFormatter || ((value) => `${new Date(value).getMonth() + 1}月`)} tick={{ fontSize: 10 }} />
                <YAxis unit={displayUnit} tick={{ fontSize: 10 }} />
                <Tooltip
                    content={
                        <ChartTooltipContent
                            labelFormatter={(label) => `${new Date(label).getFullYear()}年 ${new Date(label).getMonth() + 1}月`}
                            formatter={(value, name, item) => {
                                const { salesActual, salesTarget } = item.payload as any;
                                const hasActual = salesActual > 0;
                                if (name === 'projected' && hasActual) {
                                    return (
                                        <div className="flex flex-col gap-1">
                                           <div className="flex justify-between"><span>実績:</span><span className="font-bold ml-2">{salesActual}{displayUnit}</span></div>
                                           <div className="flex justify-between"><span>目標:</span><span className="font-bold ml-2">{salesTarget}{displayUnit}</span></div>
                                        </div>
                                    );
                                }
                                 if (name === 'target' && !hasActual) {
                                     return (
                                       <div className="flex justify-between"><span>目標:</span><span className="font-bold ml-2">{salesTarget}{displayUnit}</span></div>
                                     )
                                 }
                                return null;
                            }}
                             itemSorter={(item) => item.dataKey === 'projected' ? 0 : 1}
                        />
                    }
                />
                <ChartLegend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line dataKey="projected" name="実績" stroke="var(--color-projected)" strokeWidth={2} dot={false} connectNulls={false} />
                <Line dataKey="target" name="目標" stroke="var(--color-target)" strokeWidth={2} dot={false} connectNulls={false} strokeDasharray="3 3" />
            </ComposedChart>
        </ChartContainer>
    );
}

function ProfitMarginLineChart({ chartData }: { chartData: ChartData[] }) {
  if (!chartData || chartData.length === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">データがありません</div>;
  }

  return (
    <ChartContainer config={profitChartConfig} className="h-full w-full">
      <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `${new Date(value).getMonth() + 1}月`}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          unit="%"
        />
        <Tooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `${new Date(label).getFullYear()}年 ${new Date(label).getMonth() + 1}月`}
              formatter={(value) => [`${value}%`, "営業利益率"]}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="profitMargin"
          stroke="var(--color-profitMargin)"
          strokeWidth={2}
          dot={false}
          name="営業利益率"
        />
      </ComposedChart>
    </ChartContainer>
  );
}

function CustomerBarChart({ chartData }: { chartData: ChartData[] }) {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <ChartContainer config={customerChartConfig} className="h-full w-full">
      <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `${new Date(value).getMonth() + 1}月`}
          tick={{ fontSize: 10 }}
        />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) =>
                `${new Date(label).getFullYear()}年 ${
                  new Date(label).getMonth() + 1
                }月`
              }
              formatter={(value, name) => [`${value}社`, '総顧客数']}
            />
          }
        />
        <Bar
          dataKey="totalCustomers"
          name="総顧客数"
          fill="var(--color-totalCustomers)"
        />
      </ComposedChart>
    </ChartContainer>
  );
}

function ProjectComplianceBarChart({ chartData }: { chartData: ChartData[] }) {
    if (!chartData || chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">データがありません</div>;
    }
    return (
        <ChartContainer config={projectComplianceChartConfig} className="h-full w-full">
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${new Date(value).getMonth() + 1}月`} type="category" tick={{ fontSize: 10 }} />
            <YAxis type="number" tick={{ fontSize: 10 }} unit="件" />
            <Tooltip content={<ChartTooltipContent />} />
            <ChartLegend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="projectCompliant" name="遵守" fill="var(--color-compliant)" stackId="a" />
            <Bar dataKey="projectMinorDelay" name="軽微な遅延" fill="var(--color-minor_delay)" stackId="a" />
            <Bar dataKey="projectDelayed" name="遅延" fill="var(--color-delayed)" stackId="a" />
        </ComposedChart>
        </ChartContainer>
    );
}

function ProjectCompliancePieChart({ chartData }: { chartData: ChartData[] }) {
  if (!chartData || chartData.length === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">データがありません</div>;
  }

  const total = useMemo(() => {
    return chartData.reduce((acc, curr) => {
      acc.compliant += curr.projectCompliant;
      acc.minor_delay += curr.projectMinorDelay;
      acc.delayed += curr.projectDelayed;
      return acc;
    }, { compliant: 0, minor_delay: 0, delayed: 0 });
  }, [chartData]);

  const pieData = Object.entries(total)
    .map(([key, value]) => ({
      name: projectComplianceChartConfig[key as keyof typeof projectComplianceChartConfig].label,
      value,
      fill: projectComplianceChartConfig[key as keyof typeof projectComplianceChartConfig].color,
    }))
    .filter(item => item.value > 0);
  
  if (pieData.length === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">集計データがありません</div>;
  }

  return (
    <ChartContainer config={projectComplianceChartConfig} className="h-full w-full">
      <RechartsPrimitive.PieChart>
        <Tooltip content={<ChartTooltipContent hideLabel formatter={(value, name) => [`${value}件`, name as string]} />} />
        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} nameKey="name" />
      </RechartsPrimitive.PieChart>
    </ChartContainer>
  );
}

const previewData = [
  { name: '1月', value: 400 },
  { name: '2月', value: 300 },
  { name: '3月', value: 600 },
  { name: '4月', value: 800 },
  { name: '5月', value: 500 },
  { name: '6月', value: 700 },
];

const pieData = [
  { name: '完了', value: 75 },
  { name: '未完了', value: 25 },
];

const PIE_CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))'];

function BarChartPreview() {
  return (
    <ChartContainer config={{value: {label: 'Value', color: 'hsl(var(--primary))'}}} className="h-full w-full">
      <ComposedChart data={previewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <Bar dataKey="value" fill="hsl(var(--primary))" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
        <YAxis tick={{ fontSize: 10 }}/>
        <Tooltip content={<ChartTooltipContent />} />
      </ComposedChart>
    </ChartContainer>
  );
}

function LineChartPreview() {
  return (
     <ChartContainer config={{value: {label: 'Value', color: 'hsl(var(--primary))'}}} className="h-full w-full">
        <ComposedChart data={previewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
          <YAxis tick={{ fontSize: 10 }}/>
          <Tooltip content={<ChartTooltipContent />} />
        </ComposedChart>
    </ChartContainer>
  );
}

function PieChartPreview({ isDonut = false }: { isDonut?: boolean }) {
  const chartConfig = {
    完了: { label: '完了', color: 'hsl(var(--primary))' },
    未完了: { label: '未完了', color: 'hsl(var(--muted))' },
  };
  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
        <RechartsPrimitive.PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={isDonut ? 40 : 0}>
              {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
              ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Legend wrapperStyle={{ fontSize: '10px' }}/>
        </RechartsPrimitive.PieChart>
    </ChartContainer>
  );
}

function DonutChartWidget({ widget }: { widget: Goal }) {
  const { targetValue = 100, currentValue = 0, unit = '%' } = widget;
  const progress = targetValue > 0 ? Math.min(Math.round((currentValue / targetValue) * 100), 100) : 0;
  
  const chartData = [
    { name: 'Progress', value: progress, fill: 'hsl(var(--primary))' },
    { name: 'Remaining', value: 100 - progress, fill: 'hsl(var(--muted))' },
  ];

  const chartConfig = {
    progress: { label: '進捗', color: 'hsl(var(--primary))' },
    remaining: { label: '残り', color: 'hsl(var(--muted))' },
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
       <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full">
         <RechartsPrimitive.PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            startAngle={90}
            endAngle={450}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <foreignObject x="15%" y="35%" width="70%" height="30%">
            <div className="flex flex-col items-center justify-center text-center h-full">
              <p className="text-2xl font-bold text-foreground">{progress}<span className="text-base font-normal">%</span></p>
              <p className="text-xs text-muted-foreground">{currentValue}{unit} / {targetValue}{unit}</p>
            </div>
          </foreignObject>
        </RechartsPrimitive.PieChart>
       </ChartContainer>
    </div>
  );
}

function TeamGoalPeriodicBarChart({
  chartData,
  widget,
  xTickFormatter,
}: {
  chartData: ChartData[];
  widget: Goal;
  xTickFormatter: (value: string, index: number) => string;
}) {
  const displayUnit = widget.unit || '';
  
  const processedData = useMemo(() => {
    return chartData.map(d => {
      if (d.periodActual >= d.periodTarget) {
        return { ...d, base: d.periodTarget, over: d.periodActual - d.periodTarget };
      }
      return { ...d, base: d.periodActual, over: 0 };
    });
  }, [chartData]);
  
  return (
    <ChartContainer config={teamGoalChartConfig} className="h-full w-full">
      <ComposedChart data={processedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={xTickFormatter} tick={{ fontSize: 10 }} />
        <YAxis unit={displayUnit} tick={{ fontSize: 10 }} />
        <Tooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => { try { return format(new Date(label), 'yyyy年M月d日'); } catch { return label; } }}
              formatter={(value, name, item) => {
                  const { periodActual, periodTarget, over } = item.payload as any;
                  if (name === "期間実績") return [`${periodActual} ${displayUnit}`, "期間実績"];
                  if (name === "超過達成" && over > 0) return [`${over} ${displayUnit}`, "超過達成"];
                  return null;
              }}
            />
          }
        />
        <ChartLegend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} payload={[{ value: '期間実績', type: 'rect', id: 'base', color: teamGoalChartConfig.periodActual.color }, { value: '超過達成', type: 'rect', id: 'over', color: teamGoalChartConfig.overAchievement.color }]}/>
        <ReferenceLine y={widget.targetValue} label={{ value: "全体目標", position: "insideTopLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
        <Bar dataKey="base" name="期間実績" fill="var(--color-periodActual)" stackId="a" />
        <Bar dataKey="over" name="超過達成" fill="var(--color-overAchievement)" stackId="a" />
      </ComposedChart>
    </ChartContainer>
  )
}

function TeamGoalCumulativeChart({
  chartData,
  widget,
  xTickFormatter,
}: {
  chartData: ChartData[];
  widget: Goal;
  xTickFormatter: (value: string, index: number) => string;
}) {
  const displayUnit = widget.unit || '';

  const renderChart = () => {
    switch (widget.chartType) {
      case 'composed':
        return (
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={xTickFormatter} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" unit={displayUnit} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 10 }} domain={[0, 'dataMax > 100 ? dataMax : 100']} />
            <Tooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => { try { return format(new Date(label), 'yyyy年M月d日'); } catch { return label; } }}
                  formatter={(value, name, item) => {
                    if (name === '期間実績') return [`${item.payload.periodActual} ${displayUnit}`, '期間実績'];
                    if (name === '累計達成率') return [`${value}%`, '累計達成率'];
                    return null;
                  }}
                />
              }
            />
            <ChartLegend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} payload={[{ value: '期間実績', type: 'rect', id: 'periodActual', color: teamGoalChartConfig.periodActual.color }, { value: '累計達成率', type: 'line', id: 'cumulativeAchievementRate', color: teamGoalChartConfig.cumulativeAchievementRate.color }]} />
            <Bar dataKey="periodActual" name="期間実績" fill="var(--color-periodActual)" yAxisId="left" />
            <Line dataKey="cumulativeAchievementRate" name="累計達成率" stroke="var(--color-cumulativeAchievementRate)" yAxisId="right" dot={false} />
            <ReferenceLine y={widget.targetValue} yAxisId="left" label={{ value: "全体目標", position: "insideTopLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          </ComposedChart>
        );
      case 'bar':
        return (
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={xTickFormatter} tick={{ fontSize: 10 }} />
            <YAxis unit={displayUnit} tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltipContent labelFormatter={(label) => { try { return format(new Date(label), 'yyyy年M月d日'); } catch { return label; } }} formatter={(value) => [`${value} ${displayUnit}`, '累計実績']} />} />
            <ChartLegend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="cumulativeActual" name="累計実績" fill="var(--color-cumulativeActual)" />
            <ReferenceLine y={widget.targetValue} label={{ value: "全体目標", position: "insideTopLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          </ComposedChart>
        );
      case 'line':
        return (
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={xTickFormatter} tick={{ fontSize: 10 }} />
            <YAxis unit={displayUnit} tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltipContent labelFormatter={(label) => { try { return format(new Date(label), 'yyyy年M月d日'); } catch { return label; } }} formatter={(value) => [`${value} ${displayUnit}`, '累計実績']} />} />
            <ChartLegend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="cumulativeActual" name="累計実績" stroke="var(--color-cumulativeActual)" dot={false} />
            <ReferenceLine y={widget.targetValue} label={{ value: "全体目標", position: "insideTopLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          </ComposedChart>
        );
      default:
        return null;
    }
  };

  return <ChartContainer config={teamGoalChartConfig} className="h-full w-full">{renderChart()}</ChartContainer>;
}


interface WidgetPreviewProps {
    widget: Goal;
    chartData: ChartData[];
    granularity: ChartGranularity;
    isCumulative: boolean;
}

export default function WidgetPreview({ widget, chartData, granularity, isCumulative }: WidgetPreviewProps) {

    const xTickFormatter = (value: string, index: number): string => {
        try {
            const date = new Date(value);
            if (granularity === 'monthly') {
                return format(date, 'M月');
            }
            if (granularity === 'weekly') {
                return format(date, 'M/d');
            }
            if (granularity === 'daily') {
                if (!widget.startDate || !widget.endDate) return value;
                const totalDays = differenceInDays(widget.endDate.toDate(), widget.startDate.toDate());
                if (totalDays <= 0) return format(date, 'M/d');
                // Adjust interval based on total duration to avoid clutter
                const tickInterval = totalDays > 30 ? Math.ceil(totalDays / 7) : totalDays > 14 ? 2 : 1;
                if (index % tickInterval === 0) {
                    return format(date, 'M/d');
                }
                return '';
            }
        } catch {
            return value;
        }
        return value;
    };

    if (widget.scope === 'team') {
        if (widget.chartType === 'donut') {
            return <DonutChartWidget widget={widget} />;
        }
        
        if (isCumulative) {
             return <TeamGoalCumulativeChart chartData={chartData} widget={widget} xTickFormatter={xTickFormatter} />;
        } else {
             return <TeamGoalPeriodicBarChart chartData={chartData} widget={widget} xTickFormatter={xTickFormatter} />;
        }
    }

    if (widget.scope === 'company') {
        if (widget.kpi === 'sales_revenue') {
            switch (widget.chartType) {
                case 'composed': return <ActualSalesComposedChart chartData={chartData} unit="百万円" />;
                case 'bar': return <ActualSalesBarChart chartData={chartData} unit="百万円" />;
                case 'line': return <TargetAndActualLineChart chartData={chartData} unit="百万円" />;
            }
        }
        if (widget.kpi === 'profit_margin') {
            if (widget.chartType === 'line') return <ProfitMarginLineChart chartData={chartData} />;
        }
        if (widget.kpi === 'new_customers') {
            if (widget.chartType === 'bar') return <CustomerBarChart chartData={chartData} />;
        }
        if (widget.kpi === 'project_delivery_compliance') {
            switch (widget.chartType) {
                case 'bar': return <ProjectComplianceBarChart chartData={chartData} />;
                case 'pie': return <ProjectCompliancePieChart chartData={chartData} />;
            }
        }
    }


    // Fallback for other KPIs or chart types
    switch (widget.chartType) {
        case 'bar': return <BarChartPreview />;
        case 'line': return <LineChartPreview />;
        case 'pie': return <PieChartPreview />;
        case 'donut': return <PieChartPreview isDonut />;
        case 'composed': return <ActualSalesComposedChart chartData={chartData} />;
        default: return <BarChartPreview />;
      }
}

    
