
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
  ReferenceLine,
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
  salesActual: { label: '実績', color: 'hsl(var(--primary))' },
  salesTarget: { label: '目標', color: 'hsl(var(--secondary))' },
  achievementRate: { label: '達成率', color: 'hsl(24.6 95% 53.1%)' }, // using orange-ish color
  overAchievement: { label: '超過分', color: 'hsl(var(--destructive))' },
  shortfall: { label: '不足分', color: 'hsl(var(--secondary))' },
};


function ActualSalesComposedChart({ chartData }: { chartData: ChartData[] }) {
    if (!chartData || chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">データがありません</div>;
    }
    
    const processedData = useMemo(() => {
        return chartData.map(d => {
            const hasActual = d.salesActual > 0;
            if (hasActual) {
                return {
                    ...d,
                    base: Math.min(d.salesActual, d.salesTarget),
                    over: d.salesActual > d.salesTarget ? d.salesActual - d.salesTarget : 0,
                    shortfall: 0,
                    targetOnly: 0,
                }
            }
            // No actual data, show target only
            return {
                ...d,
                base: 0,
                over: 0,
                shortfall: d.salesTarget,
                targetOnly: d.salesTarget,
            }
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
                  content={<ChartTooltipContent 
                    formatter={(value, name, props) => {
                      if (name === 'targetOnly') return null;
                      const { payload } = props;
                      if (name === 'base' && payload.over > 0) return `${payload.salesTarget}M (目標達成)`;
                      if (name === 'base' && payload.salesActual > 0) return `${payload.salesActual}M`;
                      if (name === 'over') return `${payload.salesActual}M`;
                      if (name === 'achievementRate') return `${value}%`;
                      return `${value}M`;
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                         return `${new Date(label).getFullYear()}年 ${new Date(label).getMonth() + 1}月`;
                      }
                      return label;
                    }}
                  />} 
                />
                <ChartLegend content={<ChartLegendContent />} />

                <Bar dataKey="base" name="実績" fill="var(--color-salesActual)" yAxisId="left" stackId="a" />
                <Bar dataKey="over" name="超過達成" fill="var(--color-overAchievement)" yAxisId="left" stackId="a" />
                <Bar dataKey="targetOnly" name="目標" fill="var(--color-salesTarget)" yAxisId="left" stackId="a" />
                
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
