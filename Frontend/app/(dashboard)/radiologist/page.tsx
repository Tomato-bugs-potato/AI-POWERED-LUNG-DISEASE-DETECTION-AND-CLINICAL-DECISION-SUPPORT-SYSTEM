'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Upload, Activity, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store';
import { Case, CaseStatus, UrgencyLevel } from '@/types';
import api from '@/lib/api';

const fetchRecentCases = async (): Promise<Case[]> => {
    try {
        const response = await api.get('/cases', { params: { status: 'Pending_Review,In_Review' } });
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        return data.map((c: any) => ({
            case_id: c.case_id,
            patient_id: c.patient_id,
            status: c.status,
            priority: c.priority || 'Non-Critical',
            upload_date: c.created_at || c.updated_at || new Date().toISOString(),
            image: c.images?.[0] || { image_id: '', file_url: '', upload_date: '', format: 'DICOM' },
        }));
    } catch {
        return [];
    }
};

const fetchAllCases = async (): Promise<Case[]> => {
    try {
        const response = await api.get('/cases');
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        return data.map((c: any) => ({
            case_id: c.case_id,
            patient_id: c.patient_id,
            status: c.status,
            priority: c.priority || 'Non-Critical',
            upload_date: c.created_at || c.updated_at || new Date().toISOString(),
            image: c.images?.[0] || { image_id: '', file_url: '', upload_date: '', format: 'DICOM' },
        }));
    } catch {
        return [];
    }
};

const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
        case 'Pending_Review': return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Pending</Badge>;
        case 'In_Review': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">In Review</Badge>;
        case 'Ready_for_Diagnosis': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Ready for Doctor</Badge>;
        default: return <Badge variant="outline">{status.replace('_', ' ')}</Badge>;
    }
};

const getPriorityBadge = (priority: UrgencyLevel) => {
    if (priority === 'Critical') {
        return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-0">Critical</Badge>;
    }
    return <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Routine</Badge>;
};

export default function RadiologistDashboard() {
    const { user } = useAuthStore();

    const { data: cases = [], isLoading: casesLoading } = useQuery({
        queryKey: ['radiologist-recent-cases'],
        queryFn: fetchRecentCases,
        refetchInterval: 30000,
    });

    const { data: allCases = [], isLoading: statsLoading } = useQuery({
        queryKey: ['radiologist-all-cases'],
        queryFn: fetchAllCases,
        refetchInterval: 30000,
    });

    const isLoading = casesLoading || statsLoading;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingCount = allCases.filter(c => c.status === 'Pending_Review').length;
    const inReviewCount = allCases.filter(c => c.status === 'In_Review').length;
    const completedTodayCount = allCases.filter(c => {
        const uploadDate = new Date(c.upload_date);
        return (c.status === 'Ready_for_Diagnosis' || c.status === 'Completed') && uploadDate >= today;
    }).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Welcome, {user?.name || 'Radiologist'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Here is the overview of your current queue.</p>
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href="/radiologist/upload">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload New X-ray
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Pending Review</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Cases awaiting review</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">In Review</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{inReviewCount}</div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Currently being reviewed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Completed Today</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{completedTodayCount}</div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Sent to doctor today</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Cases Queue</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : cases.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 font-medium rounded-tl-lg">Case ID</th>
                                        <th scope="col" className="px-4 py-3 font-medium">Patient ID</th>
                                        <th scope="col" className="px-4 py-3 font-medium">Uploaded At</th>
                                        <th scope="col" className="px-4 py-3 font-medium">Status</th>
                                        <th scope="col" className="px-4 py-3 font-medium">Priority</th>
                                        <th scope="col" className="px-4 py-3 font-medium rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {cases.map((c) => (
                                        <tr key={c.case_id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{c.case_id}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.patient_id}</td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                {format(new Date(c.upload_date), 'MMM d, h:mm a')}
                                            </td>
                                            <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                                            <td className="px-4 py-3">{getPriorityBadge(c.priority)}</td>
                                            <td className="px-4 py-3">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/radiologist/cases/${c.case_id}`}>
                                                        Review
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                <CheckCircle2 className="h-6 w-6 text-gray-400" />
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">All caught up</h3>
                            <p className="text-sm text-gray-500 mt-1">No pending cases in the queue.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
