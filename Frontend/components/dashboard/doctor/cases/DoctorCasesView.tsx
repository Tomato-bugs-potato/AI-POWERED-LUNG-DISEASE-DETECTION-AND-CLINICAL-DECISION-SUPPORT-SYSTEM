'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { formatDateLocale } from '@/lib/date';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, FileQuestion } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CaseStatusBadge } from '@/components/shared/CaseStatusBadge';
import { Case, CaseStatus, UrgencyLevel } from '@/types';
import api from '@/lib/api';

interface DoctorCasesViewProps {
    initialCases: Case[];
}

const fetchDoctorQueue = async (): Promise<Case[]> => {
    try {
        const response = await api.get('/cases');
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        return data.map((c: any) => ({
            case_id: c.case_id,
            patient_id: c.patient_id,
            status: c.status as CaseStatus,
            priority: (c.priority || 'Non_Critical') as UrgencyLevel,
            upload_date: c.created_at || c.updated_at || new Date().toISOString(),
            image: c.images?.[0] || { image_id: '', file_url: '', upload_date: '', format: 'DICOM' as const },
        })).sort((a: Case, b: Case) => {
            if (a.status === 'Ready_for_Diagnosis' && b.status !== 'Ready_for_Diagnosis') return -1;
            if (a.status !== 'Ready_for_Diagnosis' && b.status === 'Ready_for_Diagnosis') return 1;
            if (a.priority === 'Critical' && b.priority !== 'Critical') return -1;
            if (a.priority !== 'Critical' && b.priority === 'Critical') return 1;
            return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
        });
    } catch {
        return [];
    }
};

