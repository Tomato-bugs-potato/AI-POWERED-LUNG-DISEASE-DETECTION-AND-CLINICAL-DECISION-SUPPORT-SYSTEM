'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Search,
    Activity,
    CheckCircle2,
    AlertTriangle,
    Stethoscope,
    Users,
    Timer,
    FileText,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store';
import { Case } from '@/types';
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

interface DoctorDashboardViewProps {
    initialData?: {
        pending: any[];
        completed: any[];
        total: number;
    };
}

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

// Diagnosis timestamp falls back gracefully so we never miss counts.
function diagnosisTimestamp(c: FullCase): string | undefined {
    return c.diagnosis?.diagnosed_at || c.updated_at || c.created_at || c.upload_date;
}

export function DoctorDashboardView({ initialData: _initialData }: DoctorDashboardViewProps) {
    const router = useRouter();
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [range, setRange] = React.useState<Range>('week');

    const { data: cases = [], isLoading } = useQuery({
        queryKey: ['doctor-cases'],
        queryFn: fetchAllCases,
        refetchInterval: 30000,
    });

    const stats = React.useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const awaiting = cases.filter((c) => c.status === 'Ready_for_Diagnosis');
        const criticalAwaiting = awaiting.filter((c) => c.priority === 'Critical');
        const diagnosed = cases.filter((c) => c.status === 'Diagnosed' || c.status === 'Completed');

        const diagnosedToday = diagnosed.filter((c) => {
            const ts = diagnosisTimestamp(c);
            return ts ? new Date(ts).getTime() >= startOfToday.getTime() : false;
        });

        const inWindow = diagnosed.filter((c) => withinRange(diagnosisTimestamp(c), range, now));

        const turnarounds: number[] = [];
        for (const c of inWindow) {
            const start = c.radiologist_review?.reviewed_at || c.updated_at;
            const end = c.diagnosis?.diagnosed_at;
            if (!start || !end) continue;
            const hrs = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
            if (hrs >= 0 && hrs < 24 * 30) turnarounds.push(hrs);
        }
        const avgTurnaroundHrs =
            turnarounds.length === 0
                ? null
                : turnarounds.reduce((s, x) => s + x, 0) / turnarounds.length;

        const uniquePatients = new Set(cases.map((c) => c.patient_id)).size;

        return {
            awaiting: awaiting.length,
            criticalAwaiting: criticalAwaiting.length,
            diagnosed: diagnosed.length,
            diagnosedToday: diagnosedToday.length,
            avgTurnaroundHrs,
            uniquePatients,
            totalCases: cases.length,
        };
    }, [cases, range]);

    const charts = React.useMemo(() => {
        const now = new Date();
        const days = range === 'today' ? 1 : range === 'week' ? 7 : 30;
        const buckets = dailyBuckets(days, now);
        for (const c of cases) bumpBucket(buckets, diagnosisTimestamp(c));
        const throughput = buckets.map((b) => ({ day: b.day, count: b.count }));

        const inWindow = cases.filter((c) => withinRange(diagnosisTimestamp(c), range, now));

        // Disease class distribution from confirmed diagnoses (preferred) or
        // AI top-1 prediction as a fallback for cases without a diagnosis yet.
        const diseaseCounts: Record<string, number> = {};
        for (const c of inWindow) {
            let key: string | null = null;
            if (c.diagnosis?.primary_diagnosis) {
                key = String(c.diagnosis.primary_diagnosis).replace('_', ' ');
            } else {
                const preds = c.inference_result?.predictions || [];
                if (preds.length > 0) {
                    const top = [...preds].sort((a, b) => b.confidence_score - a.confidence_score)[0];
                    key = String(top.disease_class).replace('_', ' ');
                }
            }
            if (key) diseaseCounts[key] = (diseaseCounts[key] || 0) + 1;
        }
        const diseases = Object.entries(diseaseCounts).map(([label, value]) => ({ label, value }));

        // Urgency mix of cases entering the doctor's queue in window.
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

        return { throughput, diseases, urgency };
    }, [cases, range]);

    const pendingQueue = React.useMemo(
        () =>
            cases
                .filter((c) => c.status === 'Ready_for_Diagnosis')
                .sort((a, b) => {
                    if (a.priority === 'Critical' && b.priority !== 'Critical') return -1;
                    if (a.priority !== 'Critical' && b.priority === 'Critical') return 1;
                    return new Date(b.updated_at || b.upload_date).getTime() - new Date(a.updated_at || a.upload_date).getTime();
                })
                .slice(0, 10),
        [cases],
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/doctor/patients?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Welcome, {user?.name || 'Doctor'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Diagnosis queue, throughput, and clinical breakdown.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Quick patient search..."
                            className="pl-9 bg-card border-border"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                    <RangeSelect value={range} onChange={setRange} />
                </div>
            </div>

            {/* KPI row */}
            <StatGrid cols={4}>
                <StatCard
                    label="Awaiting Diagnosis"
                    value={stats.awaiting}
                    sublabel="Ready for your review"
                    icon={<FileText className="h-5 w-5" />}
                    tone="warning"
                    loading={isLoading}
                />
                <StatCard
                    label="Critical Pending"
                    value={stats.criticalAwaiting}
                    sublabel="Top of triage"
                    icon={<AlertTriangle className="h-5 w-5" />}
                    tone="destructive"
                    loading={isLoading}
                />
                <StatCard
                    label="Diagnosed Today"
                    value={stats.diagnosedToday}
                    sublabel="Completed since midnight"
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    tone="success"
                    loading={isLoading}
                />
                <StatCard
                    label="Total Diagnoses"
                    value={stats.diagnosed}
                    sublabel="All time"
                    icon={<Stethoscope className="h-5 w-5" />}
                    tone="primary"
                    loading={isLoading}
                />
            </StatGrid>

            {/* Queue + sidebar — pulls the table up so it's the 3rd row, visible above the fold */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Needs Diagnosis queue */}
                <div className="bg-card text-card-foreground rounded-2xl border border-border p-5 shadow-sm lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-foreground">Needs Diagnosis</h2>
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/doctor/cases">View all</Link>
                        </Button>
                    </div>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : pendingQueue.length === 0 ? (
                        <div className="py-10 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
                                <CheckCircle2 className="h-5 w-5 text-success" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">All caught up</p>
                            <p className="mt-1 text-xs text-muted-foreground">No pending diagnoses in your queue.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs uppercase text-muted-foreground">
                                    <tr className="border-b border-border">
                                        <th className="px-3 py-2 font-semibold">Patient</th>
                                        <th className="px-3 py-2 font-semibold">Ready At</th>
                                        <th className="px-3 py-2 font-semibold">Urgency</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {pendingQueue.map((c) => (
                                        <tr
                                            key={c.case_id}
                                            className={`hover:bg-muted/40 ${c.priority === 'Critical' ? 'bg-destructive/5' : ''}`}
                                        >
                                            <td className="px-3 py-2 font-semibold text-foreground">
                                                {c.patient_id.substring(0, 8)}…
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {format(new Date(c.updated_at || c.upload_date), 'MMM d, h:mm a')}
                                            </td>
                                            <td className="px-3 py-2">
                                                {c.priority === 'Critical' ? (
                                                    <Badge className="bg-destructive/15 text-destructive border-0 font-bold rounded-full px-3">Critical</Badge>
                                                ) : c.priority === 'High' ? (
                                                    <Badge className="bg-warning/15 text-warning border-0 font-bold rounded-full px-3">High</Badge>
                                                ) : (
                                                    <Badge className="bg-muted text-muted-foreground border-0 font-bold rounded-full px-3">Routine</Badge>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    className={`rounded-full px-4 text-xs font-semibold ${
                                                        c.priority === 'Critical' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''
                                                    }`}
                                                >
                                                    <Link href={`/doctor/cases/${c.case_id}`}>Diagnose</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sidebar: compact secondary stats */}
                <div className="space-y-4">
                    <StatCard
                        compact
                        label="Avg Time to Diagnose"
                        value={
                            stats.avgTurnaroundHrs == null
                                ? '—'
                                : stats.avgTurnaroundHrs < 1
                                  ? `${Math.round(stats.avgTurnaroundHrs * 60)} min`
                                  : `${stats.avgTurnaroundHrs.toFixed(1)} hrs`
                        }
                        sublabel={`Review → diagnosis (${range === 'all' ? 'all time' : 'in window'})`}
                        icon={<Timer className="h-4 w-4" />}
                        tone="primary"
                        loading={isLoading}
                        deltaDirection="lower-is-better"
                    />
                    <StatCard
                        compact
                        label="Unique Patients"
                        value={stats.uniquePatients}
                        sublabel="In your case load"
                        icon={<Users className="h-4 w-4" />}
                        tone="default"
                        loading={isLoading}
                    />
                    <StatCard
                        compact
                        label="Cases In System"
                        value={stats.totalCases}
                        sublabel="All statuses"
                        icon={<Activity className="h-4 w-4" />}
                        tone="default"
                        loading={isLoading}
                    />
                </div>
            </div>

            {/* Charts — below the fold */}
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <AreaChartCard
                        title="Diagnoses Over Time"
                        subtitle={`Completed per day · ${range === 'all' ? 'last 30 days' : 'in window'}`}
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

            <BarChartCard
                title="Disease Class Distribution"
                subtitle="Confirmed diagnosis (falls back to AI top-1 for pending cases)"
                data={charts.diseases}
                loading={isLoading}
            />
        </div>
    );
}
