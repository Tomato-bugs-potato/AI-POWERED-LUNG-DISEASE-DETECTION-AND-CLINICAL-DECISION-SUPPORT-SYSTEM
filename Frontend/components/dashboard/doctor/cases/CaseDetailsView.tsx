'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Stethoscope, Save, FileText, CheckCircle2, User as UserIcon, RefreshCw,
    Eye, EyeOff, Check, Flame, Loader2, Square,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
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
import { ClassificationBanner } from '@/components/shared/ClassificationBanner';
import { LungScanAnimation } from '@/components/shared/LungScanAnimation';
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
        const [caseRes, reviewRes, reportStatusRes, diagnosisRes] = await Promise.allSettled([
            api.get(`/cases/${id}`),
            api.get(`/reviews/${id}`),
            api.get(`/reports/${id}/status`),
            api.get(`/diagnoses/${id}`),
        ]);

        const c = caseRes.status === 'fulfilled' ? caseRes.value.data : null;
        if (!c) throw new Error("Case not found");

        const review = reviewRes.status === 'fulfilled' ? reviewRes.value.data : null;
        const reportStatus = reportStatusRes.status === 'fulfilled' ? reportStatusRes.value.data : null;
        const draft = diagnosisRes.status === 'fulfilled' ? diagnosisRes.value.data : null;

        let imageUrl = '';
        const firstImage = c.images?.[0];
        if (firstImage?.image_id) {
            if (typeof window !== 'undefined') {
                try {
                    const imgRes = await api.get(`/images/${firstImage.image_id}/proxy`, {
                        responseType: 'blob',
                    });
                    imageUrl = URL.createObjectURL(imgRes.data);
                } catch (err: any) {
                    console.error(
                        `[CaseDetailsView] /images/${firstImage.image_id}/proxy failed:`,
                        err?.response?.status,
                        err?.response?.data || err?.message,
                    );
                    imageUrl = '';
                }
            }
        }
        let inferenceResults = firstImage?.inference_results?.[0]?.predictions || [];
        const lungSegmentation = firstImage?.inference_results?.[0]?.lung_segmentation || null;
        const aiClassification = firstImage?.inference_results?.[0]?.classification || null;

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
            ai_classification: aiClassification,
            lung_segmentation: lungSegmentation,
            radiologist_review: {
                radiologist_name: c.upload_tech?.name || 'Radiology Dept',
                confidence_threshold_applied: review?.confidence_threshold_applied ?? 50,
                notes: review?.notes || '',
                edited_predictions: review?.annotations?.edited_predictions || inferenceResults,
            },
            draft: draft
                ? {
                    primary_diagnosis: draft.primary_diagnosis || '',
                    diagnosis_notes: draft.diagnosis_notes || '',
                    urgency_level: draft.urgency_level || 'Non_Critical',
                }
                : null,
            reportStatus: reportStatus,
            image_id: firstImage?.image_id || null
        };
    } catch {
        return null;
    }
};