export function DoctorCasesView({ initialCases }: DoctorCasesViewProps) {
    const [page, setPage] = React.useState(1);
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [urgencyFilter, setUrgencyFilter] = React.useState<string>('all');
    const [search, setSearch] = React.useState('');
    const [dateRange, setDateRange] = React.useState<{ from?: Date, to?: Date }>({});
    const itemsPerPage = 25;

    const { data: cases = initialCases, isLoading } = useQuery({
        queryKey: ['doctor-queue'],
        queryFn: fetchDoctorQueue,
        initialData: initialCases,
    });

    const filteredCases = cases.filter(c => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (urgencyFilter !== 'all' && c.priority !== urgencyFilter) return false;
        if (search && !c.patient_id.toLowerCase().includes(search.toLowerCase()) && !c.case_id.toLowerCase().includes(search.toLowerCase())) return false;
        if (dateRange.from && new Date(c.upload_date) < dateRange.from) return false;
        if (dateRange.to && new Date(c.upload_date) > dateRange.to) return false;
        return true;
    });

    const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
    const paginatedCases = filteredCases.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-teal-50/50 flex items-center justify-center border border-teal-100/50 shadow-sm">
                        <FileQuestion className="h-6 w-6 text-[#3DA1A3]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-inter">
                            Diagnosis Queue
                        </h1>
                        <p className="text-slate-500 dark:text-gray-400 mt-1 font-inter text-sm font-medium">
                            Review AI predictions and radiologist annotations for final diagnosis.
                        </p>
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-none rounded-none bg-transparent dark:bg-transparent overflow-hidden">
                <CardContent className="p-0 space-y-4">
                    <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                        <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                            <div className="relative flex-1 md:max-w-md group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#3DA1A3] transition-colors" />
                                <Input
                                    className="pl-10 h-11 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus-visible:ring-1 focus-visible:ring-black/5"
                                    placeholder="Search by Patient ID or Case ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[160px] bg-white border-gray-200 h-10 font-inter font-medium rounded-xl">
                                        <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="font-inter bg-white">
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="Ready_for_Diagnosis">Pending</SelectItem>
                                        <SelectItem value="Diagnosed">Diagnosed</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                                    <SelectTrigger className="w-[160px] bg-white border-gray-200 h-10 font-inter font-medium rounded-xl">
                                        <SelectValue placeholder="Urgency" />
                                    </SelectTrigger>
                                    <SelectContent className="font-inter bg-white">
                                        <SelectItem value="all">All Urgency</SelectItem>
                                        <SelectItem value="Critical">Critical</SelectItem>
                                        <SelectItem value="Non_Critical">Non-Critical</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="min-w-[200px] justify-start text-left font-inter font-medium h-10 border-slate-200 bg-white hover:bg-slate-50 rounded-lg">
                                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                            {dateRange.from ? (
                                                dateRange.to ? (
                                                    <span className="text-slate-700">
                                                        {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700">{format(dateRange.from, "MMM dd, yyyy")}</span>
                                                )
                                            ) : (
                                                <span className="text-slate-400">Filter By Date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-slate-200 shadow-xl" align="end" sideOffset={10}>
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={{ from: dateRange.from, to: dateRange.to }}
                                            onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                                            numberOfMonths={2}
                                            className="rounded-lg font-inter"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-teal-600 font-inter font-semibold hover:bg-teal-50 transition-colors"
                            onClick={() => { setStatusFilter('all'); setUrgencyFilter('all'); setSearch(''); setDateRange({}); setPage(1); }}
                        >
                            Clear Filters
                        </Button>
                    </div>

                    <div className="relative min-h-[500px]">
                        {isLoading && !initialCases ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-md z-20">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#3DA1A3]"></div>
                                    <p className="text-sm font-medium text-[#3DA1A3] animate-pulse">Fetching cases...</p>
                                </div>
                            </div>
                        ) : filteredCases.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                                <div className="mx-auto w-24 h-24 rounded-3xl bg-teal-50/50 flex items-center justify-center mb-6 border border-teal-100/30">
                                    <FileQuestion className="h-10 w-10 text-teal-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 font-inter">No cases found</h3>
                                <p className="mt-2 text-slate-500 max-w-sm font-inter text-sm leading-relaxed">
                                    We couldn't find any cases matching your current filter criteria. Try adjusting your search or category filters.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-sm text-left border-collapse border-spacing-0">
                                    <thead className="text-[10px] text-black uppercase bg-gray-200 font-black tracking-widest border-b border-gray-200">
                                        <tr className="divide-x divide-gray-100">
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Patient Information</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Ready Since</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Status</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100 text-center">Urgency</th>
                                            <th scope="col" className="px-4 py-3.5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paginatedCases.map((c) => (
                                            <tr
                                                key={c.case_id}
                                                className={`bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-none divide-x divide-gray-100 ${c.priority === 'Critical' && c.status === 'Ready_for_Diagnosis' ? 'bg-red-50/30' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-black dark:text-gray-100 leading-tight">
                                                            {c.patient_id}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                            {c.case_id}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 font-bold text-[10px]">
                                                    {formatDateLocale(c.upload_date)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <CaseStatusBadge status={c.status} />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {c.priority === 'Critical' ? (
                                                        <Badge variant="outline" className="rounded-md px-2 py-0 border-none font-black text-[9px] uppercase bg-red-100 text-red-700">
                                                            Critical
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="rounded-md px-2 py-0 border-none font-black text-[9px] uppercase bg-gray-100 text-gray-600">Routine</Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        className={`font-bold text-[11px] rounded-full px-5 h-8 text-white ${c.status === 'Ready_for_Diagnosis'
                                                                ? (c.priority === 'Critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1C2222] hover:bg-[#334155]')
                                                                : 'bg-gray-400 hover:bg-gray-500'
                                                            }`}
                                                    >
                                                        <Link href={`/doctor/cases/${c.case_id}`}>
                                                            {c.status === 'Ready_for_Diagnosis' ? 'Diagnose' : 'View Details'}
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

                    {filteredCases.length > 0 && (
                        <div className="px-4 py-4 flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-500 font-inter">
                                Showing <span className="text-slate-900 font-bold">{((page - 1) * itemsPerPage) + 1}</span> to <span className="text-slate-900 font-bold">{Math.min(page * itemsPerPage, filteredCases.length)}</span> of <span className="text-slate-900 font-bold">{filteredCases.length}</span> recorded cases
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
