'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Activity, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store';
import { Case } from '@/types';
import api from '@/lib/api';

const fetchPendingDiagnosis = async (): Promise<Case[]> => {
    try {
        const response = await api.get('/cases', { params: { status: 'Ready_for_Diagnosis' } });
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        return data.map((c: any) => ({
            case_id: c.case_id,
            patient_id: c.patient_id,
            status: c.status,
            priority: c.priority || 'Non_Critical',
            upload_date: c.created_at || c.updated_at || new Date().toISOString(),
            image: c.images?.[0] || { image_id: '', file_url: '', upload_date: '', format: 'DICOM' },
            radiologist_review: c.radiologist_review || undefined,
        }));
    } catch {
        return [];
    }
};

export default function DoctorDashboard() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = React.useState('');

    const { data: cases, isLoading } = useQuery({
        queryKey: ['doctor-pending-cases'],
        queryFn: fetchPendingDiagnosis,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/doctor/patients?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Welcome, {user?.name || 'Dr. Endashaw'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Here is your diagnosis queue and daily summary.</p>
                </div>

                <form onSubmit={handleSearch} className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Input
                        placeholder="Quick patient search..."
                        className="pl-9 bg-white dark:bg-zinc-900"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-red-100 dark:border-red-900/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Pending Diagnosis</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{isLoading ? '...' : (cases?.length || 0)}</div>
                        <p className="text-xs text-red-600/80 font-medium mt-1">
                            {cases?.filter(c => c.priority === 'Critical').length || 0} critical cases
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Completed Today</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">14</div>
                        <p className="text-xs text-gray-500 mt-1">Average time: 4m 30s</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Total This Week</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">126</div>
                        <p className="text-xs text-blue-600 font-medium mt-1">+12% from last week</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Needs Diagnosis</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : cases && cases.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-900/50 border-b border-border">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 font-medium">Patient ID</th>
                                        <th scope="col" className="px-4 py-3 font-medium">Radiologist</th>
                                        <th scope="col" className="px-4 py-3 font-medium">Date Ready</th>
                                        <th scope="col" className="px-4 py-3 font-medium">Urgency</th>
                                        <th scope="col" className="px-4 py-3 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {cases.map((c) => (
                                        <tr
                                            key={c.case_id}
                                            className={`hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors group ${c.priority === 'Critical' ? 'bg-red-50/30 dark:bg-red-950/20' : ''}`}
                                        >
                                            <td className="px-4 py-4 font-medium text-gray-900 dark:text-gray-100">{c.patient_id}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">Dr. M. Abebe</td>
                                            <td className="px-4 py-4 text-gray-500 dark:text-gray-400">
                                                {c.radiologist_review ? format(new Date(c.radiologist_review.reviewed_at), 'h:mm a (MMM d)') : '-'}
                                            </td>
                                            <td className="px-4 py-4">
                                                {c.priority === 'Critical' ? (
                                                    <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-0 dark:bg-red-900/40 dark:text-red-300">
                                                        Critical
                                                    </Badge>
                                                ) : c.priority === 'High' ? (
                                                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300">
                                                        Urgent
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-500 dark:text-gray-400">Routine</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <Button asChild className={`font-medium ${c.priority === 'Critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                                    <Link href={`/doctor/cases/${c.case_id}`}>
                                                        Diagnose
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
                            <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">All caught up</h3>
                            <p className="text-sm text-gray-500 mt-1">No pending diagnoses in your queue.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
