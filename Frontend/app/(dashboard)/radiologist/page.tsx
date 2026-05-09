'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Upload, Activity, Clock, CheckCircle2, AlertTriangle, Timer, FileImage, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store';
import { Case, CaseStatus, UrgencyLevel } from '@/types';
import api from '@/lib/api';
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

// API returns "Case-shaped" rows with nested objects we use for clinical
// stats below. fetchAllCases preserves the nested fields rather than
// flattening them.
type FullCase = Case & {
    created_at?: string;
    updated_at?: string;
};

const fetchAllCases = async (): Promise<FullCase[]> => {
    try {
        const response = await api.get('/cases');
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        return data.map((c: any) => ({
            case_id: c.case_id,
            patient_id: c.patient_id,
            status: c.status,
            priority: c.priority || 'Non_Critical',
            upload_date: c.created_at || c.updated_at || new Date().toISOString(),
            created_at: c.created_at,
            updated_at: c.updated_at,
            image: c.images?.[0] || { image_id: '', file_url: '', upload_date: '', format: 'DICOM' },
            inference_result: c.inference_result,
            radiologist_review: c.radiologist_review,
            diagnosis: c.diagnosis,
        })) as FullCase[];
    } catch {
        return [];
    }
};

const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
        case 'Pending_Review':
            return <Badge className="bg-muted text-muted-foreground border-0 font-bold rounded-full px-3">Pending</Badge>;
        case 'In_Review':
            return <Badge className="bg-primary/15 text-primary border-0 font-bold rounded-full px-3">In Review</Badge>;
        case 'Ready_for_Diagnosis':
            return <Badge className="bg-warning/15 text-warning border-0 font-bold rounded-full px-3">Ready for Doctor</Badge>;
        default:
            return <Badge className="bg-muted text-muted-foreground border-0 font-bold rounded-full px-3">{status.replace('_', ' ')}</Badge>;
    }
};

