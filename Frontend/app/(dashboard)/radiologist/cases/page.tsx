'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
    Search,
    Filter,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    FileQuestion
} from 'lucide-react';
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

const fetchCasesQueue = async (): Promise<Case[]> => {
    try {
        const response = await api.get('/cases');
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        return data.map((c: any) => ({
            case_id: c.case_id,
            patient_id: c.patient_id,
            status: c.status as CaseStatus,
            priority: (c.priority || 'Non-Critical') as UrgencyLevel,
            upload_date: c.created_at || c.updated_at || new Date().toISOString(),
            image: c.images?.[0] || { image_id: '', file_url: '', upload_date: '', format: 'DICOM' as const },
        })).sort((a: Case, b: Case) => {
            if (a.priority === 'Critical' && b.priority !== 'Critical') return -1;
            if (a.priority !== 'Critical' && b.priority === 'Critical') return 1;
            return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
        });
    } catch {
        return [];
    }
};

export default function CasesQueuePage() {
    const [page, setPage] = React.useState(1);
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [search, setSearch] = React.useState('');
    const [dateRange, setDateRange] = React.useState<{ from?: Date, to?: Date }>({});
    const itemsPerPage = 25;

    const { data: cases = [], isLoading } = useQuery({
        queryKey: ['cases-queue'],
        queryFn: fetchCasesQueue,
    });

    // Filter logic
    const filteredCases = cases.filter(c => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (search && !c.patient_id.toLowerCase().includes(search.toLowerCase()) && !c.case_id.toLowerCase().includes(search.toLowerCase())) return false;
        if (dateRange.from && new Date(c.upload_date) < dateRange.from) return false;
        if (dateRange.to && new Date(c.upload_date) > dateRange.to) return false;
        return true;
    });

    const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
    const paginatedCases = filteredCases.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[#1C2222] dark:text-white">
                        Cases Queue
                    </h1>
                    <p className="text-[#1C2222]/40 mt-1 font-medium">Review and manage patient X-ray cases.</p>
                </div>
            </div>

            <div className="card-premium-pocket p-4 sm:p-6 space-y-4">

                {/* Filters Bar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                className="pl-9 rounded-xl border-[#1C2222]/10 bg-white/60 focus:bg-white"
                                placeholder="Search Case or Patient ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] rounded-xl border-[#1C2222]/10">
                                <Filter className="mr-2 h-4 w-4 text-[#1C2222]/40" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="Pending_Review">Pending</SelectItem>
                                <SelectItem value="In_Review">In Review</SelectItem>
                                <SelectItem value="Ready_for_Diagnosis">Ready (Doctor)</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-[240px] justify-start text-left font-normal rounded-xl border-[#1C2222]/10">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Filter by date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={{ from: dateRange.from, to: dateRange.to }}
                                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        variant="ghost"
                        className="text-[#1C2222]/40 font-bold"
                        onClick={() => { setStatusFilter('all'); setSearch(''); setDateRange({}); setPage(1); }}
                    >
                        Clear Filters
                    </Button>
                </div>

                {/* Table */}
                <div className="border border-[#1C2222]/10 rounded-2xl overflow-hidden relative min-h-[400px]">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4BA0A2]"></div>
                        </div>
                    ) : filteredCases.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-[#4BA0A2]/15 flex items-center justify-center mb-4">
                                <FileQuestion className="h-8 w-8 text-[#4BA0A2]" />
                            </div>
                            <h3 className="text-lg font-extrabold text-[#1C2222] dark:text-gray-100">No cases found</h3>
                            <p className="mt-2 text-sm text-[#1C2222]/40 max-w-sm font-medium">
                                We couldn't find any cases matching your current filters. Try adjusting your search or clearing the filters.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-[#1C2222]/40 uppercase font-bold border-b border-[#1C2222]/5">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Case ID</th>
                                        <th scope="col" className="px-4 py-3">Patient ID</th>
                                        <th scope="col" className="px-4 py-3">Upload Date</th>
                                        <th scope="col" className="px-4 py-3">Status</th>
                                        <th scope="col" className="px-4 py-3">Priority</th>
                                        <th scope="col" className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1C2222]/5">
                                    {paginatedCases.map((c) => (
                                        <tr
                                            key={c.case_id}
                                            className={`hover:bg-white/40 transition-colors ${c.priority === 'Critical' ? 'bg-red-50/30 dark:bg-red-950/20' : ''}`}
                                        >
                                            <td className="px-4 py-4 font-bold text-[#1C2222] dark:text-gray-100">{c.case_id}</td>
                                            <td className="px-4 py-4 text-[#1C2222]/60 font-medium dark:text-gray-400">{c.patient_id}</td>
                                            <td className="px-4 py-4 text-[#1C2222]/40 font-medium">
                                                {format(new Date(c.upload_date), 'MMM d, yyyy • h:mm a')}
                                            </td>
                                            <td className="px-4 py-4">
                                                <CaseStatusBadge status={c.status} />
                                            </td>
                                            <td className="px-4 py-4">
                                                {c.priority === 'Critical' ? (
                                                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-0 font-bold rounded-full px-3">
                                                        Critical
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100 border-0 font-bold rounded-full px-3">
                                                        Routine
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <Button asChild size="sm" className="bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-full px-5 font-bold text-xs">
                                                    <Link href={`/radiologist/cases/${c.case_id}`}>
                                                        {c.status === 'Pending_Review' || c.status === 'In_Review' ? 'Review' : 'View'}
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

                {/* Pagination */}
                {filteredCases.length > 0 && (
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-[#1C2222]/40 font-medium">
                            Showing <span className="font-medium">{((page - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(page * itemsPerPage, filteredCases.length)}</span> of <span className="font-medium">{filteredCases.length}</span> cases
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
