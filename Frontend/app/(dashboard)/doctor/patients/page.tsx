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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="h-6 w-6 text-gray-400" />
                        Patient Directory
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Search and manage patient records and clinical histories.</p>
                </div>
                <Button variant="outline" onClick={handleExportCSV} aria-label="Export patient list as CSV file">
                    <FileDown className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">

                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                                className="pl-9 w-full bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                                placeholder="Search by names, ID, or phone number..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden relative min-h-[400px]">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : filteredPatients.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-zinc-900/20">
                                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                                    <FileQuestion className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No patients found</h3>
                                <p className="mt-2 text-sm text-gray-500 max-w-sm">No patient records match the search "{search}".</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-100/50 dark:bg-zinc-900/50 border-b border-border">
                                        <tr>
                                            <th scope="col" className="px-4 py-3 font-medium">Patient Info</th>
                                            <th scope="col" className="px-4 py-3 font-medium">Demographics</th>
                                            <th scope="col" className="px-4 py-3 font-medium">Last Visit</th>
                                            <th scope="col" className="px-4 py-3 font-medium text-center">Cases</th>
                                            <th scope="col" className="px-4 py-3 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {paginatedPatients.map((p) => (
                                            <tr key={p.patient_id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                                <td className="px-4 py-4">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{p.full_name}</div>
                                                    <div className="text-xs font-mono text-muted-foreground mt-0.5">{p.patient_id}</div>
                                                </td>
                                                <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                                                    {p.age} yrs • {p.sex === 'Male' ? 'Male' : 'Female'}
                                                </td>
                                                <td className="px-4 py-4 text-gray-500">
                                                    {format(new Date(p.last_visit_date), 'MMM d, yyyy')}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="font-medium">{p.total_cases} Total</span>
                                                        {p.active_cases > 0 && (
                                                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-[10px] px-1.5 py-0 h-4">
                                                                {p.active_cases} Active
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <Button asChild variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                                                        <Link href={`/doctor/patients/${p.patient_id}`}>
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

                    {filteredPatients.length > 0 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-gray-500">
                                Showing <span className="font-medium">{((page - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(page * itemsPerPage, filteredPatients.length)}</span> of <span className="font-medium">{filteredPatients.length}</span> patients
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

export default function PatientsDirectoryPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <PatientsDirectoryContent />
        </React.Suspense>
    );
}
