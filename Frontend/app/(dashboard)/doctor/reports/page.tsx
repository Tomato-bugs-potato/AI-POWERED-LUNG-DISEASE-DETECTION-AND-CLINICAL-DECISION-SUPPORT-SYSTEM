'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Download, Printer, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, FileQuestion, FileDown } from 'lucide-react';

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
    const router = useRouter();
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

    const handlePrint = (caseId: string) => {
        // Navigate to report preview which has a print-ready layout
        router.push(`/doctor/reports/${caseId}`);
    };

    const handleDownload = async (caseId: string) => {
        try {
            const { data } = await api.get(`/reports/${caseId}`);
            if (data.pdf_url) {
                // Fetch PDF as blob to trigger proper download
                const pdfRes = await fetch(data.pdf_url);
                if (!pdfRes.ok) throw new Error('PDF fetch failed');
                const blob = await pdfRes.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `report-${caseId}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                toast.success('Report downloaded');
            } else {
                toast.error('Report PDF is not available yet');
            }
        } catch {
            toast.error('Failed to download report');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/reports/export/csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'reports.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Reports exported successfully');
        } catch {
            toast.error('Failed to export reports');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-6 mb-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2.5 bg-slate-100 rounded-2xl shadow-inner group">
                            <FileText className="h-6 w-6 text-slate-600 transition-transform group-hover:scale-110" />
                        </div>
                        Clinical Reports
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium max-w-xl">Comprehensive clinical diagnostic records and validated patient assessments for secure review.</p>
                </div>
                <Button variant="outline" onClick={handleExportCSV} className="border-slate-200 shadow-sm hover:shadow-md transition-all h-12 px-6 rounded-2xl font-bold gap-2" aria-label="Export all reports as CSV file">
                    <FileDown className="h-4 w-4 text-primary" /> Export Dataset
                </Button>
            </div>

            <Card className="border-none shadow-none rounded-none bg-transparent dark:bg-transparent overflow-hidden">
                <CardContent className="p-0 space-y-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                            <div className="relative w-full sm:w-[320px]">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    className="pl-11 h-11 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus-visible:ring-1 focus-visible:ring-black/5"
                                    placeholder="Search patient, ID, or case..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <Select value={diagnosisFilter} onValueChange={setDiagnosisFilter}>
                                <SelectTrigger className="h-10 w-full sm:w-[190px] bg-white border-gray-200 rounded-xl font-bold text-slate-700">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-primary" />
                                        <SelectValue placeholder="Diagnosis" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-200 bg-white">
                                    <SelectItem value="all" className="font-bold">All Conditions</SelectItem>
                                    <SelectItem value="Normal">Healthy / Normal</SelectItem>
                                    <SelectItem value="Pneumonia">Pneumonia</SelectItem>
                                    <SelectItem value="COVID-19">COVID-19</SelectItem>
                                    <SelectItem value="Other">Other Findings</SelectItem>
                                </SelectContent>
                            </Select>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-12 w-full sm:w-[260px] justify-start text-left font-bold text-slate-700 bg-white border-slate-200 rounded-2xl shadow-sm">
                                        <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                                        {dateRange.from ? (
                                            dateRange.to ? (
                                                <span>{format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, y")}</span>
                                            ) : (
                                                <span>{format(dateRange.from, "MMM dd, y")}</span>
                                            )
                                        ) : (
                                            <span className="text-slate-400">Clinical Archive...</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-3xl border-slate-100 shadow-2xl" align="start" sideOffset={10}>
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        selected={{ from: dateRange.from, to: dateRange.to }}
                                        onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                                        numberOfMonths={2}
                                        className="rounded-3xl p-4"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {(search || diagnosisFilter !== 'all' || dateRange.from) && (
                            <Button
                                variant="ghost"
                                className="h-10 px-5 text-slate-400 hover:text-primary hover:bg-primary/5 font-bold rounded-2xl transition-all"
                                onClick={() => { setDiagnosisFilter('all'); setSearch(''); setDateRange({}); setPage(1); }}
                            >
                                Reset Analysis
                            </Button>
                        )}
                    </div>

                    <div className="relative min-h-[450px]">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 text-center animate-in zoom-in-95 duration-500">
                                <div className="mx-auto w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mb-6 shadow-inner border border-slate-100 rotate-3 group hover:rotate-0 transition-transform">
                                    <FileQuestion className="h-10 w-10 text-slate-300 group-hover:text-primary transition-colors" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">No Clinical Evidence</h3>
                                <p className="mt-2 text-slate-500 max-w-sm font-medium">We couldn't find any reports matching the selected criteria. Try adjusting your timeframe or condition filters.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-sm text-left border-collapse border-spacing-0">
                                    <thead className="text-[10px] text-black uppercase bg-gray-200 font-black tracking-widest border-b border-gray-200">
                                        <tr className="divide-x divide-gray-100">
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Issue Date</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Patient Records</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Case Sequence</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Diagnostic Status</th>
                                            <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paginatedReports.map((r) => (
                                            <tr key={r.id} className="bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-none divide-x divide-gray-100 group">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-black text-xs">{format(new Date(r.generated_at), 'MMM d, yyyy')}</div>
                                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">{format(new Date(r.generated_at), 'h:mm a')}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-black dark:text-gray-100 leading-tight">{r.patient_name}</div>
                                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">{r.patient_id}</div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 font-bold text-[10px]">{r.case_id}</td>
                                                <td className="px-4 py-3">
                                                    {r.status === 'Draft' ? (
                                                        <Badge variant="outline" className="rounded-md px-2 py-0 border-none font-black text-[9px] uppercase bg-gray-100 text-gray-600">Draft</Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className={`rounded-md px-2 py-0 border-none font-black text-[9px] uppercase ${r.final_diagnosis === 'Normal'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                                }`}
                                                        >
                                                            {r.final_diagnosis}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button asChild size="sm" className="font-bold text-[11px] rounded-full px-5 h-8 bg-[#1C2222] hover:bg-[#334155] text-white">
                                                            <Link href={`/doctor/reports/${r.case_id}`}>View</Link>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handlePrint(r.case_id)} className="h-8 w-8 text-gray-400 hover:text-black rounded-full hover:bg-gray-100" title="Print">
                                                            <Printer className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDownload(r.case_id)} className="h-8 w-8 text-gray-400 hover:text-black rounded-full hover:bg-gray-100" title="Download">
                                                            <Download className="h-3.5 w-3.5" />
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
                        <div className="px-4 py-4 flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                Showing records <span className="text-slate-900">{((page - 1) * itemsPerPage) + 1}</span> to <span className="text-slate-900">{Math.min(page * itemsPerPage, filteredReports.length)}</span> of <span className="text-slate-900">{filteredReports.length}</span>
                            </p>
                            <div className="flex gap-3">
                                <Button variant="outline" size="sm" className="h-10 rounded-2xl border-slate-200 font-bold px-5 bg-white shadow-sm hover:shadow transition-all" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4 mr-2 text-primary" /> Previous
                                </Button>
                                <Button variant="outline" size="sm" className="h-10 rounded-2xl border-slate-200 font-bold px-5 bg-white shadow-sm hover:shadow transition-all" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                    Next Phase <ChevronRight className="h-4 w-4 ml-2 text-primary" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
