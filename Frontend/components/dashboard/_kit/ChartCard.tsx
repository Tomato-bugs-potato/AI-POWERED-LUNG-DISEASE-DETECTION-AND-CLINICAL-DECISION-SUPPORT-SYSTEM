'use client';

import * as React from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const CHART_COLOR_VARS = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
];

function CardShell({
    title,
    subtitle,
    children,
    className,
    action,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                'bg-card text-card-foreground rounded-2xl border border-border p-5 shadow-sm',
                className,
            )}
        >
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground">{title}</h3>
                    {subtitle && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
                    )}
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

const tooltipContentStyle: React.CSSProperties = {
    backgroundColor: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
};
const tooltipItemStyle: React.CSSProperties = { color: 'hsl(var(--popover-foreground))' };

export interface AreaSeriesPoint {
    day: string;
    count: number;
}

export function AreaChartCard({
    title,
    subtitle,
    data,
    dataKey = 'count',
    xKey = 'day',
    height = 220,
    loading,
    action,
}: {
    title: string;
    subtitle?: string;
    data: AreaSeriesPoint[];
    dataKey?: string;
    xKey?: string;
    height?: number;
    loading?: boolean;
    action?: React.ReactNode;
}) {
    return (
        <CardShell title={title} subtitle={subtitle} action={action}>
            {loading ? (
                <Skeleton style={{ height }} className="w-full rounded-lg" />
            ) : (
                <ResponsiveContainer width="100%" height={height}>
                    <AreaChart data={data} margin={{ left: -10, right: 5, top: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLOR_VARS[0]} stopOpacity={0.4} />
                                <stop offset="100%" stopColor={CHART_COLOR_VARS[0]} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                            dataKey={xKey}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            stroke="hsl(var(--border))"
                            tickLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            stroke="hsl(var(--border))"
                            tickLine={false}
                            axisLine={false}
                            width={28}
                        />
                        <Tooltip contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} />
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={CHART_COLOR_VARS[0]}
                            strokeWidth={2}
                            fill="url(#areaFill)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </CardShell>
    );
}

export interface BarSeriesPoint {
    label: string;
    value: number;
}

export function BarChartCard({
    title,
    subtitle,
    data,
    height = 240,
    loading,
    action,
}: {
    title: string;
    subtitle?: string;
    data: BarSeriesPoint[];
    height?: number;
    loading?: boolean;
    action?: React.ReactNode;
}) {
    return (
        <CardShell title={title} subtitle={subtitle} action={action}>
            {loading ? (
                <Skeleton style={{ height }} className="w-full rounded-lg" />
            ) : (
                <ResponsiveContainer width="100%" height={height}>
                    <BarChart data={data} margin={{ left: -10, right: 5, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            stroke="hsl(var(--border))"
                            tickLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            stroke="hsl(var(--border))"
                            tickLine={false}
                            axisLine={false}
                            width={28}
                        />
                        <Tooltip contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {data.map((_, i) => (
                                <Cell key={i} fill={CHART_COLOR_VARS[i % CHART_COLOR_VARS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </CardShell>
    );
}

export interface DonutSlice {
    label: string;
    value: number;
}

export function DonutChartCard({
    title,
    subtitle,
    data,
    height = 240,
    loading,
    action,
}: {
    title: string;
    subtitle?: string;
    data: DonutSlice[];
    height?: number;
    loading?: boolean;
    action?: React.ReactNode;
}) {
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
        <CardShell title={title} subtitle={subtitle} action={action}>
            {loading ? (
                <Skeleton style={{ height }} className="w-full rounded-lg" />
            ) : total === 0 ? (
                <div
                    style={{ height }}
                    className="flex items-center justify-center text-sm text-muted-foreground"
                >
                    No data in selected window
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={height}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={2}
                            strokeWidth={2}
                            stroke="hsl(var(--card))"
                        >
                            {data.map((_, i) => (
                                <Cell key={i} fill={CHART_COLOR_VARS[i % CHART_COLOR_VARS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} />
                        <Legend
                            verticalAlign="bottom"
                            height={28}
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </CardShell>
    );
}
