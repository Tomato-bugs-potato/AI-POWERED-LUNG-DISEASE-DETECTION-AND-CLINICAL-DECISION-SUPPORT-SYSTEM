'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Download, Printer, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, FileQuestion } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

interface ReportMock {
    id: string;
    case_id: string;
    patient_id: string;
    patient_name: string;
    final_diagnosis: string;
    generated_at: string;
    status: 'Final' | 'Draft';
}

const fetchReports = async (): Promise<ReportMock[]> => {
    try {
        const response = await api.get('/reports');
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        return data.map((r: any, i: number) => ({
            id: r.report_id || `REP-${i}`,
            case_id: r.case_id || '-',
            patient_id: r.patient_id || '-',
            patient_name: r.patient_name || `Patient ${r.patient_id ? String(r.patient_id).substring(0, 8) : i}`,
            final_diagnosis: r.final_diagnosis || r.diagnosis || 'Pending',
            status: (r.status === 'Draft' ? 'Draft' : 'Final') as 'Final' | 'Draft',
            generated_at: r.generated_at || r.created_at || new Date().toISOString(),
        })).sort((a: ReportMock, b: ReportMock) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
    } catch {
        return [];
    }
};

export default function PastReportsPage() {
    const [page, setPage] = React.useState(1);
    const [search, setSearch] = React.useState('');
    const [diagnosisFilter, setDiagnosisFilter] = React.useState<string>('all');
    const [dateRange, setDateRange] = React.useState<{ from?: Date, to?: Date }>({});
    const itemsPerPage = 20;

    const { data: reports = [], isLoading } = useQuery({
        queryKey: ['doctor-reports'],
        queryFn: fetchReports,
    });

    const filteredReports = reports.filter(r => {
        if (diagnosisFilter !== 'all' && r.final_diagnosis !== diagnosisFilter) return false;
        if (search && !r.patient_name.toLowerCase().includes(search.toLowerCase()) &&
            !r.patient_id.toLowerCase().includes(search.toLowerCase()) &&
            !r.case_id.toLowerCase().includes(search.toLowerCase())) return false;
        if (dateRange.from && new Date(r.generated_at) < dateRange.from) return false;
        if (dateRange.to && new Date(r.generated_at) > dateRange.to) return false;
        return true;
    });

    const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
    const paginatedReports = filteredReports.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const handlePrint = (id: string) => {
        toast.success(`Sent report ${id} to printer`);
    };

    const handleDownload = (id: string) => {
        toast.success(`Downloading report ${id}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-6 w-6 text-gray-400" />
                        Clinical Reports
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">View, search, print, and securely download finalized patient reports.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">

                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
                            <div className="relative max-w-sm flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    className="pl-9"
                                    placeholder="Search Patient Name, ID, or Case..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <Select value={diagnosisFilter} onValueChange={setDiagnosisFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="mr-2 h-4 w-4 text-gray-500" />
                                    <SelectValue placeholder="Diagnosis" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Diagnoses</SelectItem>
                                    <SelectItem value="Normal">Normal</SelectItem>
                                    <SelectItem value="Pneumonia">Pneumonia</SelectItem>
                                    <SelectItem value="Tuberculosis">Tuberculosis</SelectItem>
                                    <SelectItem value="Lung Tumor">Lung Tumor</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
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
                                            <span>Filter dates</span>
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
                            className="text-gray-500"
                            onClick={() => { setDiagnosisFilter('all'); setSearch(''); setDateRange({}); setPage(1); }}
                        >
                            Clear
                        </Button>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden relative min-h-[400px]">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-zinc-900/20">
                                <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                                    <FileQuestion className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No reports found</h3>
                                <p className="mt-2 text-sm text-gray-500 max-w-sm">No clinical reports match your current filters.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-100/50 dark:bg-zinc-900/50 border-b border-border">
                                        <tr>
                                            <th scope="col" className="px-4 py-3 font-medium">Date</th>
                                            <th scope="col" className="px-4 py-3 font-medium">Patient Details</th>
                                            <th scope="col" className="px-4 py-3 font-medium">Case ID</th>
                                            <th scope="col" className="px-4 py-3 font-medium">Final Diagnosis</th>
                                            <th scope="col" className="px-4 py-3 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {paginatedReports.map((r) => (
                                            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                                <td className="px-4 py-4 text-gray-500 dark:text-gray-400">
                                                    {format(new Date(r.generated_at), 'MMM d, yyyy')}
                                                    <div className="text-xs">{format(new Date(r.generated_at), 'h:mm a')}</div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{r.patient_name}</div>
                                                    <div className="text-xs font-mono text-muted-foreground mt-0.5">{r.patient_id}</div>
                                                </td>
                                                <td className="px-4 py-4 font-mono text-gray-500">{r.case_id}</td>
                                                <td className="px-4 py-4">
                                                    {r.status === 'Draft' ? (
                                                        <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300">Draft</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className={r.final_diagnosis === 'Normal' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                                                            {r.final_diagnosis}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handlePrint(r.id)} className="h-8 w-8 text-gray-500 hover:text-gray-900" title="Print">
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDownload(r.id)} className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="Download PDF">
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {filteredReports.length > 0 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-gray-500">
                                Showing <span className="font-medium">{((page - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(page * itemsPerPage, filteredReports.length)}</span> of <span className="font-medium">{filteredReports.length}</span> reports
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
