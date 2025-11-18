
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
} from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { Widget } from '@/app/dashboard/dashboard/page';

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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))'];

export const salesChartConfig = {
  salesActual: { label: '実績', color: 'hsl(var(--primary))' },
  salesTarget: { label: '目標', color: 'hsl(var(--primary) / 0.3)' },
  overachievement: { label: '目標超過', color: 'hsl(var(--destructive))' },
  achievementRate: { label: '達成率', color: 'hsl(var(--primary))' },
};

function ActualSalesComposedChart({ chartData }: { chartData: any[] }) {
    if (!chartData || chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">データがありません</div>;
    }
    
    const processedData = useMemo(() => {
        return chartData.map(d => {
            const { salesTarget, salesActual } = d;
            const overachievement = salesActual > salesTarget ? salesActual - salesTarget : 0;
            const base = salesActual > salesTarget ? salesTarget : salesActual;
            const shortfall = salesActual < salesTarget ? salesTarget - salesActual : 0;

            return {
                ...d,
                base,
                overachievement,
                shortfall,
            };
        });
    }, [chartData]);


    return (
        <ChartContainer config={salesChartConfig} className="h-full w-full">
            <ComposedChart accessibilityLayer data={processedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" tick={{ fontSize: 10 }} unit="M" />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--destructive))" tick={{ fontSize: 10 }} unit="%" />
                <Tooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                
                {/* Base bar (actual sales up to the target) */}
                <Bar yAxisId="left" dataKey="base" stackId="a" fill="var(--color-salesActual)" radius={[4, 4, 0, 0]} unit="M" name="実績" />
                
                {/* Invisible bar to represent shortfall, making the total height reach the target */}
                <Bar yAxisId="left" dataKey="shortfall" stackId="a" fill="var(--color-salesTarget)" unit="M" name="目標" />

                {/* Overachievement part, stacked on top */}
                <Bar yAxisId="left" dataKey="overachievement" stackId="a" fill="var(--color-overachievement)" radius={[4, 4, 0, 0]} unit="M" name="目標超過" />

                <Line type="monotone" dataKey="achievementRate" stroke="var(--color-salesActual)" yAxisId="right" dot={false} unit="%" name="達成率" />
            </ComposedChart>
        </ChartContainer>
    );
}

function BarChartPreview() {
  return (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={previewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <Bar dataKey="value" fill="hsl(var(--primary))" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
        <YAxis tick={{ fontSize: 10 }}/>
        </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartPreview() {
  return (
     <ResponsiveContainer width="100%" height="100%">
        <LineChart data={previewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
        <YAxis tick={{ fontSize: 10 }}/>
        </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartPreview({ isDonut = false }: { isDonut?: boolean }) {
  return (
     <ResponsiveContainer width="100%" height="100%">
        <PieChart>
        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={isDonut ? 40 : 0}>
            {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
        </Pie>
        <Tooltip content={<ChartTooltipContent hideLabel />} />
        <Legend wrapperStyle={{ fontSize: '10px' }}/>
        </PieChart>
    </ResponsiveContainer>
  );
}


interface WidgetPreviewProps {
    widget: Widget;
    chartData: any[];
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
