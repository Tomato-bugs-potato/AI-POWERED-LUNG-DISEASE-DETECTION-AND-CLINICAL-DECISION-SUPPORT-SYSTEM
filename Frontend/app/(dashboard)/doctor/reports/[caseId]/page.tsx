'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
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
            pdf_url: r.pdf_url || null,
            patient: {
                id: r.patient?.patient_id || r.patient_id || 'Unknown',
                name: r.patient?.name || `Patient ${(r.patient_id || '').toString().substring(0, 8)}`,
                age: r.patient?.age || 0,
                sex: r.patient?.sex || 'Unknown',
                contact: 'N/A',
            },
            clinical_details: {
                date_of_exam: r.generated_at || new Date().toISOString(),
                modality: 'Chest X-Ray (PA View)',
                referring_physician: 'N/A',
            },
            radiologist: {
                name: r.radiologist?.name || 'Radiologist',
                findings: r.radiologist?.findings || 'No findings recorded.',
            },
            ai_inference: {
                model_version: r.ai_inference?.model_version || 'unknown',
                primary_finding: r.ai_inference?.primary_finding || 'N/A',
                confidence: r.ai_inference?.confidence || 0,
            },
            doctor: {
                name: r.doctor?.name || 'Doctor',
                final_diagnosis: r.final_diagnosis || 'Pending',
                recommendations: r.doctor?.recommendations || 'No recommendations recorded.',
            },
        };
    } catch (error: any) {
        if (error.response?.status === 404) {
            throw error; // Throw so react-query can retry
        }

        return {
            report_id: `REP-${id}`,
            case_id: id,
            status: 'Draft',
            generated_at: new Date().toISOString(),
            pdf_url: null,
            patient: { id: 'Unknown', name: 'Unknown', age: 0, sex: 'Unknown', contact: 'N/A' },
            clinical_details: { date_of_exam: new Date().toISOString(), modality: 'Chest X-Ray (PA View)', referring_physician: 'N/A' },
            radiologist: { name: 'Unknown', findings: 'Failed to load report.' },
            ai_inference: { model_version: '', primary_finding: 'N/A', confidence: 0 },
            doctor: { name: 'Unknown', final_diagnosis: 'Unknown', recommendations: 'Failed to load report.' },
        };
    }
};

