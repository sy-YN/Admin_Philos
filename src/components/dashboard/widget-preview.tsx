
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
} from 'recharts';
import * as RechartsPrimitive from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { Goal } from '@/types/goal';
import { cn } from '@/lib/utils';


export type ChartData = {
    month: string;
    salesActual: number;
    salesTarget: number;
    achievementRate: number;
    profitMargin: number;
    totalCustomers: number;
    projectCompliant: number;
    projectMinorDelay: number;
    projectDelayed: number;
    targetValue: number;
    actualValue: number;
}

export const salesChartConfig = {
  salesActual: { label: '実績(達成)', color: 'hsl(var(--primary))' },
  salesTarget: { label: '目標', color: 'hsl(var(--secondary))' },
  achievementRate: { label: '達成率', color: 'hsl(38 92% 50%)' },
  overAchievement: { label: '実績(超過)', color: 'hsl(var(--destructive))' },
  shortfall: { label: '目標(不足分)', color: 'hsl(var(--primary))',
  },
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
  actualValue: { label: "実績", color: "hsl(var(--primary))" },
  targetValue: { label: "目標", color: "hsl(var(--muted-foreground))" },
  achievementRate: { label: '達成率', color: 'hsl(38 92% 50%)' },
}

function ActualSalesComposedChart({ chartData }: { chartData: ChartData[] }) {
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
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${new Date(value).getMonth() + 1}月`} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} unit="M" />
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
                        const renderItem = (label: string, value: string | number) => (
                           <div className="flex w-full items-center justify-between text-xs">
                              <span>{label}</span>
                              <span className="font-bold">{value}</span>
                           </div>
                        );

                        switch (item.dataKey) {
                            case 'base':
                              return renderItem("目標 / 実績", `${salesTarget}M / ${salesActual}M`);
                            case 'over':
                                if (over > 0) return renderItem("超過達成", `${over}M`);
                                return null;
                            case 'shortfall':
                                // Display '不足分' only when it's a real shortfall, not just an empty actual
                                if (shortfall > 0 && salesActual > 0) return renderItem("不足分", `${shortfall}M`);
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

function ActualSalesBarChart({ chartData }: { chartData: ChartData[] }) {
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
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${new Date(value).getMonth() + 1}月`} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} unit="M" />
                <Tooltip
                  cursor={true}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => `${new Date(label).getFullYear()}年 ${new Date(label).getMonth() + 1}月`}
                      formatter={(value, name, item) => {
                          const { salesActual, salesTarget, over, shortfall } = item.payload as any;
                          const renderItem = (label: string, value: string | number) => (
                             <div className="flex w-full items-center justify-between text-xs"><span>{label}</span><span className="font-bold">{value}</span></div>
                          );
                          switch (item.dataKey) {
                              case 'base': return renderItem("実績 / 目標", `${salesActual}M / ${salesTarget}M`);
                              case 'over': if (over > 0) return renderItem("超過達成", `${over}M`); return null;
                              case 'shortfall': if (shortfall > 0 && salesActual > 0) return renderItem("不足分", `${shortfall}M`); return null;
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

function TargetAndActualLineChart({ chartData }: { chartData: ChartData[] }) {
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

    return (
        <ChartContainer config={lineChartConfig} className="h-full w-full">
            <ComposedChart data={processedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${new Date(value).getMonth() + 1}月`} tick={{ fontSize: 10 }} />
                <YAxis unit="M" tick={{ fontSize: 10 }} />
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
                                           <div className="flex justify-between"><span>実績:</span><span className="font-bold ml-2">{salesActual}M</span></div>
                                           <div className="flex justify-between"><span>目標:</span><span className="font-bold ml-2">{salesTarget}M</span></div>
                                        </div>
                                    );
                                }
                                 if (name === 'target' && !hasActual) {
                                     return (
                                       <div className="flex justify-between"><span>目標:</span><span className="font-bold ml-2">{salesTarget}M</span></div>
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

function TeamGoalBarChart({ chartData, unit }: { chartData: ChartData[], unit?: string }) {
  return (
    <ChartContainer config={teamGoalChartConfig} className="h-full w-full">
      <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${new Date(value).getMonth() + 1}月`} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} unit={unit} />
        <Tooltip content={<ChartTooltipContent />} />
        <ChartLegend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        <Bar dataKey="actualValue" name="実績" fill="var(--color-actualValue)" />
        <Bar dataKey="targetValue" name="目標" fill="var(--color-targetValue)" />
      </ComposedChart>
    </ChartContainer>
  );
}

function TeamGoalLineChart({ chartData, unit }: { chartData: ChartData[], unit?: string }) {
  return (
    <ChartContainer config={teamGoalChartConfig} className="h-full w-full">
      <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${new Date(value).getMonth() + 1}月`} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} unit={unit} />
        <Tooltip content={<ChartTooltipContent />} />
        <ChartLegend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        <Line type="monotone" dataKey="actualValue" name="実績" stroke="var(--color-actualValue)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ChartContainer>
  );
}

function TeamGoalComposedChart({ chartData, unit }: { chartData: ChartData[], unit?: string }) {
  return (
    <ChartContainer config={teamGoalChartConfig} className="h-full w-full">
      <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${new Date(value).getMonth() + 1}月`} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 10 }} unit={unit} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" />
        <Tooltip content={<ChartTooltipContent />} />
        <ChartLegend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        <Bar yAxisId="left" dataKey="actualValue" name="実績" fill="var(--color-actualValue)" />
        <Bar yAxisId="left" dataKey="targetValue" name="目標" fill="var(--color-targetValue)" />
        <Line yAxisId="right" type="monotone" dataKey="achievementRate" name="達成率" stroke="var(--color-achievementRate)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ChartContainer>
  );
}


interface WidgetPreviewProps {
    widget: Goal;
    chartData: ChartData[];
}

export default function WidgetPreview({ widget, chartData }: WidgetPreviewProps) {

    if (widget.scope === 'team') {
        switch(widget.chartType) {
            case 'donut':
                return <DonutChartWidget widget={widget} />;
            case 'bar':
                return <TeamGoalBarChart chartData={chartData} unit={widget.unit} />;
            case 'line':
                return <TeamGoalLineChart chartData={chartData} unit={widget.unit} />;
            case 'composed':
                return <TeamGoalComposedChart chartData={chartData} unit={widget.unit} />;
        }
    }

    if (widget.scope === 'company') {
        if (widget.kpi === 'sales_revenue') {
            switch (widget.chartType) {
                case 'composed': return <ActualSalesComposedChart chartData={chartData} />;
                case 'bar': return <ActualSalesBarChart chartData={chartData} />;
                case 'line': return <TargetAndActualLineChart chartData={chartData} />;
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
