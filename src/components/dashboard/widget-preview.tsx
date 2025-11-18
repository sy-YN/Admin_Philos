
'use client';

import React from 'react';
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
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
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
  salesActual: { label: "実績", color: "hsl(var(--primary))" },
  salesTarget: { label: "目標", color: "hsl(var(--primary) / 0.3)" },
  achievementRate: { label: "達成率", color: "hsl(var(--destructive))" },
};

function ActualSalesComposedChart({ chartData }: { chartData: any[] }) {
    if (!chartData || chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">データがありません</div>;
    }
    return (
        <ChartContainer config={salesChartConfig} className="h-full w-full">
            <ComposedChart accessibilityLayer data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--destructive))" tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="salesTarget" yAxisId="left" fill="var(--color-salesTarget)" radius={4} />
                <Bar dataKey="salesActual" yAxisId="left" fill="var(--color-salesActual)" radius={4} />
                <Line type="monotone" dataKey="achievementRate" yAxisId="right" stroke="var(--color-achievementRate)" strokeWidth={2} dot={false} />
            </ComposedChart>
        </ChartContainer>
    );
}

function BarChartPreview() {
  return (
    <BarChart data={previewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
      <Bar dataKey="value" fill="hsl(var(--primary))" />
      <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
      <YAxis tick={{ fontSize: 10 }}/>
    </BarChart>
  );
}

function LineChartPreview() {
  return (
    <LineChart data={previewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" />
       <XAxis dataKey="name" tick={{ fontSize: 10 }}/>
      <YAxis tick={{ fontSize: 10 }}/>
    </LineChart>
  );
}

function PieChartPreview({ isDonut = false }: { isDonut?: boolean }) {
  return (
    <PieChart>
      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={isDonut ? 40 : 0}>
        {pieData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
       <Tooltip content={<ChartTooltipContent hideLabel />} />
      <Legend wrapperStyle={{ fontSize: '10px' }}/>
    </PieChart>
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
        default:
          return <BarChartPreview />;
      }
}