const getPriorityBadge = (priority: UrgencyLevel) => {
    if (priority === 'Critical') {
        return <Badge className="bg-destructive/15 text-destructive border-0 font-bold rounded-full px-3">Critical</Badge>;
    }
    if (priority === 'High') {
        return <Badge className="bg-warning/15 text-warning border-0 font-bold rounded-full px-3">High</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground border-0 font-bold rounded-full px-3">Routine</Badge>;
};

// When a case has been reviewed, that's the canonical completion timestamp.
// Fall back to updated_at, then upload_date so we never miss a count.
function completionTimestamp(c: FullCase): string | undefined {
    return c.radiologist_review?.reviewed_at || c.updated_at || c.created_at || c.upload_date;
}

export default function RadiologistDashboard() {
    const { user } = useAuthStore();
    const [range, setRange] = React.useState<Range>('week');

    const { data: cases = [], isLoading } = useQuery({
        queryKey: ['radiologist-cases'],
        queryFn: fetchAllCases,
        refetchInterval: 30000,
    });

    // -------- KPI calculations --------
    const stats = React.useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const inWindow = cases.filter((c) =>
            withinRange(completionTimestamp(c), range, now),
        );

        const pending = cases.filter((c) => c.status === 'Pending_Review');
        const inReview = cases.filter((c) => c.status === 'In_Review');
        const criticalPending = pending.filter((c) => c.priority === 'Critical');

        const completedToday = cases.filter((c) => {
            if (c.status !== 'Ready_for_Diagnosis' && c.status !== 'Completed' && c.status !== 'Diagnosed') return false;
            const ts = completionTimestamp(c);
            if (!ts) return false;
            return new Date(ts).getTime() >= startOfToday.getTime();
        });

        // Average turnaround in HOURS, restricted to the selected window.
        const turnarounds: number[] = [];
        for (const c of inWindow) {
            const start = c.created_at || c.upload_date;
            const end = c.radiologist_review?.reviewed_at;
            if (!start || !end) continue;
            const hrs = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
            if (hrs >= 0 && hrs < 24 * 30) turnarounds.push(hrs);
        }
        const avgTurnaroundHrs =
            turnarounds.length === 0
                ? null
                : turnarounds.reduce((s, x) => s + x, 0) / turnarounds.length;

        return {
            pending: pending.length,
            inReview: inReview.length,
            criticalPending: criticalPending.length,
            completedToday: completedToday.length,
            avgTurnaroundHrs,
        };
    }, [cases, range]);

    // -------- Chart data --------
    const charts = React.useMemo(() => {
        const now = new Date();
        const days = range === 'today' ? 1 : range === 'week' ? 7 : range === 'month' ? 30 : 30;
        const buckets = dailyBuckets(days, now);
        for (const c of cases) bumpBucket(buckets, c.created_at || c.upload_date);
        const throughput = buckets.map((b) => ({ day: b.day, count: b.count }));

        // Urgency mix in current window (based on creation date).
        const inWindow = cases.filter((c) =>
            withinRange(c.created_at || c.upload_date, range, now),
        );
        const urgencyCounts = { Critical: 0, High: 0, 'Non_Critical': 0 };
        for (const c of inWindow) {
            const k = c.priority as keyof typeof urgencyCounts;
            if (k in urgencyCounts) urgencyCounts[k]++;
        }
        const urgency = [
            { label: 'Critical', value: urgencyCounts.Critical },
            { label: 'High', value: urgencyCounts.High },
            { label: 'Routine', value: urgencyCounts['Non_Critical'] },
        ];

        // Disease class distribution from inference top-1 predictions.
        const diseaseCounts: Record<string, number> = {};
        for (const c of inWindow) {
            const preds = c.inference_result?.predictions || [];
            if (preds.length === 0) continue;
            const top = [...preds].sort((a, b) => b.confidence_score - a.confidence_score)[0];
            const key = String(top.disease_class).replace('_', ' ');
            diseaseCounts[key] = (diseaseCounts[key] || 0) + 1;
        }
        const diseases = Object.entries(diseaseCounts).map(([label, value]) => ({ label, value }));

        // AI agreement: review.edited_predictions vs inference predictions.
        // Agreement = same top class kept; Edited = radiologist changed predictions.
        let agreed = 0;
        let edited = 0;
        for (const c of inWindow) {
            const review = c.radiologist_review;
            const orig = c.inference_result?.predictions || [];
            if (!review || orig.length === 0) continue;
            const ed = review.edited_predictions || [];
            const sameLength = ed.length === orig.length;
            const sameTopClass =
                sameLength &&
                [...orig].sort((a, b) => b.confidence_score - a.confidence_score)[0]?.disease_class ===
                    [...ed].sort((a, b) => b.confidence_score - a.confidence_score)[0]?.disease_class;
            if (sameLength && sameTopClass) agreed++;
            else edited++;
        }
        const agreement = [
            { label: 'Agreed with AI', value: agreed },
            { label: 'Edited findings', value: edited },
        ];

        return { throughput, urgency, diseases, agreement };
    }, [cases, range]);

    const recentQueue = React.useMemo(
        () =>
            cases
                .filter((c) => c.status === 'Pending_Review' || c.status === 'In_Review')
                .sort((a, b) => {
                    if (a.priority === 'Critical' && b.priority !== 'Critical') return -1;
                    if (a.priority !== 'Critical' && b.priority === 'Critical') return 1;
                    return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
                })
                .slice(0, 8),
        [cases],
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Welcome, {user?.name || 'Radiologist'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Queue depth, turnaround time, and clinical breakdown.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <RangeSelect value={range} onChange={setRange} />
                    <Button asChild className="rounded-full px-5 font-semibold">
                        <Link href="/radiologist/upload">
                            <Upload className="mr-2 h-4 w-4" /> Upload X-ray
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPI row */}
            <StatGrid cols={4}>
                <StatCard
                    label="Pending Review"
                    value={stats.pending}
                    sublabel="Cases awaiting first review"
                    icon={<Clock className="h-5 w-5" />}
                    tone="warning"
                    loading={isLoading}
                />
                <StatCard
                    label="Critical Pending"
                    value={stats.criticalPending}
                    sublabel="Urgent triage queue"
                    icon={<AlertTriangle className="h-5 w-5" />}
                    tone="destructive"
                    loading={isLoading}
                />
                <StatCard
                    label="Active Reviews"
                    value={stats.inReview}
                    sublabel="Currently in your queue"
                    icon={<Activity className="h-5 w-5" />}
                    tone="primary"
                    loading={isLoading}
                />
                <StatCard
                    label="Completed Today"
                    value={stats.completedToday}
                    sublabel="Sent to doctor today"
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    tone="success"
                    loading={isLoading}
                />
            </StatGrid>

            {/* Queue + sidebar — pulls the table up so it's the 3rd row, visible above the fold */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Recent queue */}
                <div className="bg-card text-card-foreground rounded-2xl border border-border p-5 shadow-sm lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-foreground">Recent Cases Queue</h2>
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/radiologist/cases">View all</Link>
                        </Button>
                    </div>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : recentQueue.length === 0 ? (
                        <div className="py-10 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
                                <CheckCircle2 className="h-5 w-5 text-success" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">All caught up</p>
                            <p className="mt-1 text-xs text-muted-foreground">No pending cases in the queue.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs uppercase text-muted-foreground">
                                    <tr className="border-b border-border">
                                        <th className="px-3 py-2 font-semibold">Patient</th>
                                        <th className="px-3 py-2 font-semibold">Uploaded</th>
                                        <th className="px-3 py-2 font-semibold">Status</th>
                                        <th className="px-3 py-2 font-semibold">Priority</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {recentQueue.map((c) => (
                                        <tr key={c.case_id} className="hover:bg-muted/40">
                                            <td className="px-3 py-2 font-semibold text-foreground">
                                                {c.patient_id?.substring(0, 8)}…
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {format(new Date(c.upload_date), 'MMM d, h:mm a')}
                                            </td>
                                            <td className="px-3 py-2">{getStatusBadge(c.status)}</td>
                                            <td className="px-3 py-2">{getPriorityBadge(c.priority)}</td>
                                            <td className="px-3 py-2 text-right">
                                                <Button asChild size="sm" className="rounded-full px-4 text-xs font-semibold">
                                                    <Link href={`/radiologist/cases/${c.case_id}`}>Review</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sidebar: compact secondary stats + urgency donut */}
                <div className="space-y-4">
                    <StatCard
                        compact
                        label="Avg Turnaround"
                        value={
                            stats.avgTurnaroundHrs == null
                                ? '—'
                                : stats.avgTurnaroundHrs < 1
                                  ? `${Math.round(stats.avgTurnaroundHrs * 60)} min`
                                  : `${stats.avgTurnaroundHrs.toFixed(1)} hrs`
                        }
                        sublabel={`Upload → review (${range === 'all' ? 'all time' : 'in window'})`}
                        icon={<Timer className="h-4 w-4" />}
                        tone="primary"
                        loading={isLoading}
                        deltaDirection="lower-is-better"
                    />
                    <StatCard
                        compact
                        label="AI Agreement"
                        value={
                            charts.agreement[0].value + charts.agreement[1].value === 0
                                ? '—'
                                : `${Math.round(
                                      (charts.agreement[0].value /
                                          (charts.agreement[0].value + charts.agreement[1].value)) *
                                          100,
                                  )}%`
                        }
                        sublabel="You kept the AI's findings"
                        icon={<Stethoscope className="h-4 w-4" />}
                        tone="primary"
                        loading={isLoading}
                    />
                    <StatCard
                        compact
                        label="Total Cases"
                        value={cases.length}
                        sublabel="All time"
                        icon={<FileImage className="h-4 w-4" />}
                        tone="default"
                        loading={isLoading}
                    />
                </div>
            </div>

            {/* Charts — below the fold */}
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <AreaChartCard
                        title="Case Volume"
                        subtitle={`New uploads per day · ${range === 'all' ? 'last 30 days' : 'in window'}`}
                        data={charts.throughput}
                        loading={isLoading}
                    />
                </div>
                <DonutChartCard
                    title="Urgency Mix"
                    subtitle="Triage priority in window"
                    data={charts.urgency}
                    loading={isLoading}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <BarChartCard
                    title="Disease Distribution"
                    subtitle="AI top-1 prediction per case (in window)"
                    data={charts.diseases}
                    loading={isLoading}
                />
                <DonutChartCard
                    title="AI Agreement"
                    subtitle="Reviews where you kept vs edited the AI's findings"
                    data={charts.agreement}
                    loading={isLoading}
                />
            </div>
        </div>
    );
}
