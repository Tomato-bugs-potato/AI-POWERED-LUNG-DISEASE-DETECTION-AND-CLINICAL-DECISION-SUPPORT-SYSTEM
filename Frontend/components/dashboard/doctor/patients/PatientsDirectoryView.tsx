'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Users, ChevronLeft, ChevronRight, FileQuestion, FileDown, Filter, X, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Patient, PatientSex } from '@/types';
import api from '@/lib/api';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface PatientListItem extends Patient {
    full_name: string;
    contact_number: string;
    created_at: string;
    last_visit_date: string;
    total_cases: number;
    active_cases: number;
}

const fetchPatients = async (params: any): Promise<PatientListItem[]> => {
    try {
        const response = await api.get('/patients/search', { params });
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        return data.map((p: any) => ({
            patient_id: p.patient_id,
            full_name: p.full_name || p.name || `Patient ${p.patient_id?.substring(0, 8)}`,
            age: p.age || 0,
            sex: (p.sex || 'Unknown') as PatientSex,
            contact_number: '-',
            consent_given: p.consent_given ?? true,
            consent_recorded: p.consent_recorded ?? true,
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

interface PatientsDirectoryViewProps {
    initialData: PatientListItem[];
}

export function PatientsDirectoryView({ initialData }: PatientsDirectoryViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, setUser } = useAuthStore();

    // Filters State
    const [search, setSearch] = React.useState(searchParams.get('q') || '');
    const [minAge, setMinAge] = React.useState<string>(searchParams.get('minAge') || '');
    const [maxAge, setMaxAge] = React.useState<string>(searchParams.get('maxAge') || '');
    const [symptoms, setSymptoms] = React.useState<string[]>(searchParams.getAll('symptoms') || []);
    const [newSymptom, setNewSymptom] = React.useState('');

    const [page, setPage] = React.useState(1);
    const itemsPerPage = 20;

    const queryParams = React.useMemo(() => {
        const p: any = {
            skip: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
        };
        if (search) p.patient_id = search;
        if (minAge) p.min_age = parseInt(minAge);
        if (maxAge) p.max_age = parseInt(maxAge);
        if (symptoms.length > 0) p.symptoms = symptoms;
        return p;
    }, [search, minAge, maxAge, symptoms, page]);

    const { data: patients = initialData, isLoading, refetch } = useQuery({
        queryKey: ['patients-directory', queryParams],
        queryFn: () => fetchPatients(queryParams),
        initialData: page === 1 && !search && !minAge && !maxAge && symptoms.length === 0 ? initialData : undefined,
    });

    const handleAddSymptom = () => {
        if (newSymptom && !symptoms.includes(newSymptom)) {
            setSymptoms([...symptoms, newSymptom]);
            setNewSymptom('');
            setPage(1);
        }
    };

    const handleRemoveSymptom = (s: string) => {
        setSymptoms(symptoms.filter(item => item !== s));
        setPage(1);
    };

    const clearFilters = () => {
        setSearch('');
        setMinAge('');
        setMaxAge('');
        setSymptoms([]);
        setPage(1);
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/patients/search/export/csv', {
                params: queryParams,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `patients-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        className="h-10 border-slate-200/60 font-inter bg-white font-bold text-black hover:bg-teal-50 hover:text-teal-600 transition-colors shadow-sm rounded-xl"
                    >
                        <FileDown className="mr-2 h-4 w-4 " /> Export data
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-none rounded-none bg-transparent dark:bg-transparent overflow-hidden">
                <CardContent className="p-0 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:max-w-xl group flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3DA1A3] transition-colors" />
                                <Input
                                    className="pl-10 h-11 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus-visible:ring-1 focus-visible:ring-black/5"
                                    placeholder="Search by Patient ID or name identifier..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={`h-11 px-4 rounded-xl border-gray-200 ${(minAge || maxAge || symptoms.length > 0) ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white'}`}>
                                        <Filter className="h-4 w-4 mr-2" />
                                        Advanced Filters
                                        {(minAge || maxAge || symptoms.length > 0) && (
                                            <Badge className="ml-2 bg-teal-600 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                                                {(minAge ? 1 : 0) + (maxAge ? 1 : 0) + symptoms.length}
                                            </Badge>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl border-gray-100" align="end">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-sm text-slate-900 tracking-tight">Search Criteria</h4>
                                            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs font-bold text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                                                Reset
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Age Range</label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Min"
                                                    type="number"
                                                    value={minAge}
                                                    onChange={(e) => { setMinAge(e.target.value); setPage(1); }}
                                                    className="h-9 rounded-lg text-xs"
                                                />
                                                <span className="text-slate-300">-</span>
                                                <Input
                                                    placeholder="Max"
                                                    type="number"
                                                    value={maxAge}
                                                    onChange={(e) => { setMaxAge(e.target.value); setPage(1); }}
                                                    className="h-9 rounded-lg text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Symptoms (Array Filter)</label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Add symptom..."
                                                    value={newSymptom}
                                                    onChange={(e) => setNewSymptom(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSymptom()}
                                                    className="h-9 rounded-lg text-xs"
                                                />
                                                <Button size="sm" onClick={handleAddSymptom} className="h-9 w-9 p-0 bg-slate-900 rounded-lg">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {symptoms.map(s => (
                                                    <Badge key={s} className="bg-teal-50 text-teal-700 border-teal-100 flex items-center gap-1 hover:bg-teal-100 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                                        {s}
                                                        <button onClick={() => handleRemoveSymptom(s)} className="hover:text-teal-900">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                                {symptoms.length === 0 && <p className="text-[10px] text-slate-400 italic">No symptoms specified</p>}
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-full border border-slate-100 dark:border-zinc-800 shadow-sm">
                            <span className="text-sm font-bold text-slate-900 dark:text-white font-inter tracking-tight">
                                {patients.length}
                            </span>
                            <span className="text-xs font-semibold text-slate-400 dark:text-gray-500 font-inter uppercase tracking-wider">
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
                        ) : patients.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                                <div className="mx-auto w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center mb-6 border border-slate-100/30">
                                    <FileQuestion className="h-10 w-10 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 font-inter">No results found</h3>
                                <p className="mt-2 text-slate-500 max-w-sm font-inter text-sm leading-relaxed">
                                    No patient records match the current search criteria.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-sm text-left border-collapse border-spacing-0">
                                    <thead className="text-[10px] text-black uppercase bg-gray-200 font-black tracking-widest border-b border-gray-200">
                                        <tr className="divide-x divide-gray-100">
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Patient Identification</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Demographics</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Recent Activity</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100 text-center">Record Status</th>
                                            <th scope="col" className="px-4 py-3.5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {patients.map((p) => (
                                            <tr key={p.patient_id} className="bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-none divide-x divide-gray-100">
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-black dark:text-gray-100 leading-tight">
                                                            {p.full_name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                            UID: {p.patient_id?.substring(0, 18)}...
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
                                                            {p.total_cases} Cases
                                                        </span>
                                                        {p.active_cases > 0 && (
                                                            <Badge variant="outline" className="rounded-md px-2 py-0 border-none font-black text-[9px] uppercase bg-red-100 text-red-700">
                                                                {p.active_cases} Active
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button asChild size="sm" className="font-bold text-[11px] rounded-xl px-5 h-8 bg-slate-900 hover:bg-teal-700 text-white shadow-sm transition-all active:scale-95">
                                                        <Link href={`/${user?.role?.toLowerCase() === 'radiologist' ? 'radiologist' : 'doctor'}/patients/${p.patient_id}`}>
                                                            View Profile
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

                    <div className="px-4 py-4 flex items-center justify-between bg-white dark:bg-zinc-900 border-t border-gray-50 dark:border-zinc-800 rounded-b-3xl transition-colors">
                        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 font-inter">
                            Page <span className="text-slate-900 dark:text-white font-bold">{page}</span> — Showing up to <span className="text-slate-900 dark:text-white font-bold">{itemsPerPage}</span> records
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 border-slate-200 font-inter font-bold text-slate-700 hover:bg-white rounded-lg shadow-sm disabled:opacity-50"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1 text-[#3DA1A3]" /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 border-slate-200 font-inter font-bold text-slate-700 hover:bg-white rounded-lg shadow-sm disabled:opacity-50"
                                onClick={() => setPage(p => p + 1)}
                                disabled={patients.length < itemsPerPage || isLoading}
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1 text-[#3DA1A3]" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
