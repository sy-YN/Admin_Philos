
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
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { Widget } from '@/app/dashboard/dashboard/page';

export type ChartData = {
    month: string;
    salesActual: number;
    salesTarget: number;
    achievementRate: number;
}

export const salesChartConfig = {
  salesActual: { label: '実績(達成)', color: 'hsl(var(--primary))' },
  salesTarget: { label: '目標', color: 'hsl(var(--secondary))' },
  achievementRate: { label: '達成率', color: 'hsl(38 92% 50%)' },
  overAchievement: { label: '実績(超過)', color: 'hsl(var(--destructive))' },
  shortfall: { label: '目標(不足分)', color: 'hsl(var(--primary))',
  },
};


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
                                return renderItem("実績 / 目標", `${salesActual}M / ${salesTarget}M`);
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
                        { value: '実績(未達/達成)', type: 'square', color: salesChartConfig.salesActual.color },
                        { value: '実績(超過)', type: 'square', color: salesChartConfig.overAchievement.color },
                        { value: '目標(不足分)', type: 'square', color: salesChartConfig.shortfall.color },
                        { value: '達成率', type: 'line', color: salesChartConfig.achievementRate.color },
                      ]} 
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
        <ComposedChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={isDonut ? 40 : 0}>
              {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
              ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Legend wrapperStyle={{ fontSize: '10px' }}/>
        </ComposedChart>
    </ChartContainer>
  );
}


interface WidgetPreviewProps {
    widget: Widget;
    chartData: ChartData[];
}

export default function WidgetPreview({ widget, chartData }: WidgetPreviewProps) {
    
    if (widget.kpi === 'sales_revenue' && widget.chartType === 'composed') {
      return <ActualSalesComposedChart chartData={chartData} />;
    }

    switch (widget.chartType) {
        case 'bar':
          return <BarChartPreview />;
        case 'line':
          return <LineChartPreview />;
        case 'pie':
          return <PieChartPreview />;
        case 'donut':
          return <PieChartPreview isDonut />;
        case 'composed':
           return <ActualSalesComposedChart chartData={chartData} />;
        default:
          return <BarChartPreview />;
      }
}