export function CaseDetailsView({ initialData, caseId }: CaseDetailsViewProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: caseData = initialData, isLoading } = useQuery({
        queryKey: ['diagnosis-case', caseId],
        queryFn: () => fetchDiagnosisDetails(caseId),
        initialData: initialData,
        staleTime: 0, // Force background refetch to get the image proxy blob URL
        refetchOnMount: 'always',
        // Poll until inference results land so the doctor can re-evaluate or
        // open a case the moment AI finishes — same behaviour as radiologist.
        refetchInterval: (query) => {
            const d: any = query.state.data;
            const aiReady = !!d?.radiologist_review?.edited_predictions?.length
                || !!d?.ai_classification
                || !!d?.lung_segmentation;
            return aiReady ? false : 4000;
        },
        refetchIntervalInBackground: false,
    });

    const aiReady = !!caseData?.radiologist_review?.edited_predictions?.length
        || !!caseData?.ai_classification
        || !!caseData?.lung_segmentation;

    const [finalDiagnosis, setFinalDiagnosis] = React.useState<string>('');
    const [doctorNotes, setDoctorNotes] = React.useState('');
    const [urgency, setUrgency] = React.useState<string>('Non_Critical');

    // Viewer controls — the doctor needs the same overlay / heatmap / threshold
    // affordances the radiologist had, so they can verify findings independently.
    const [showAnnotations, setShowAnnotations] = React.useState(true);
    const [showScores, setShowScores] = React.useState(true);
    const [showHeatmap, setShowHeatmap] = React.useState(false);
    const [doctorThreshold, setDoctorThreshold] = React.useState<number | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);

    const imageId = caseData?.image_id;
    // Prefetch the heatmap as soon as inference results land — Grad-CAM
    // generation is slow, but the response is deterministic, so kicking it
    // off in the background while the doctor reads findings makes the
    // Heatmap toggle feel instant.
    const { data: heatmapBlobUrl, isFetching: isFetchingHeatmap } = useQuery({
        queryKey: ['doctor-heatmap', imageId],
        enabled: !!imageId && aiReady,
        staleTime: 15 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        queryFn: async () => {
            const resp = await api.get(`/inference/${imageId}/heatmap`, { responseType: 'blob' });
            return URL.createObjectURL(resp.data);
        },
    });

    React.useEffect(() => {
        return () => {
            if (heatmapBlobUrl) {
                URL.revokeObjectURL(heatmapBlobUrl);
                queryClient.setQueryData(['doctor-heatmap', imageId], null);
            }
        };
    }, [heatmapBlobUrl, imageId, queryClient]);

    const handleToggleHeatmap = () => {
        if (!showHeatmap && !imageId) {
            toast.error('Image not loaded yet');
            return;
        }
        setShowHeatmap(v => !v);
    };

    // Threshold the doctor sees defaults to the one the radiologist applied,
    // but the doctor can dial it down on the fly to inspect lower-confidence
    // detections without changing the saved review.
    const effectiveThreshold = doctorThreshold ?? caseData?.radiologist_review?.confidence_threshold_applied ?? 50;

    // Hydrate the form from any previously saved draft.
    React.useEffect(() => {
        if (caseData?.draft) {
            setFinalDiagnosis(caseData.draft.primary_diagnosis || '');
            setDoctorNotes(caseData.draft.diagnosis_notes || '');
            setUrgency(caseData.draft.urgency_level || 'Non_Critical');
        }
    }, [caseData?.draft]);

    const visibleAnnotations = React.useMemo(() => {
        if (!caseData?.radiologist_review?.edited_predictions) return [];
        return caseData.radiologist_review.edited_predictions.filter(
            (p: any) => !p.is_false_positive && (p.confidence_score * 100) >= effectiveThreshold
        );
    }, [caseData, effectiveThreshold]);

    const handleSaveDraft = async () => {
        toast.info('Saving draft...');
        try {
            await api.post(`/diagnoses/${caseId}/draft`, {
                primary_diagnosis: finalDiagnosis || 'Normal',
                diagnosis_notes: doctorNotes,
                urgency_level: urgency,
            });
            await queryClient.invalidateQueries({ queryKey: ['diagnosis-case', caseId] });
            toast.success('Draft saved successfully');
        } catch (e: any) {
            console.error('[CaseDetailsView] draft save failed:', e?.response?.status, e?.response?.data);
            const detail = e?.response?.data?.detail;
            toast.error(typeof detail === 'string' ? detail : 'Failed to save draft');
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
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['diagnosis-case', caseId] }),
                queryClient.invalidateQueries({ queryKey: ['doctor-cases'] })
            ]);
            toast.success('Diagnosis finalized successfully');
            router.push('/doctor/cases');
        } catch {
            toast.error('Failed to finalize diagnosis');
        }
    };

    const handleReEvaluate = async () => {
        const imageId = caseData?.image_id;
        if (!imageId) {
            toast.error('No image found for re-evaluation');
            return;
        }

        toast.info('Requesting AI re-evaluation...');
        try {
            await api.post(`/inference/${imageId}/retry`);
            toast.success('AI Re-evaluation queued. Results will refresh soon.');
            // Refetch data after a short delay to see if status updated
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['diagnosis-case', caseId] });
            }, 3000);
        } catch (error: any) {
            const msg = error.response?.data?.detail || 'Failed to trigger AI re-evaluation';
            toast.error(msg);
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
                    <Button variant="outline" onClick={handleReEvaluate} className="hover:bg-teal-50 hover:text-teal-600 border-teal-100">
                        <RefreshCw className="mr-2 h-4 w-4" /> Re-evaluate AI
                    </Button>
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
                            disabled={isGeneratingReport}
                            onClick={async () => {
                                setIsGeneratingReport(true);
                                try {
                                    await api.post(`/reports/${caseId}/regenerate`);
                                    toast.success('Report generation started. Navigating to report preview...');
                                    setTimeout(() => router.push(`/doctor/reports/${caseId}`), 2000);
                                } catch {
                                    toast.error('Failed to generate report');
                                    setIsGeneratingReport(false);
                                }
                            }}
                        >
                            {isGeneratingReport ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileText className="mr-2 h-4 w-4" />
                            )}
                            {isGeneratingReport ? 'Generating...' : 'Generate Report'}
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
                    <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                            <span className="text-zinc-400 font-medium tracking-wide text-xs">DIAGNOSTIC VISUALIZATION</span>
                            <span className="text-zinc-600 text-xs hidden md:inline">·</span>
                            <span className="text-zinc-500 text-xs hidden md:block">By {caseData.radiologist_review.radiologist_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 ${showAnnotations ? 'text-blue-400' : 'text-zinc-400'}`}
                                onClick={() => setShowAnnotations(v => !v)}
                                disabled={showHeatmap}
                                title={showHeatmap ? 'Boxes are baked into the heatmap view' : 'Toggle bounding boxes'}
                            >
                                {showAnnotations ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                                Boxes
                            </Button>
                            <div className="w-px h-4 bg-zinc-700 mx-1" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 ${showHeatmap ? 'text-orange-400' : 'text-zinc-400'}`}
                                onClick={handleToggleHeatmap}
                                disabled={!imageId}
                                title={isFetchingHeatmap ? 'Heatmap is loading in the background' : 'Toggle Grad-CAM heatmap'}
                            >
                                {isFetchingHeatmap
                                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    : <Flame className="mr-2 h-4 w-4" />}
                                Heatmap
                            </Button>
                            <div className="w-px h-4 bg-zinc-700 mx-1" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 ${showScores ? 'text-blue-400' : 'text-zinc-400'}`}
                                onClick={() => setShowScores(v => !v)}
                                disabled={showHeatmap}
                            >
                                <Check className="mr-2 h-4 w-4" />
                                Scores
                            </Button>
                        </div>
                    </div>
                    <ClassificationBanner classification={caseData.ai_classification} />

                    {/* Confidence threshold slider — lets the doctor look beyond
                        what the radiologist filtered, without altering the saved
                        review. */}
                    {aiReady && !showHeatmap && (
                        <div className="bg-zinc-900/60 border-b border-zinc-800 px-4 py-2 flex items-center gap-3 shrink-0">
                            <Square className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">
                                Confidence ≥ {Math.round(effectiveThreshold)}%
                            </span>
                            <Slider
                                value={[effectiveThreshold]}
                                onValueChange={(v) => setDoctorThreshold(v[0])}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1"
                            />
                            <span className="text-xs text-zinc-500 whitespace-nowrap">
                                {visibleAnnotations.length} shown
                            </span>
                        </div>
                    )}

                    <div className="flex-1 w-full bg-black relative">
                        {aiReady ? (
                            <ImageViewer
                                imageUrl={showHeatmap && heatmapBlobUrl ? heatmapBlobUrl : caseData.image.file_url}
                                annotations={visibleAnnotations}
                                lungSegmentation={caseData.lung_segmentation}
                                mode="view"
                                showAnnotations={showAnnotations && !showHeatmap}
                                showScores={showScores && !showHeatmap}
                            />
                        ) : (
                            <LungScanAnimation
                                label="Scanning X-ray"
                                sublabel="Detection + classification are still running. The image will appear with bounding boxes as soon as results arrive."
                                imageUrl={caseData?.image?.file_url}
                            />
                        )}
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
        </div >
    );
}
