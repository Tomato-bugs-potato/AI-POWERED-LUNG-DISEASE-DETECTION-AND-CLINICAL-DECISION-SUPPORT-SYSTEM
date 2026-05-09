'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    Users,
    Activity,
    HardDrive,
    Cpu,
    AlertCircle,
    Search,
    ShieldCheck,
    UserCheck,
    FileText,
    Server,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    StatCard,
    StatGrid,
    RangeSelect,
    AreaChartCard,
    BarChartCard,
    DonutChartCard,
    Range,
    withinRange,
    dailyBuckets,
    bumpBucket,
} from '@/components/dashboard/_kit';

// What the server-side fetcher passes in. Kept loose so the existing
// page.tsx contract still works without changes.
export interface AdminStats {
    systemHealth?: number;
    uptime?: string;
    totalUsers: number;
    activeToday: number;
    casesProcessed: number;
    storageUsedGB?: number;
    storageTotalGB?: number;
    modelAccuracy?: string;
    recentLogs: AdminLog[];
    errorCount: number;
    // Optional raw data so charts can compute their own series.
    users?: any[];
    logs?: any[];
    cases?: any[];
}

interface AdminLog {
    id: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    time: string;
    /** ISO timestamp if available; falls back to `time`. */
    iso?: string;
}

const LEVEL_BADGE: Record<AdminLog['level'], string> = {
    info: 'bg-primary/15 text-primary',
    warning: 'bg-warning/15 text-warning',
    error: 'bg-destructive/15 text-destructive',
};

