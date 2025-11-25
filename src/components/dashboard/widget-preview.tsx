
'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart,
  BarChart,
  LineChart,
  PieChart,
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

export const salesChartConfig = {
  salesActual: { label: '実績', color: 'hsl(var(--primary))' },
  salesTarget: { label: '目標', color: 'hsl(var(--secondary))' },
  achievementRate: { label: '達成率', color: 'hsl(20.2 90.5% 48.4%)' }, // using yellow-ish color
};

function ActualSalesComposedChart({ chartData }: { chartData: ChartData[] }) {
    if (!chartData || chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">データがありません</div>;
    }
    
    const processedData = useMemo(() => {
        return chartData.map(d => ({
            ...d,
            displayTarget: d.salesTarget,
            // Create segments for the stacked bar
            base: Math.min(d.salesActual, d.salesTarget),
            over: d.salesActual > d.salesTarget ? d.salesActual - d.salesTarget : 0,
        }));
    }, [chartData]);


    return (
        <ChartContainer config={salesChartConfig} className="h-full w-full">
            <ComposedChart accessibilityLayer data={processedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `${new Date(value).getMonth() + 1}月`} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" tick={{ fontSize: 10 }} unit="M" />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(20.2 90.5% 48.4%)" tick={{ fontSize: 10 }} unit="%" />
                <Tooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                
                <Bar dataKey="salesTarget" name="目標" fill="var(--color-salesTarget)" yAxisId="left" radius={[4, 4, 0, 0]} />
                <Bar dataKey="base" name="実績 (達成)" stackId="a" fill="var(--color-salesActual)" yAxisId="left" />
                <Bar dataKey="over" name="実績 (超過)" stackId="a" fill="hsl(var(--destructive))" yAxisId="left" />

                <Line type="monotone" dataKey="achievementRate" stroke="var(--color-achievementRate)" yAxisId="right" dot={false} unit="%" name="達成率" />
            </ComposedChart>
        </ChartContainer>
    );
}

function BarChartPreview() {
  return (
    <ChartContainer config={{value: {label: 'Value', color: 'hsl(var(--primary))'}}} className="h-full w-full">
      <BarChart data={previewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <Bar dataKey="value" fill="hsl(var(--primary))" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
        <YAxis tick={{ fontSize: 10 }}/>
        <Tooltip content={<ChartTooltipContent />} />
      </BarChart>
    </ChartContainer>
  );
}

function LineChartPreview() {
  return (
     <ChartContainer config={{value: {label: 'Value', color: 'hsl(var(--primary))'}}} className="h-full w-full">
        <LineChart data={previewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
          <YAxis tick={{ fontSize: 10 }}/>
          <Tooltip content={<ChartTooltipContent />} />
        </LineChart>
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
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={isDonut ? 40 : 0}>
              {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
              ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Legend wrapperStyle={{ fontSize: '10px' }}/>
        </PieChart>
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
