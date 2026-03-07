'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, User, Phone, Calendar, Upload, FileText, Activity, AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Patient, Case } from '@/types';
import { CaseStatusBadge } from '@/components/shared/CaseStatusBadge';
import api from '@/lib/api';

interface PatientDetailData extends Patient {
    full_name: string;
    contact_number: string;
    created_at: string;
    history: Case[];
}

const fetchPatientDetail = async (id: string): Promise<PatientDetailData> => {
    try {
        const response = await api.get(`/patients/${id}`);
        const p = response.data;
        return {
            patient_id: p.patient_id,
            full_name: p.full_name || p.name || `Patient ${p.patient_id}`,
            age: p.age || 0,
            sex: p.sex || 'Unknown',
            contact_number: p.contact_number || p.phone || 'N/A',
            consent_given: p.consent_given ?? true,
            created_at: p.created_at || p.registration_date || new Date().toISOString(),
            history: (p.cases || p.history || []).map((c: any) => ({
                case_id: c.case_id,
                patient_id: id,
                status: c.status,
                priority: c.priority || 'Non-Critical',
                upload_date: c.created_at || c.upload_date || new Date().toISOString(),
                image: c.images?.[0] || { image_id: '', file_url: '', upload_date: '', format: 'DICOM' },
                radiologist_review: c.radiologist_review || undefined,
                diagnosis: c.diagnosis || undefined,
            })),
        };
    } catch {
        return {
            patient_id: id,
            full_name: 'Unknown Patient',
            age: 0,
            sex: 'Male' as const,
            contact_number: 'N/A',
            consent_given: false,
            created_at: new Date().toISOString(),
            history: [],
        };
    }
};

export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.patientId as string;

    const { data: patient, isLoading } = useQuery({
        queryKey: ['patient-detail', patientId],
        queryFn: () => fetchPatientDetail(patientId),
    });

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!patient) return <div>Failed to load patient data</div>;

    const activeCases = patient.history.filter(c => c.status !== 'Completed' && c.status !== 'Diagnosed');
    const pastCases = patient.history.filter(c => c.status === 'Completed' || c.status === 'Diagnosed');

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/doctor/patients')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                            {patient.full_name}
                        </h1>
                        <p className="text-sm text-gray-500 font-mono mt-1">{patient.patient_id}</p>
                    </div>
                </div>

                <Button asChild variant="outline" className="bg-white">
                    <Link href={`/radiologist/upload?patientId=${patient.patient_id}`}>
                        <Upload className="mr-2 h-4 w-4" /> Upload New X-Ray
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Patient Profile Card */}
                <Card className="md:col-span-1 border-border shadow-sm bg-gray-50/50 dark:bg-zinc-900/50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-center mb-6">
                            <div className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-3xl font-bold uppercase">
                                {patient.full_name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <User className="h-3 w-3" /> Demographics
                                </p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{patient.age} years old, {patient.sex === 'Male' ? 'Male' : 'Female'}</p>
                            </div>
                            <div className="pt-3 border-t border-border/50">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <Phone className="h-3 w-3" /> Contact
                                </p>
                                <p className="font-mono text-sm text-gray-900 dark:text-gray-100">{patient.contact_number || 'N/A'}</p>
                            </div>
                            <div className="pt-3 border-t border-border/50">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> Registered Date
                                </p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{format(new Date(patient.created_at), 'MMM d, yyyy')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* History and Notes Column */}
                <div className="md:col-span-2 space-y-6">

                    {/* Active Cases Alert */}
                    {activeCases.length > 0 && (
                        <div className="bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">Active Diagnosis Pending</h4>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">This patient has {activeCases.length} case(s) currently awaiting diagnosis.</p>
                                <div className="mt-3 flex gap-2">
                                    {activeCases.map(c => (
                                        <Link key={c.case_id} href={`/doctor/cases/${c.case_id}`}>
                                            <Button size="sm" variant="outline" className="h-8 bg-white border-red-200 text-red-700 hover:bg-red-50 dark:bg-zinc-900 dark:border-red-800 dark:text-red-300">
                                                Review {c.case_id}
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <Tabs defaultValue="history" className="w-full">
                        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-4">
                            <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-medium">
                                Case History ({patient.history.length})
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-medium">
                                Generated Reports
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="history" className="m-0">
                            <Card className="border-border shadow-sm">
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto w-full">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-900/50 border-b border-border">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3 font-medium">Date</th>
                                                    <th scope="col" className="px-4 py-3 font-medium">Case ID</th>
                                                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                                                    <th scope="col" className="px-4 py-3 font-medium">Diagnosis</th>
                                                    <th scope="col" className="px-4 py-3 font-medium text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {patient.history.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No previous case history.</td>
                                                    </tr>
                                                ) : patient.history.map((c) => (
                                                    <tr key={c.case_id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                                        <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                                                            {format(new Date(c.upload_date), 'MMM d, yyyy')}
                                                        </td>
                                                        <td className="px-4 py-4 font-mono text-gray-900 dark:text-gray-100">{c.case_id}</td>
                                                        <td className="px-4 py-4">
                                                            <CaseStatusBadge status={c.status} />
                                                        </td>
                                                        <td className="px-4 py-4 font-medium">
                                                            {c.diagnosis?.primary_diagnosis ? (
                                                                <Badge variant="outline" className={c.diagnosis.primary_diagnosis === 'Normal' ? 'text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' : 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'}>
                                                                    {c.diagnosis.primary_diagnosis}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 italic">Pending</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <Button asChild variant="ghost" size="sm" className="text-blue-600 shrink-0">
                                                                <Link href={`/doctor/cases/${c.case_id}`}>
                                                                    View Detail
                                                                </Link>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="documents" className="m-0">
                            <Card className="border-border shadow-sm border-dashed">
                                <CardContent className="p-8 text-center flex flex-col items-center justify-center">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                                        <FileText className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">No reports generated yet</h3>
                                    <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                                        Finalized clinical reports will appear here once a case is diagnosed and a report is generated.
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                    </Tabs>
                </div>
            </div>
        </div>
    );
}