export function AdminDashboardView({ stats }: { stats: AdminStats }) {
    const [range, setRange] = React.useState<Range>('week');
    const [searchQuery, setSearchQuery] = React.useState('');

    // Derive series from raw lists when provided; otherwise stay empty.
    const charts = React.useMemo(() => {
        const now = new Date();
        const days = range === 'today' ? 1 : range === 'week' ? 7 : 30;

        const caseList = stats.cases || [];
        const logList = stats.logs || [];
        const userList = stats.users || [];

        // Daily case-creation throughput.
        const caseBuckets = dailyBuckets(days, now);
        for (const c of caseList) bumpBucket(caseBuckets, c.created_at || c.updated_at);
        const caseThroughput = caseBuckets.map((b) => ({ day: b.day, count: b.count }));

        // Daily errors.
        const errorBuckets = dailyBuckets(days, now);
        for (const log of logList) {
            const action = String(log.action_type || '').toLowerCase();
            const isError = action.includes('fail') || action.includes('error');
            if (!isError) continue;
            bumpBucket(errorBuckets, log.timestamp);
        }
        const errorTrend = errorBuckets.map((b) => ({ day: b.day, count: b.count }));

        // Users by role.
        const roleCounts: Record<string, number> = {};
        for (const u of userList) {
            const role = u.role || 'Unknown';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        }
        const usersByRole = Object.entries(roleCounts).map(([label, value]) => ({ label, value }));

        // Cases by status (limited to selected window so it reflects "current load").
        const statusCounts: Record<string, number> = {};
        for (const c of caseList) {
            if (!withinRange(c.created_at || c.updated_at, range, now)) continue;
            const status = String(c.status || 'Unknown').replace(/_/g, ' ');
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        }
        const casesByStatus = Object.entries(statusCounts).map(([label, value]) => ({ label, value }));

        return { caseThroughput, errorTrend, usersByRole, casesByStatus };
    }, [stats, range]);

    const errorsInWindow = React.useMemo(() => {
        const now = new Date();
        return (stats.logs || []).filter((log: any) => {
            const action = String(log.action_type || '').toLowerCase();
            const isError = action.includes('fail') || action.includes('error');
            return isError && withinRange(log.timestamp, range, now);
        }).length;
    }, [stats.logs, range]);

    const storagePct =
        stats.storageTotalGB && stats.storageUsedGB != null
            ? Math.min(100, Math.round((stats.storageUsedGB / stats.storageTotalGB) * 100))
            : null;

    const filteredLogs = stats.recentLogs.filter((l) =>
        searchQuery ? l.message.toLowerCase().includes(searchQuery.toLowerCase()) : true,
    );

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">System Overview</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Workload, errors, storage, and user composition.
                    </p>
                </div>
                <RangeSelect value={range} onChange={setRange} />
            </div>

            {/* KPI row */}
            <StatGrid cols={4}>
                <StatCard
                    label="Total Users"
                    value={stats.totalUsers}
                    sublabel="Across all roles"
                    icon={<Users className="h-5 w-5" />}
                    tone="primary"
                />
                <StatCard
                    label="Active Users"
                    value={stats.activeToday}
                    sublabel="Status = Active"
                    icon={<UserCheck className="h-5 w-5" />}
                    tone="success"
                />
                <StatCard
                    label="Cases Processed"
                    value={stats.casesProcessed}
                    sublabel="All time"
                    icon={<FileText className="h-5 w-5" />}
                    tone="default"
                />
                <StatCard
                    label="Errors In Window"
                    value={errorsInWindow}
                    sublabel="From audit log"
                    icon={<AlertCircle className="h-5 w-5" />}
                    tone={errorsInWindow > 0 ? 'destructive' : 'success'}
                    deltaDirection="lower-is-better"
                />
            </StatGrid>

            {/* Audit activity + infra sidebar — pulls the log feed up to row 3 */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Recent logs */}
                <div className="bg-card text-card-foreground rounded-2xl border border-border p-5 shadow-sm lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-foreground">Recent Audit Activity</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">Most recent log entries</p>
                        </div>
                        <div className="relative w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter logs..."
                                className="pl-9 bg-card border-border"
                            />
                        </div>
                    </div>

                    {filteredLogs.length === 0 ? (
                        <div className="py-10 text-center">
                            <Server className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No log entries match.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {filteredLogs.map((log) => (
                                <li key={log.id} className="flex items-center justify-between gap-3 py-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge className={`${LEVEL_BADGE[log.level]} border-0 font-bold uppercase rounded-full px-2 text-[10px]`}>
                                                {log.level}
                                            </Badge>
                                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                            <p className="truncate text-sm text-foreground">{log.message}</p>
                                        </div>
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">{log.time}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-4 flex justify-end">
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/admin/logs">View all logs</Link>
                        </Button>
                    </div>
                </div>

                {/* Sidebar: compact infra cards */}
                <div className="space-y-4">
                    <div className="bg-card text-card-foreground rounded-2xl border border-border p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">System Health</p>
                                <p className="mt-1 text-xl font-bold text-foreground">
                                    {stats.systemHealth != null ? `${stats.systemHealth}%` : '—'}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Uptime {stats.uptime ?? '—'}
                                </p>
                            </div>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        {stats.systemHealth != null && (
                            <Progress value={stats.systemHealth} className="mt-3 h-2" />
                        )}
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl border border-border p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Storage</p>
                                <p className="mt-1 text-xl font-bold text-foreground">
                                    {stats.storageUsedGB != null && stats.storageTotalGB
                                        ? `${stats.storageUsedGB} / ${stats.storageTotalGB} GB`
                                        : '—'}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {storagePct != null ? `${storagePct}% used` : 'Not reported'}
                                </p>
                            </div>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                                <HardDrive className="h-4 w-4" />
                            </div>
                        </div>
                        {storagePct != null && <Progress value={storagePct} className="mt-3 h-2" />}
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl border border-border p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Model Performance</p>
                                <p className="mt-1 text-xl font-bold text-foreground">
                                    {stats.modelAccuracy ?? '—'}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Top-1 accuracy</p>
                            </div>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                                <Cpu className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts — below the fold */}
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <AreaChartCard
                        title="Case Throughput"
                        subtitle={`New cases per day · ${range === 'all' ? 'last 30 days' : 'in window'}`}
                        data={charts.caseThroughput}
                    />
                </div>
                <DonutChartCard
                    title="Users by Role"
                    subtitle="Active accounts in the system"
                    data={charts.usersByRole}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <BarChartCard
                    title="Cases by Status"
                    subtitle="Pipeline stage in window"
                    data={charts.casesByStatus}
                />
                <AreaChartCard
                    title="Error Trend"
                    subtitle="Failed actions per day"
                    data={charts.errorTrend}
                />
            </div>
        </div>
    );
}