export default function ReportPreviewPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.caseId as string;

    const { data: report, isLoading, error } = useQuery({
        queryKey: ['report', caseId],
        queryFn: () => fetchReportDetail(caseId),
        retry: (failureCount, err: any) => {
            // Retry on 404 while Celery generates the PDF — up to 6 attempts (~18s)
            if (err?.response?.status === 404 && failureCount < 6) return true;
            return false;
        },
        retryDelay: 3000,
    });

    const handlePrint = () => window.print();

    if (isLoading) {
        return (
            <div className="flex flex-col h-[80vh] items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <p className="text-muted-foreground animate-pulse">Generating Report PDF...</p>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex flex-col h-[80vh] items-center justify-center gap-4">
                <p className="text-lg font-semibold text-destructive">Report Not Found</p>
                <p className="text-muted-foreground text-sm">The report for this case has not been generated yet or the case does not exist.</p>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        );
    }

    return (
        <>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    #report-paper {
                        box-shadow: none !important;
                        margin: 0 !important;
                    }
                }

                /* paper grain texture */
                #report-paper::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
                    pointer-events: none;
                    z-index: 0;
                }
                #report-paper > * { position: relative; z-index: 1; }

                .field-line {
                    border-bottom: 1px solid #d1d5db;
                    padding-bottom: 2px;
                }
            `}</style>

            {/* Desk background */}
            <div
                className="min-h-screen py-10 px-4"
                style={{ background: '#f1f5f9' }}
            >
                {/* Toolbar */}
                <div className="no-print max-w-[780px] mx-auto mb-6 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-amber-100/80 hover:text-white hover:bg-white/10 border border-white/20"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handlePrint}
                            className="text-amber-100/80 hover:text-white border-white/20 hover:bg-white/10 bg-transparent"
                        >
                            <Printer className="mr-2 h-4 w-4" /> Print
                        </Button>
                        <Button
                            onClick={handlePrint}
                            className="bg-amber-700 hover:bg-amber-600 text-white border-0"
                        >
                            <Download className="mr-2 h-4 w-4" /> Save as PDF
                        </Button>
                    </div>
                </div>

                {/* Paper sheet */}
                <div
                    id="report-paper"
                    className="relative max-w-[780px] mx-auto"
                    style={{
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        boxShadow: `
                            0 1px 1px rgba(0,0,0,0.20),
                            0 2px 2px rgba(0,0,0,0.18),
                            0 4px 4px rgba(0,0,0,0.16),
                            0 8px 8px rgba(0,0,0,0.14),
                            0 16px 32px rgba(0,0,0,0.20)
                        `,
                    }}
                >
                    {/* Top accent line */}
                    <div style={{ height: '5px', background: 'linear-gradient(90deg, #1a3a6b 0%, #2a5ca8 50%, #1a3a6b 100%)' }} />

                    {/* Left binding shadow */}
                    <div
                        className="absolute top-0 left-0 bottom-0 pointer-events-none"
                        style={{ width: '18px', background: 'linear-gradient(90deg, rgba(0,0,0,0.08) 0%, transparent 100%)' }}
                    />

                    <div className="px-16 py-12">

                        {/* ── LETTERHEAD ── */}
                        <div className="flex items-start justify-between pb-5" style={{ borderBottom: '2px solid #1a3a6b' }}>
                            <div>
                                <p style={{ fontSize: '9px', letterSpacing: '0.22em', color: '#1a3a6b', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                                    St. Paul's Hospital Millennium Medical College
                                </p>
                                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                                    AI Lung Disease Detection
                                </h1>
                                <p style={{ fontSize: '11px', color: '#374151', fontFamily: 'sans-serif', marginTop: '3px' }}>
                                    Department of Radiology &amp; Diagnostic Imaging
                                </p>
                                <p style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'sans-serif', marginTop: '2px' }}>
                                    Addis Ababa, Ethiopia &nbsp;·&nbsp; Tel: +251 11 552 6267
                                </p>
                            </div>
                            <div className="text-right">
                                <div
                                    className="inline-block mb-3 px-4 py-1.5"
                                    style={{ border: '1.5px solid #1a3a6b' }}
                                >
                                    <p style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#1a3a6b', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase' }}>
                                        {report.status === 'Draft' ? 'Draft Report' : 'Final Report'}
                                    </p>
                                </div>
                                <div style={{ fontSize: '11px', fontFamily: 'sans-serif', color: '#4b5563', lineHeight: 1.7 }}>
                                    <p><span style={{ fontWeight: 600 }}>Report No:</span> <span style={{ fontFamily: 'monospace' }}>{report.report_id}</span></p>
                                    <p><span style={{ fontWeight: 600 }}>Case ID:</span> <span style={{ fontFamily: 'monospace' }}>{report.case_id}</span></p>
                                    <p><span style={{ fontWeight: 600 }}>Date:</span> {format(new Date(report.generated_at), 'MMMM d, yyyy')}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── PATIENT INFORMATION ── */}
                        <div className="mt-7 mb-7 px-5 py-4" style={{ backgroundColor: 'rgba(243,244,246,1)', border: '1px solid #e5e7eb' }}>
                            <p style={{ fontSize: '9px', letterSpacing: '0.22em', color: '#6b7280', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
                                Patient Information
                            </p>
                            <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                                <div className="col-span-2">
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Patient Name</p>
                                    <p className="field-line" style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{report.patient.name}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Patient ID</p>
                                    <p className="field-line" style={{ fontSize: '12px', fontFamily: 'monospace', color: '#1f2937' }}>{report.patient.id}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Exam Date</p>
                                    <p className="field-line" style={{ fontSize: '12px', fontFamily: 'sans-serif', color: '#1f2937' }}>
                                        {format(new Date(report.clinical_details.date_of_exam), 'dd MMM yyyy')}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Age / Sex</p>
                                    <p style={{ fontSize: '12px', fontFamily: 'sans-serif', color: '#1f2937' }}>{report.patient.age} yrs / {report.patient.sex}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Modality</p>
                                    <p style={{ fontSize: '12px', fontFamily: 'sans-serif', color: '#1f2937' }}>{report.clinical_details.modality}</p>
                                </div>
                                <div className="col-span-2">
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Referring Physician</p>
                                    <p style={{ fontSize: '12px', fontFamily: 'sans-serif', color: '#1f2937' }}>{report.clinical_details.referring_physician}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── SECTION 1: RADIOLOGICAL FINDINGS ── */}
                        <div className="mb-7">
                            <div className="flex items-center gap-3 mb-3">
                                <p style={{ fontSize: '9px', letterSpacing: '0.22em', color: '#1a3a6b', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    1. &nbsp;Radiological Findings
                                </p>
                                <div style={{ flex: 1, borderTop: '1px solid #d1d5db' }} />
                            </div>
                            <p style={{ fontSize: '13px', lineHeight: 2, color: '#1f2937', textAlign: 'justify', textIndent: '2em' }}>
                                {report.radiologist.findings}
                            </p>
                            <p style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'sans-serif', marginTop: '8px', fontStyle: 'italic' }}>
                                Reported by: {report.radiologist.name}, Consultant Radiologist
                            </p>
                        </div>

                        {/* ── SECTION 2: AI ANALYSIS ── */}
                        <div className="mb-7">
                            <div className="flex items-center gap-3 mb-3">
                                <p style={{ fontSize: '9px', letterSpacing: '0.22em', color: '#1a3a6b', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    2. &nbsp;AI-Assisted Analysis
                                </p>
                                <div style={{ flex: 1, borderTop: '1px solid #d1d5db' }} />
                            </div>
                            <div style={{ borderLeft: '3px solid #bfdbfe', paddingLeft: '14px', paddingTop: '4px', paddingBottom: '4px', backgroundColor: 'rgba(239,246,255,0.8)' }}>
                                <p style={{ fontSize: '13px', lineHeight: 2, color: '#1f2937' }}>
                                    Deep learning model{' '}
                                    <span style={{ fontFamily: 'monospace', fontSize: '11px', backgroundColor: 'rgba(0,0,0,0.06)', padding: '1px 4px' }}>
                                        {report.ai_inference.model_version}
                                    </span>{' '}
                                    analyzed the imaging and identified patterns consistent with{' '}
                                    <strong style={{ color: '#111827' }}>{report.ai_inference.primary_finding}</strong>{' '}
                                    at a confidence level of{' '}
                                    <strong style={{ color: '#111827' }}>{(report.ai_inference.confidence * 100).toFixed(1)}%</strong>.
                                    These findings are intended to assist clinical decision-making and should be
                                    interpreted alongside the radiologist's assessment.
                                </p>
                            </div>
                        </div>

                        {/* ── SECTION 3: FINAL DIAGNOSIS ── */}
                        <div className="mb-7">
                            <div className="flex items-center gap-3 mb-3">
                                <p style={{ fontSize: '9px', letterSpacing: '0.22em', color: '#1a3a6b', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    3. &nbsp;Final Diagnosis
                                </p>
                                <div style={{ flex: 1, borderTop: '1px solid #d1d5db' }} />
                            </div>
                            <div style={{ border: '1.5px solid #111827', padding: '14px 24px', textAlign: 'center' }}>
                                <p style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827' }}>
                                    {report.doctor.final_diagnosis}
                                </p>
                            </div>
                        </div>

                        {/* ── SECTION 4: RECOMMENDATIONS ── */}
                        <div className="mb-14">
                            <div className="flex items-center gap-3 mb-3">
                                <p style={{ fontSize: '9px', letterSpacing: '0.22em', color: '#1a3a6b', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    4. &nbsp;Clinical Recommendations
                                </p>
                                <div style={{ flex: 1, borderTop: '1px solid #d1d5db' }} />
                            </div>
                            <div
                                style={{ fontSize: '13px', lineHeight: 2, color: '#1f2937', textAlign: 'justify' }}
                                dangerouslySetInnerHTML={{ __html: report.doctor.recommendations }}
                            />
                            <p style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'sans-serif', marginTop: '8px', fontStyle: 'italic' }}>
                                — {report.doctor.name}, Attending Physician
                            </p>
                        </div>

                        {/* ── SIGNATURES ── */}
                        <div style={{ borderTop: '2px solid #111827', paddingTop: '36px' }} className="grid grid-cols-2 gap-16">
                            <div className="text-center">
                                <div style={{ height: '52px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontStyle: 'italic', color: '#374151', letterSpacing: '1px' }}>
                                        {report.radiologist.name}
                                    </span>
                                </div>
                                <div style={{ borderTop: '1px solid #374151', paddingTop: '8px', margin: '0 24px' }}>
                                    <p style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'sans-serif', color: '#111827' }}>{report.radiologist.name}</p>
                                    <p style={{ fontSize: '10px', fontFamily: 'sans-serif', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>
                                        Consultant Radiologist
                                    </p>
                                    <p style={{ fontSize: '10px', fontFamily: 'sans-serif', color: '#9ca3af', marginTop: '3px' }}>
                                        {format(new Date(report.generated_at), 'dd / MM / yyyy')}
                                    </p>
                                </div>
                            </div>

                            <div className="text-center">
                                <div style={{ height: '52px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontStyle: 'italic', color: '#374151', letterSpacing: '1px' }}>
                                        {report.doctor.name}
                                    </span>
                                </div>
                                <div style={{ borderTop: '1px solid #374151', paddingTop: '8px', margin: '0 24px' }}>
                                    <p style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'sans-serif', color: '#111827' }}>{report.doctor.name}</p>
                                    <p style={{ fontSize: '10px', fontFamily: 'sans-serif', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>
                                        Attending Physician
                                    </p>
                                    <p style={{ fontSize: '10px', fontFamily: 'sans-serif', color: '#9ca3af', marginTop: '3px' }}>
                                        {format(new Date(report.generated_at), 'dd / MM / yyyy')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── FOOTER ── */}
                        <div style={{ marginTop: '40px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: '9px', fontFamily: 'sans-serif', color: '#9ca3af', fontStyle: 'italic' }}>
                                This report is confidential and intended solely for the named patient and authorized medical personnel.
                            </p>
                            <p style={{ fontSize: '9px', fontFamily: 'sans-serif', color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                                Page 1 of 1
                            </p>
                        </div>

                    </div>

                    {/* Bottom accent line */}
                    <div style={{ height: '4px', background: 'linear-gradient(90deg, #1a3a6b 0%, #2a5ca8 50%, #1a3a6b 100%)' }} />
                </div>

                <p className="no-print text-center mt-5" style={{ fontSize: '11px', fontFamily: 'sans-serif', color: 'rgba(255,255,255,0.3)' }}>
                    Use Print or Save as PDF to produce a physical copy of this report.
                </p>
            </div>
        </>
    );
}
