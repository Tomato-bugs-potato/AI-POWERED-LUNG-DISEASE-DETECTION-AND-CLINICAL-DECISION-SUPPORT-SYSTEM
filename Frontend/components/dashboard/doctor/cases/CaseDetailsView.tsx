'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Stethoscope, Save, FileText, CheckCircle2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { ImageViewer } from '@/components/radiologist/ImageViewer';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CaseStatusBadge } from '@/components/shared/CaseStatusBadge';
import api from '@/lib/api';

const CLASS_COLORS: Record<string, string> = {
    'Pneumonia': 'bg-red-500',
    'Tuberculosis': 'bg-yellow-500',
    'Lung Tumor': 'bg-orange-500',
    'Normal': 'bg-green-500',
    'Other': 'bg-blue-500',
};

interface CaseDetailsViewProps {
    initialData: any;
    caseId: string;
}

const fetchDiagnosisDetails = async (id: string) => {
    try {
        const [caseRes, reviewRes, reportStatusRes] = await Promise.allSettled([
            api.get(`/cases/${id}`),
            api.get(`/reviews/${id}`),
            api.get(`/reports/${id}/status`)
        ]);

        const c = caseRes.status === 'fulfilled' ? caseRes.value.data : null;
        if (!c) throw new Error("Case not found");

        const review = reviewRes.status === 'fulfilled' ? reviewRes.value.data : null;
        const reportStatus = reportStatusRes.status === 'fulfilled' ? reportStatusRes.value.data : null;

        let imageUrl = '';
        const firstImage = c.images?.[0];
        if (firstImage?.image_id) {
            if (typeof window !== 'undefined') {
                try {
                    const imgRes = await api.get(`/images/${firstImage.image_id}/proxy`, {
                        responseType: 'blob',
                    });
                    imageUrl = URL.createObjectURL(imgRes.data);
                } catch {
                    imageUrl = '';
                }
            } else {
                // During SSR, just leave it blank to avoid createObjectURL crash
                imageUrl = '';
            }
        }
        let inferenceResults = firstImage?.inference_results?.[0]?.predictions || [];

        return {
            case_id: c.case_id,
            patient: {
                id: c.patient?.patient_id || c.patient_id,
                name: c.patient?.name || `Patient ${c.patient_id?.substring(0, 8)}`,
                age: c.patient?.age || 0,
                sex: c.patient?.sex || 'Unknown',
                symptoms: c.patient?.symptoms || 'No symptoms recorded',
            },
            status: c.status || 'Ready_for_Diagnosis',
            priority: c.priority || 'Non_Critical',
            image: { file_url: imageUrl },
            radiologist_review: {
                radiologist_name: c.upload_tech?.name || 'Radiology Dept',
                confidence_threshold_applied: review?.confidence_threshold_applied ?? 50,
                notes: review?.notes || '',
                edited_predictions: review?.annotations?.edited_predictions || inferenceResults,
            },
            reportStatus: reportStatus
        };
    } catch {
        return null;
    }
};

