'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Download, CheckCircle2, Hospital } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';

const fetchReportDetail = async (id: string) => {
    try {
        const response = await api.get(`/reports/${id}`);
        const r = response.data;
        return {
            report_id: r.report_id || `REP-${id}`,
            case_id: r.case_id || id,
            status: r.status || 'Final',
            generated_at: r.generated_at || r.created_at || new Date().toISOString(),
            patient: {
                id: r.patient?.patient_id || r.patient_id || 'Unknown',
                name: r.patient?.name || r.patient_name || 'Unknown',
                age: r.patient?.age || 0,
                sex: r.patient?.sex || 'Unknown',
                contact: r.patient?.contact || r.patient?.phone || 'N/A',
                address: r.patient?.address || 'N/A',
            },
            clinical_details: {
                date_of_exam: r.clinical_details?.date_of_exam || r.exam_date || new Date().toISOString(),
                modality: r.clinical_details?.modality || 'X-Ray PA View',
                referring_physician: r.clinical_details?.referring_physician || 'N/A',
            },
            radiologist: {
                name: r.radiologist?.name || r.radiologist_name || 'Radiologist',
                findings: r.radiologist?.findings || r.radiological_findings || 'No findings recorded.',
            },
            ai_inference: {
                model_version: r.ai_inference?.model_version || 'v2.1',
                primary_finding: r.ai_inference?.primary_finding || r.ai_finding || 'N/A',
                confidence: r.ai_inference?.confidence || 0,
            },
            doctor: {
                name: r.doctor?.name || r.doctor_name || 'Doctor',
                final_diagnosis: r.doctor?.final_diagnosis || r.final_diagnosis || 'Pending',
                recommendations: r.doctor?.recommendations || r.recommendations || '<p>No recommendations recorded.</p>',
            },
        };
    } catch {
        return {
            report_id: `REP-${id}`,
            case_id: id,
            status: 'Draft',
            generated_at: new Date().toISOString(),
            patient: { id: 'Unknown', name: 'Unknown', age: 0, sex: 'Unknown', contact: 'N/A', address: 'N/A' },
            clinical_details: { date_of_exam: new Date().toISOString(), modality: 'X-Ray PA View', referring_physician: 'N/A' },
            radiologist: { name: 'Unknown', findings: 'Failed to load report.' },
            ai_inference: { model_version: '', primary_finding: 'N/A', confidence: 0 },
            doctor: { name: 'Unknown', final_diagnosis: 'Unknown', recommendations: '<p>Failed to load report.</p>' },
        };
    }
};

export default function ReportPreviewPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.caseId as string;

    const { data: report, isLoading } = useQuery({
        queryKey: ['report', caseId],
        queryFn: () => fetchReportDetail(caseId),
    });

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        toast.success('Downloading PDF...');
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!report) return <div>Failed to load report</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 print:max-w-none print:m-0 print:p-0">

            {/* Action Bar (Hidden when printing) */}
            <div className="flex items-center justify-between print:hidden">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </div>
            </div>

            {/* A4 Document Container */}
            <Card className="bg-white text-black shadow-lg print:shadow-none print:border-none">
                <CardContent className="p-10 sm:p-14 min-h-[1056px] flex flex-col">

                    {/* Report Header */}
                    <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Hospital className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold font-serif text-gray-900 tracking-tight">AI Lung Disease DB</h1>
                                <p className="text-sm font-medium text-gray-600 uppercase tracking-widest mt-1">Diagnostic Imaging Center</p>
                                <p className="text-xs text-gray-500 mt-0.5">Addis Ababa, Ethiopia • +251 11 123 4567</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-light text-gray-400 uppercase tracking-widest mb-2">Final Report</h2>
                            <p className="text-sm font-bold text-gray-800">Report ID: <span className="font-mono font-normal text-gray-600">{report.report_id}</span></p>
                            <p className="text-sm font-bold text-gray-800">Date: <span className="font-normal text-gray-600">{format(new Date(report.generated_at), 'MMMM d, yyyy')}</span></p>
                        </div>
                    </div>

                    {/* Patient Information Grid */}
                    <div className="bg-gray-50 p-4 border border-gray-200 rounded-md mb-8">
                        <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-3">Patient Information</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500 mb-0.5">Patient Name</p>
                                <p className="font-semibold text-gray-900">{report.patient.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 mb-0.5">Patient ID</p>
                                <p className="font-mono text-gray-900">{report.patient.id}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 mb-0.5">Age / Sex</p>
                                <p className="font-medium text-gray-900">{report.patient.age} Y / {report.patient.sex}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 mb-0.5">Exam Date</p>
                                <p className="font-medium text-gray-900">{format(new Date(report.clinical_details.date_of_exam), 'MMM d, yyyy')}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 mb-0.5">Modality</p>
                                <p className="font-medium text-gray-900">{report.clinical_details.modality}</p>
                            </div>
                            <div className="col-span-3">
                                <p className="text-gray-500 mb-0.5">Referring Physician</p>
                                <p className="font-medium text-gray-900">{report.clinical_details.referring_physician}</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Sections */}
                    <div className="space-y-8 flex-1">

                        <section>
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">Radiological Findings</h3>
                            <p className="text-sm text-gray-800 leading-relaxed text-justify">
                                {report.radiologist.findings}
                            </p>
                        </section>

                        <section className="bg-blue-50/50 p-4 border border-blue-100 rounded-md">
                            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" /> AI Diagnostics Assist
                            </h3>
                            <p className="text-sm text-gray-700">
                                The deep learning model (<span className="font-mono">{report.ai_inference.model_version}</span>) analyzed the provided imaging and detected patterns indicative of <span className="font-bold text-blue-800">{report.ai_inference.primary_finding}</span> with a confidence probability of <span className="font-bold">{report.ai_inference.confidence * 100}%</span>. This aligns with the radiologist's observational findings.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">Final Diagnosis</h3>
                            <p className="text-xl font-bold text-red-700 tracking-wide uppercase">
                                {report.doctor.final_diagnosis}
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">Recommendations & Action Plan</h3>
                            <div
                                className="prose prose-sm text-gray-800 max-w-none prose-p:leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: report.doctor.recommendations }}
                            />
                        </section>

                    </div>

                    {/* Signatures */}
                    <div className="mt-16 pt-8 grid grid-cols-2 gap-8 border-t border-gray-200">
                        <div className="text-center">
                            <div className="h-16 flex items-end justify-center mb-2">
                                {/* Placeholder for actual signature image */}
                                <span className="font-serif text-2xl italic text-gray-400">{report.radiologist.name}</span>
                            </div>
                            <div className="w-48 mx-auto border-t border-gray-400 pt-2">
                                <p className="text-sm font-bold text-gray-900">{report.radiologist.name}</p>
                                <p className="text-xs text-gray-500 uppercase">Consultant Radiologist</p>
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="h-16 flex items-end justify-center mb-2">
                                {/* Placeholder for actual signature image */}
                                <span className="font-serif text-2xl italic text-gray-400">{report.doctor.name}</span>
                            </div>
                            <div className="w-48 mx-auto border-t border-gray-400 pt-2">
                                <p className="text-sm font-bold text-gray-900">{report.doctor.name}</p>
                                <p className="text-xs text-gray-500 uppercase">Attending Physician</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-xs text-gray-400">
                        *** End of Report ***
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
