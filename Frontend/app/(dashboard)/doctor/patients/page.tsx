'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Users, ChevronLeft, ChevronRight, FileQuestion, FileDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Patient, PatientSex } from '@/types';
import api from '@/lib/api';
import { toast } from 'sonner';

// Extend Patient type for the list view to include some aggregate data
interface PatientListItem extends Patient {
    full_name: string;
    contact_number: string;
    created_at: string;
    last_visit_date: string;
    total_cases: number;
    active_cases: number;
}

const fetchPatients = async (): Promise<PatientListItem[]> => {
    try {
        const response = await api.get('/patients');
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        return data.map((p: any) => ({
            patient_id: p.patient_id,
            full_name: p.full_name || p.name || `Patient ${p.patient_id}`,
            age: p.age || 0,
            sex: (p.sex || 'Unknown') as PatientSex,
            contact_number: '-',
            consent_given: p.consent_given ?? true,
            created_at: p.created_at || p.registration_date || new Date().toISOString(),
            last_visit_date: p.last_visit_date || p.created_at || new Date().toISOString(),
            total_cases: p.total_cases || 0,
            active_cases: p.active_cases || 0,
            registration_date: p.registration_date || p.created_at,
        })).sort((a: PatientListItem, b: PatientListItem) => new Date(b.last_visit_date).getTime() - new Date(a.last_visit_date).getTime());
    } catch {
        return [];
    }
};

function PatientsDirectoryContent() {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('q') || '';

    const [search, setSearch] = React.useState(initialSearch);
    const [page, setPage] = React.useState(1);
    const itemsPerPage = 20;

    const { data: patients = [], isLoading } = useQuery({
        queryKey: ['patients-directory'],
        queryFn: fetchPatients,
    });

    const filteredPatients = patients.filter(p => {
        if (!search) return true;
        const s = search.toLowerCase();
        return p.full_name.toLowerCase().includes(s) ||
            p.patient_id.toLowerCase().includes(s) ||
            (p.contact_number && p.contact_number.includes(s));
    });

    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const paginatedPatients = filteredPatients.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Sync search input from URL on mount
    React.useEffect(() => {
        if (initialSearch) {
            setSearch(initialSearch);
        }
    }, [initialSearch]);

    const handleExportCSV = async () => {
        try {
            const params: Record<string, string> = {};
            if (search) params.patient_id = search;
            const response = await api.get('/patients/search/export/csv', { params, responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'patients.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Patient list exported successfully');
        } catch {
            toast.error('Failed to export patient list');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-teal-50/50 flex items-center justify-center border border-teal-100/50 shadow-sm">
                        <Users className="h-6 w-6 text-[#3DA1A3]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-inter">
                            Patient Directory
                        </h1>
                        <p className="text-slate-500 dark:text-gray-400 mt-1 font-inter text-sm font-medium">
                            Search and manage patient records and clinical histories.
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    className="h-10 border-slate-200/60 font-inter font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-600 transition-colors shadow-sm"
                >
                    <FileDown className="mr-2 h-4 w-4" /> Export records (CSV)
                </Button>
            </div>

            <Card className="border-none shadow-none rounded-none bg-transparent dark:bg-transparent overflow-hidden">
                <CardContent className="p-0 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:max-w-xl group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3DA1A3] transition-colors" />
                            <Input
                                className="pl-10 h-11 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus-visible:ring-1 focus-visible:ring-black/5"
                                placeholder="Search by names, Patient ID, or clinical markers..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
                            <span className="text-sm font-bold text-slate-900 font-inter tracking-tight">
                                {filteredPatients.length}
                            </span>
                            <span className="text-xs font-semibold text-slate-400 font-inter uppercase tracking-wider">
                                Patients Found
                            </span>
                        </div>
                    </div>

                    <div className="relative min-h-[500px]">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-md z-20">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#3DA1A3]"></div>
                                    <p className="text-sm font-medium text-[#3DA1A3] animate-pulse font-inter">Syncing records...</p>
                                </div>
                            </div>
                        ) : filteredPatients.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                                <div className="mx-auto w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center mb-6 border border-slate-100/30">
                                    <FileQuestion className="h-10 w-10 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 font-inter">No results found</h3>
                                <p className="mt-2 text-slate-500 max-w-sm font-inter text-sm leading-relaxed">
                                    No patient records match the search criteria for "<span className="text-slate-900 font-bold">{search}</span>".
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-sm text-left border-collapse border-spacing-0">
                                    <thead className="text-[10px] text-black uppercase bg-gray-200 font-black tracking-widest border-b border-gray-200">
                                        <tr className="divide-x divide-gray-100">
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Full Name & Identification</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Demographics</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Recent Activity</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100 text-center">Case Volume</th>
                                            <th scope="col" className="px-4 py-3.5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paginatedPatients.map((p) => (
                                            <tr key={p.patient_id} className="bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-none divide-x divide-gray-100">
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-black dark:text-gray-100 leading-tight">
                                                            {p.full_name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                            ID: {p.patient_id}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="rounded-md px-2 py-0 border-none font-black text-[9px] uppercase bg-gray-100 text-gray-600">
                                                            {p.sex}
                                                        </Badge>
                                                        <span className="text-gray-500 font-bold text-[10px]">
                                                            {p.age} Years
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 font-bold text-[10px]">
                                                    {format(new Date(p.last_visit_date), 'MMM d, yyyy')}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <span className="font-bold text-black text-sm">
                                                            {p.total_cases}
                                                        </span>
                                                        {p.active_cases > 0 && (
                                                            <Badge variant="outline" className="rounded-md px-2 py-0 border-none font-black text-[9px] uppercase bg-red-100 text-red-700">
                                                                {p.active_cases} Action Needed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button asChild size="sm" className="font-bold text-[11px] rounded-full px-5 h-8 bg-[#1C2222] hover:bg-[#334155] text-white">
                                                        <Link href={`/doctor/patients/${p.patient_id}`}>
                                                            Manage Profile
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {filteredPatients.length > 0 && (
                        <div className="px-4 py-4 flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-500 font-inter">
                                Showing <span className="text-slate-900 font-bold">{((page - 1) * itemsPerPage) + 1}</span> to <span className="text-slate-900 font-bold">{Math.min(page * itemsPerPage, filteredPatients.length)}</span> of <span className="text-slate-900 font-bold">{filteredPatients.length}</span> listed patients
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-3 border-slate-200 font-inter font-bold text-slate-700 hover:bg-white rounded-lg"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1 text-[#3DA1A3]" /> Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-3 border-slate-200 font-inter font-bold text-slate-700 hover:bg-white rounded-lg"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next <ChevronRight className="h-4 w-4 ml-1 text-[#3DA1A3]" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function PatientsDirectoryPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <PatientsDirectoryContent />
        </React.Suspense>
    );
}
