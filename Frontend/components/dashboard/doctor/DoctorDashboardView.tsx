'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Search, Activity, CheckCircle2, TrendingUp, AlertCircle, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store';
import api from '@/lib/api';

interface DoctorDashboardViewProps {
    initialData: {
        pending: any[];
        completed: any[];
        total: number;
    };
}

const fetchDoctorDashboardData = async () => {
    try {
        const response = await api.get('/cases', { params: { limit: 100 } });
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);

        const allCases = data.map((c: any) => ({
            case_id: c.case_id,
            patient_id: c.patient_id,
            status: c.status,
            priority: c.priority || 'Non_Critical',
            updated_at: c.updated_at || c.created_at || new Date().toISOString(),
        }));

        const pending = allCases
            .filter((c: any) => c.status === 'Ready_for_Diagnosis' || c.status === 'In_Review')
            .sort((a: any, b: any) => {
                if (a.priority === 'Critical' && b.priority !== 'Critical') return -1;
                if (a.priority !== 'Critical' && b.priority === 'Critical') return 1;
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });
        const completed = allCases.filter((c: any) => c.status === 'Diagnosed' || c.status === 'Completed');

        return { pending, completed, total: allCases.length };
    } catch {
        return { pending: [], completed: [], total: 0 };
    }
};

export function DoctorDashboardView({ initialData }: DoctorDashboardViewProps) {
    const router = useRouter();
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = React.useState('');

    const { data } = useQuery({
        queryKey: ['doctor-dashboard-data'],
        queryFn: fetchDoctorDashboardData,
        initialData,
        refetchInterval: 30000, 
    });

    const pendingCases = data?.pending || [];
    const completedCases = data?.completed || [];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/doctor/patients?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-black dark:text-white">
                        Welcome, {user?.name || 'Dr. Endashaw'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Here is your diagnosis queue and daily summary.</p>
                </div>

                <form onSubmit={handleSearch} className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Quick patient search..."
                        className="pl-9 bg-white/80 dark:bg-zinc-900 border-none shadow-sm rounded-xl focus:ring-teal-500/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            <div className="bg-[#F5F8F8] dark:bg-zinc-900 rounded-[2rem] p-6 lg:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[1.3rem] font-extrabold text-[#334155] dark:text-gray-100">Clinical Summary</h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card 1: Pending Diagnosis */}
                    <div className="card-push-container">

                        <div className="card-premium-pocket p-7 flex-1 flex flex-col">
                            <div className="mb-6">
                                <p className="text-base font-bold text-[#1C2222] dark:text-gray-100 mb-3">Pending Diagnosis</p>
                                <Select defaultValue="today">
                                    <SelectTrigger className="w-fit bg-white dark:bg-zinc-900 font-bold border-none text-[#1C2222] rounded-full px-4 h-8 shadow-sm text-[11px] hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-none shadow-xl bg-white">
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="week">Week</SelectItem>
                                        <SelectItem value="month">Month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4 flex-1 flex flex-col">
                                <div className="sub-card-white flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Awaiting Review</span>
                                        <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{pendingCases.length}</span>
                                    </div>
                                </div>

                                <div className="sub-card-white flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Critical Cases</span>
                                        <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{pendingCases.filter((c: any) => c.priority === 'Critical').length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Completed Today */}
                    <div className="card-push-container">


                        <div className="card-premium-pocket p-7 flex-1 flex flex-col">
                            <div className="mb-6">
                                <p className="text-base font-bold text-[#1C2222] dark:text-gray-100 mb-3">Completed Cases</p>
                                <Select defaultValue="today">
                                    <SelectTrigger className="w-fit bg-white dark:bg-zinc-900 font-bold border-none text-[#1C2222] rounded-full px-4 h-8 shadow-sm text-[11px] hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-none shadow-xl bg-white">
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="week">Week</SelectItem>
                                        <SelectItem value="month">Month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4 flex-1 flex flex-col">
                                <div className="sub-card-white flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Diagnosed</span>
                                        <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{completedCases.length}</span>
                                    </div>
                                </div>

                                <div className="sub-card-white flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Total Completed</span>
                                        <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                            <Activity className="h-3.5 w-3.5 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{completedCases.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Total Cases */}
                    <div className="card-push-container">


                        <div className="card-premium-pocket p-7 flex-1 flex flex-col">
                            <div className="mb-6">
                                <p className="text-base font-bold text-[#1C2222] dark:text-gray-100 mb-3">Case Overview</p>
                                <Select defaultValue="week">
                                    <SelectTrigger className="w-fit bg-white dark:bg-zinc-900 font-bold border-none text-[#1C2222] rounded-full px-4 h-8 shadow-sm text-[11px] hover:bg-gray-50 transition-colors focus:ring-0 focus:ring-offset-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-none shadow-xl bg-white">
                                        <SelectItem value="week">This Week</SelectItem>
                                        <SelectItem value="last-week">Last Week</SelectItem>
                                        <SelectItem value="month">Month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4 flex-1 flex flex-col">
                                <div className="sub-card-white flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Total In System</span>
                                        <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                            <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{initialData.total || 0}</span>
                                    </div>
                                </div>

                                <div className="sub-card-white flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Patients Seen</span>
                                        <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                            <Users className="h-3.5 w-3.5 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{completedCases.length + pendingCases.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

             <div className="bg-[#F5F8F8] dark:bg-zinc-900 rounded-[2rem] p-6 lg:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[1.3rem] font-extrabold text-[#334155] dark:text-gray-100">Needs Diagnosis</h2>
                </div>


                {pendingCases && pendingCases.length > 0 ? (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-sm text-left border-collapse border-spacing-0">
                            <thead className="text-[10px] text-black uppercase bg-gray-200 font-black tracking-widest border-b border-gray-200">
                                <tr className="divide-x divide-gray-100">
                                    <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Patient ID</th>
                                    <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Department</th>
                                    <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Date Ready</th>
                                    <th scope="col" className="px-4 py-3.5 border-r border-gray-100 text-center">Urgency</th>
                                    <th scope="col" className="px-4 py-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pendingCases.map((c: any) => (
                                    <tr
                                        key={c.case_id}
                                        className={`bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-none divide-x divide-gray-100 ${c.priority === 'Critical' ? 'bg-red-50/30 dark:bg-red-950/20' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-black dark:text-gray-100 leading-tight">{c.patient_id.substring(0, 8)}...</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 font-bold text-[10px]">Radiology Dept</td>
                                        <td className="px-4 py-3 text-gray-500 font-bold text-[10px]">
                                            {format(new Date(c.updated_at), 'h:mm a (MMM d)')}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {c.priority === 'Critical' ? (
                                                <Badge variant="outline" className="rounded-md px-2 py-0 border-none font-black text-[9px] uppercase bg-red-100 text-red-700">
                                                    Critical
                                                </Badge>
                                            ) : c.priority === 'High' ? (
                                                <Badge variant="outline" className="rounded-md px-2 py-0 border-none font-black text-[9px] uppercase bg-orange-100 text-orange-700">
                                                    Urgent
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="rounded-md px-2 py-0 border-none font-black text-[9px] uppercase bg-gray-100 text-gray-600">
                                                    Routine
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button asChild className={`font-bold text-[11px] rounded-full px-5 h-8 ${c.priority === 'Critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1C2222] hover:bg-[#334155]'} text-white`}>
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
                    <div className="bg-white rounded-[1.5rem] p-8 shadow-sm text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                        </div>
                        <h3 className="text-sm font-extrabold text-[#334155] dark:text-white">All caught up</h3>
                        <p className="text-sm text-gray-500 mt-1">No pending diagnoses in your queue.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
