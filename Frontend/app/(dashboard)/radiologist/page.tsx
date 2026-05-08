'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Upload, Activity, Clock, CheckCircle2, ArrowUpRight, Maximize2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
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
        case 'Pending_Review': return <Badge className="bg-[#1C2222]/10 text-[#1C2222] border-0 font-bold rounded-full px-3">Pending</Badge>;
        case 'In_Review': return <Badge className="bg-[#4BA0A2]/15 text-[#4BA0A2] border-0 font-bold rounded-full px-3">In Review</Badge>;
        case 'Ready_for_Diagnosis': return <Badge className="bg-amber-100 text-amber-700 border-0 font-bold rounded-full px-3">Ready for Doctor</Badge>;
        default: return <Badge className="bg-gray-100 text-gray-600 border-0 font-bold rounded-full px-3">{status.replace('_', ' ')}</Badge>;
    }
};

const getPriorityBadge = (priority: UrgencyLevel) => {
    if (priority === 'Critical') {
        return <Badge className="bg-red-100 text-red-700 border-0 font-bold rounded-full px-3">Critical</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-600 border-0 font-bold rounded-full px-3">Routine</Badge>;
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
            {/* ─── Header ─── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[#1C2222]">
                        Welcome, {user?.name || 'Radiologist'}
                    </h1>
                    <p className="text-[#1C2222]/40 mt-1 font-medium">Here is the overview of your current queue.</p>
                </div>
                <Button asChild className="bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-full px-6 font-bold shadow-lg">
                    <Link href="/radiologist/upload">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload New X-ray
                    </Link>
                </Button>
            </div>

            {/* ─── Statistical Summary (Inspiro Style) ─── */}
            <div>
                <h2 className="text-xl font-black text-[#1C2222] mb-4">Statistical Summary</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Pending Review Card */}
                    <div className="card-premium-pocket p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-extrabold text-[#1C2222]/70">Pending Review</h3>
                            <div className="w-9 h-9 rounded-full bg-[#A8D4D6]/60 flex items-center justify-center">
                                <ArrowUpRight className="w-4 h-4 text-[#1C2222]/60" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-white/80 text-xs font-bold text-[#1C2222]/50 border border-[#1C2222]/10">
                                Week ▿
                            </span>
                        </div>
                        <div className="sub-card-white !rounded-2xl">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#1C2222]/40">Cases awaiting review</span>
                                <Maximize2 className="w-3.5 h-3.5 text-[#1C2222]/20" />
                            </div>
                            <div className="flex items-center gap-2.5 mt-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                {statsLoading ? (
                                    <Skeleton className="h-8 w-16 rounded-xl" />
                                ) : (
                                    <span className="text-2xl font-black text-[#1C2222]">{pendingCount}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* In Review Card */}
                    <div className="card-premium-pocket p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-extrabold text-[#1C2222]/70">Active Reviews</h3>
                            <div className="w-9 h-9 rounded-full bg-[#A8D4D6]/60 flex items-center justify-center">
                                <ArrowUpRight className="w-4 h-4 text-[#1C2222]/60" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-white/80 text-xs font-bold text-[#1C2222]/50 border border-[#1C2222]/10">
                                Week ▿
                            </span>
                        </div>
                        <div className="sub-card-white !rounded-2xl">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#1C2222]/40">Currently being reviewed</span>
                                <Maximize2 className="w-3.5 h-3.5 text-[#1C2222]/20" />
                            </div>
                            <div className="flex items-center gap-2.5 mt-2">
                                <Activity className="w-4 h-4 text-[#4BA0A2]" />
                                {statsLoading ? (
                                    <Skeleton className="h-8 w-16 rounded-xl" />
                                ) : (
                                    <span className="text-2xl font-black text-[#1C2222]">{inReviewCount}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Completed Today Card */}
                    <div className="card-premium-pocket p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-extrabold text-[#1C2222]/70">Completed Today</h3>
                            <div className="w-9 h-9 rounded-full bg-[#A8D4D6]/60 flex items-center justify-center">
                                <ArrowUpRight className="w-4 h-4 text-[#1C2222]/60" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-white/80 text-xs font-bold text-[#1C2222]/50 border border-[#1C2222]/10">
                                Today ▿
                            </span>
                        </div>
                        <div className="sub-card-white !rounded-2xl">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#1C2222]/40">Sent to doctor today</span>
                                <Maximize2 className="w-3.5 h-3.5 text-[#1C2222]/20" />
                            </div>
                            <div className="flex items-center gap-2.5 mt-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                {statsLoading ? (
                                    <Skeleton className="h-8 w-16 rounded-xl" />
                                ) : (
                                    <span className="text-2xl font-black text-[#1C2222]">{completedTodayCount}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Cases Queue (Inspiro Table Style) ─── */}
            <div className="card-premium-pocket p-5 sm:p-8">
                <h2 className="text-lg font-extrabold text-[#1C2222] mb-5">Recent Cases Queue</h2>
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-xl" />
                        ))}
                    </div>
                ) : cases.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-[#1C2222]/40 uppercase font-bold">
                                <tr className="border-b border-[#1C2222]/5">
                                    <th scope="col" className="px-4 py-3">Case ID</th>
                                    <th scope="col" className="px-4 py-3">Patient ID</th>
                                    <th scope="col" className="px-4 py-3">Uploaded At</th>
                                    <th scope="col" className="px-4 py-3">Status</th>
                                    <th scope="col" className="px-4 py-3">Priority</th>
                                    <th scope="col" className="px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1C2222]/5">
                                {cases.map((c) => (
                                    <tr key={c.case_id} className="hover:bg-white/40 transition-colors">
                                        <td className="px-4 py-3 font-bold text-[#1C2222]">{c.case_id}</td>
                                        <td className="px-4 py-3 text-[#1C2222]/60 font-medium">{c.patient_id}</td>
                                        <td className="px-4 py-3 text-[#1C2222]/40 font-medium">
                                            {format(new Date(c.upload_date), 'MMM d, h:mm a')}
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                                        <td className="px-4 py-3">{getPriorityBadge(c.priority)}</td>
                                        <td className="px-4 py-3">
                                            <Button asChild size="sm" className="bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-full px-5 font-bold text-xs">
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
                        <div className="mx-auto w-14 h-14 rounded-full bg-[#4BA0A2]/15 flex items-center justify-center mb-3">
                            <CheckCircle2 className="h-6 w-6 text-[#4BA0A2]" />
                        </div>
                        <h3 className="text-sm font-extrabold text-[#1C2222]">All caught up</h3>
                        <p className="text-sm text-[#1C2222]/40 mt-1 font-medium">No pending cases in the queue.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