export function CaseDetailsView({ initialData, caseId }: CaseDetailsViewProps) {
    const router = useRouter();

    const { data: caseData = initialData, isLoading } = useQuery({
        queryKey: ['diagnosis-case', caseId],
        queryFn: () => fetchDiagnosisDetails(caseId),
        initialData: initialData,
    });

    const [finalDiagnosis, setFinalDiagnosis] = React.useState<string>('');
    const [doctorNotes, setDoctorNotes] = React.useState('');
    const [urgency, setUrgency] = React.useState<string>('Non_Critical');

    const visibleAnnotations = React.useMemo(() => {
        if (!caseData?.radiologist_review?.edited_predictions) return [];
        return caseData.radiologist_review.edited_predictions.filter(
            (p: any) => !p.is_false_positive && (p.confidence_score * 100) >= caseData.radiologist_review.confidence_threshold_applied
        );
    }, [caseData]);

    const handleSaveDraft = async () => {
        toast.info('Saving draft...');
        try {
            await api.post(`/diagnoses/${caseId}/draft`, {
                primary_diagnosis: finalDiagnosis || 'Normal',
                diagnosis_notes: doctorNotes,
                urgency_level: urgency,
            });
            toast.success('Draft saved successfully');
        } catch {
            toast.error('Failed to save draft');
        }
    };

    const handleFinalize = async () => {
        if (!finalDiagnosis) {
            toast.error('Please select a final disease classification');
            return;
        }
        toast.info('Finalizing diagnosis...');
        try {
            await api.post(`/diagnoses/${caseId}`, {
                primary_diagnosis: finalDiagnosis,
                diagnosis_notes: doctorNotes,
                urgency_level: urgency,
            });
            toast.success('Diagnosis finalized successfully');
            router.push('/doctor/cases');
        } catch {
            toast.error('Failed to finalize diagnosis');
        }
    };

    if (isLoading && !initialData) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!caseData) return <div>Failed to load case</div>;

    return (
        <div className="flex flex-col min-h-[calc(100vh-6rem)] -mt-4">
            <div className="flex items-center justify-between pb-4 shrink-0 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/doctor/cases')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold tracking-tight">Perform Diagnosis</h1>
                            <CaseStatusBadge status={caseData.status as any} />
                            {caseData.priority === 'Critical' && <Badge variant="destructive">Critical</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">Case: {caseData.case_id} • Radiologist: {caseData.radiologist_review.radiologist_name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="outline" onClick={handleSaveDraft}>
                        <Save className="mr-2 h-4 w-4" /> Save Draft
                    </Button>
                    {caseData.reportStatus?.status === 'ready' ? (
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/doctor/reports/${caseId}`)}
                        >
                            <FileText className="mr-2 h-4 w-4" /> View Report
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={async () => {
                                try {
                                    await api.post(`/reports/${caseId}/regenerate`);
                                    toast.success('Report generation started. Navigating to report preview...');
                                    setTimeout(() => router.push(`/doctor/reports/${caseId}`), 2000);
                                } catch {
                                    toast.error('Failed to generate report');
                                }
                            }}
                        >
                            <FileText className="mr-2 h-4 w-4" /> Generate Report
                        </Button>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700 text-white">
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Finalize Diagnosis
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Diagnosis Submission</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to submit this diagnosis? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleFinalize}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] xl:grid-cols-[280px_1fr_360px] gap-4 min-h-0">
                <aside className="flex flex-col gap-4 overflow-y-auto lg:max-h-[calc(100vh-8rem)] lg:sticky lg:top-4">
                    <div className="border rounded-lg bg-white dark:bg-zinc-900 p-4 space-y-4">
                        <h3 className="font-semibold text-base flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                            Patient Profile
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase mb-0.5">Name</p>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{caseData.patient.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase mb-0.5">Patient ID</p>
                                <p className="font-mono text-gray-900 dark:text-gray-100 text-xs">{caseData.patient.id}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase mb-0.5">Demographics</p>
                                <p className="text-gray-900 dark:text-gray-100">{caseData.patient.age} yrs, {caseData.patient.sex === 'M' ? 'Male' : 'Female'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase mb-0.5">Reported Symptoms</p>
                                <p className="text-gray-900 dark:text-gray-100 italic text-xs leading-relaxed">{caseData.patient.symptoms}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-lg bg-white dark:bg-zinc-900 p-4 space-y-3">
                        <h3 className="font-semibold text-base">Radiologist Findings</h3>
                        <div className="space-y-2">
                            {visibleAnnotations.map((ann: any, index: number) => (
                                <div key={ann.id || `ann-${index}`} className="p-2 border rounded-md flex items-center justify-between bg-card text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${CLASS_COLORS[ann.disease_class] || CLASS_COLORS['Other']}`} />
                                        <span className="font-medium text-xs">{ann.disease_class}</span>
                                    </div>
                                    <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        {(ann.confidence_score * 100).toFixed(0)}%
                                    </span>
                                </div>
                            ))}
                            {visibleAnnotations.length === 0 && (
                                <p className="text-xs text-gray-500 italic">No significant findings.</p>
                            )}
                        </div>

                        {caseData.radiologist_review.notes && (
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg mt-2">
                                <p className="text-xs font-semibold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-1">Notes</p>
                                <div
                                    className="text-xs text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: caseData.radiologist_review.notes }}
                                />
                            </div>
                        )}
                    </div>
                </aside>

                <div className="flex flex-col h-[60vh] lg:h-[calc(100vh-8rem)] lg:sticky lg:top-4 bg-zinc-950 rounded-lg overflow-hidden border border-border">
                    <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
                        <span className="text-zinc-400 font-medium tracking-wide text-xs">DIAGNOSTIC VISUALIZATION (READ-ONLY)</span>
                        <span className="text-zinc-500 text-xs hidden sm:block">By {caseData.radiologist_review.radiologist_name}</span>
                    </div>
                    <div className="flex-1 w-full bg-black relative">
                        <ImageViewer
                            imageUrl={caseData.image.file_url}
                            annotations={visibleAnnotations}
                            mode="view"
                            showAnnotations={true}
                            showScores={true}
                        />
                    </div>
                </div>

                <div className="flex flex-col overflow-y-auto lg:max-h-[calc(100vh-8rem)] lg:sticky lg:top-4">
                    <div className="border rounded-lg bg-white dark:bg-zinc-900 p-4 space-y-4 flex-1">
                        <h3 className="font-semibold text-base flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-gray-500" />
                            Final Diagnosis
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Final Classification <span className="text-red-500">*</span>
                                </label>
                                <Select value={finalDiagnosis} onValueChange={setFinalDiagnosis}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select primary disease..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pneumonia">Pneumonia</SelectItem>
                                        <SelectItem value="Tuberculosis">Tuberculosis</SelectItem>
                                        <SelectItem value="Lung_Tumor">Lung Tumor</SelectItem>
                                        <SelectItem value="Normal">Normal</SelectItem>
                                        <SelectItem value="Other">Other / Multiple</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Follow-up Urgency</label>
                                <Select value={urgency} onValueChange={setUrgency}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select urgency..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Non_Critical">Routine Care</SelectItem>
                                        <SelectItem value="Critical">Immediate Protocol / Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Diagnostic Notes & Recommendations</label>
                                <RichTextEditor
                                    value={doctorNotes}
                                    onChange={setDoctorNotes}
                                    autoSave={false}
                                />
                                <p className="text-xs text-muted-foreground">Included in the final patient report.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
