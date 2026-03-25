'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Send, Eye, EyeOff, Check, X, AlertTriangle, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

import { ImageViewer } from '@/components/radiologist/ImageViewer';
import { ConfidenceSlider } from '@/components/radiologist/ConfidenceSlider';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CaseStatusBadge } from '@/components/shared/CaseStatusBadge';
import { Prediction, Case, DiseaseClass } from '@/types';
import api from '@/lib/api';

const CLASS_COLORS: Record<string, string> = {
    'Pneumonia': 'bg-red-500',
    'Tuberculosis': 'bg-yellow-500',
    'Lung_Tumor': 'bg-orange-500',
    'Normal': 'bg-green-500',
    'Other': 'bg-blue-500',
};

const fetchCaseDetails = async (id: string): Promise<Case> => {
    try {
        const response = await api.get(`/cases/${id}`);
        const c = response.data;

        // Fetch image bytes through API proxy (includes JWT auth), create blob URL for canvas
        let imageUrl = '';
        const firstImage = c.images?.[0];
        if (firstImage?.image_id) {
            try {
                const imgRes = await api.get(`/images/${firstImage.image_id}/proxy`, {
                    responseType: 'blob',
                });
                imageUrl = URL.createObjectURL(imgRes.data);
            } catch {
                imageUrl = firstImage.file_url ? `http://localhost:9000/xray-images/${firstImage.file_url}` : '';
            }
        }

        // Polling for inference results — AI inference is async so we retry with backoff
        let inferenceData = firstImage?.inference_results?.[0];
        let attempts = 0;
        const maxAttempts = 30; // up to ~60 seconds total

        while (!inferenceData && attempts < maxAttempts) {
            const delay = attempts < 5 ? 1000 : 2000; // 1s for first 5, then 2s
            await new Promise(resolve => setTimeout(resolve, delay));
            const retryResponse = await api.get(`/cases/${id}`);
            const retryC = retryResponse.data;

            const newFirstImage = retryC.images?.[0];
            if (newFirstImage) {
                inferenceData = newFirstImage.inference_results?.[0];
                // Refresh image URL via proxy if not already set
                if (!imageUrl && newFirstImage.image_id) {
                    try {
                        const imgRes = await api.get(`/images/${newFirstImage.image_id}/proxy`, {
                            responseType: 'blob',
                        });
                        imageUrl = URL.createObjectURL(imgRes.data);
                    } catch {
                        imageUrl = newFirstImage.file_url ? `http://localhost:9000/xray-images/${newFirstImage.file_url}` : imageUrl;
                    }
                }
            }
            attempts++;
        }

        const predictions = (inferenceData?.predictions || []).map((p: any, idx: number) => ({
            id: `pred-${idx}`,
            disease_class: p.disease_class || 'Unknown',
            confidence_score: p.confidence_score || 0,
            bounding_box: p.bounding_box || { x: 0, y: 0, w: 0, h: 0 },
            is_false_positive: false,
        }));

        return {
            case_id: c.case_id,
            patient_id: c.patient_id,
            status: c.status,
            priority: c.priority || 'Non_Critical',
            upload_date: c.created_at || new Date().toISOString(),
            image: firstImage ? { image_id: firstImage.image_id, file_url: imageUrl, upload_date: firstImage.uploaded_at || '', format: firstImage.file_format || 'DICOM' } : { image_id: '', file_url: '', upload_date: '', format: 'DICOM' },
            inference_result: {
                inference_id: inferenceData?.inference_id || '',
                model_version: inferenceData?.model_version || '',
                processing_time_ms: (inferenceData?.processing_time_sec || 0) * 1000,
                predictions,
            },
        };
    } catch {
        return {
            case_id: id,
            patient_id: 'Unknown',
            status: 'Pending_Review',
            priority: 'Non_Critical',
            upload_date: new Date().toISOString(),
            image: { image_id: '', file_url: '', upload_date: '', format: 'DICOM' },
            inference_result: { inference_id: '', model_version: '', processing_time_ms: 0, predictions: [] },
        };
    }
};

export default function ReviewPredictionsPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.caseId as string;

    const { data: caseData, isLoading } = useQuery({
        queryKey: ['case', caseId],
        queryFn: () => fetchCaseDetails(caseId),
    });

    // State
    const [annotations, setAnnotations] = React.useState<Prediction[]>([]);
    const [threshold, setThreshold] = React.useState(30);
    const [notes, setNotes] = React.useState('');
    const [showAnnotations, setShowAnnotations] = React.useState(true);
    const [showScores, setShowScores] = React.useState(true);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [priority, setPriority] = React.useState<string>('Non_Critical');
    const [confirmRemoveAll, setConfirmRemoveAll] = React.useState(false);
    const [confirmRevert, setConfirmRevert] = React.useState(false);

    // Initialize annotations from AI inference
    React.useEffect(() => {
        if (caseData?.inference_result?.predictions) {
            setAnnotations(JSON.parse(JSON.stringify(caseData.inference_result.predictions))); // Deep copy
        }
        if (caseData?.priority) {
            setPriority(caseData.priority);
        }
    }, [caseData]);

    const visibleAnnotations = annotations.filter(
        a => !a.is_false_positive && (a.confidence_score * 100) >= threshold
    );

    const handleUpdateAnnotation = (updatedAnns: Prediction[]) => {
        // Merge new bounding box changes while keeping metadata like is_false_positive
        setAnnotations(updatedAnns);
    };

    const handleToggleFalsePositive = (id: string, value: boolean) => {
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, is_false_positive: value } : a));
    };

    const handleChangeClass = (id: string, newClass: DiseaseClass) => {
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, disease_class: newClass } : a));
        setEditingId(null);
    };

    const handleFocusClick = (_id: string) => {
        toast.info('Focusing on detection region...');
    };

    const handleRemoveAll = () => {
        setConfirmRemoveAll(true);
    };

    const confirmRemoveAllAction = () => {
        setAnnotations(prev => prev.map(a => ({ ...a, is_false_positive: true })));
        setConfirmRemoveAll(false);
    };

    const handleRevert = () => {
        setConfirmRevert(true);
    };

    const confirmRevertAction = () => {
        if (caseData?.inference_result?.predictions) {
            setAnnotations(JSON.parse(JSON.stringify(caseData.inference_result.predictions)));
        }
        setConfirmRevert(false);
    };

    const handleSaveProgress = async () => {
        try {
            toast.info('Saving progress...');
            await api.post(`/reviews/${caseId}`, {
                annotations: { edited_predictions: annotations },
                notes,
                confidence_threshold_applied: threshold,
                priority,
            }).catch(() => { });
            toast.success('Progress saved');
        } catch (e) {
            toast.error('Failed to save progress');
        }
    };

    const handleSubmit = async () => {
        try {
            toast.info('Submitting review to Doctor...');
            await api.post(`/reviews/${caseId}`, {
                annotations: { edited_predictions: annotations },
                notes,
                confidence_threshold_applied: threshold,
                priority,
            }).catch(() => { });

            // Send case to doctor
            await api.post(`/reviews/${caseId}/send`);

            toast.success('Case submitted successfully');
            router.push('/radiologist/cases');
        } catch (e) {
            toast.error('Submission failed');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!caseData) return <div>Failed to load case</div>;

    return (
        <div className="flex flex-col min-h-[calc(100vh-6rem)] -mt-4">
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/radiologist/cases')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold tracking-tight">Review AI Predictions</h1>
                            <CaseStatusBadge status={caseData.status} />
                            {priority === 'Critical' && <Badge variant="destructive">Critical Priority</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">Case: {caseData.case_id} • Patient: {caseData.patient_id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleSaveProgress} aria-label="Save review as draft">
                        <Save className="mr-2 h-4 w-4" /> Save Draft
                    </Button>
                    <Button onClick={handleSubmit} aria-label="Submit review and send case to doctor for diagnosis">
                        <Send className="mr-2 h-4 w-4" /> Send to Doctor
                    </Button>
                </div>
            </div>

            {/* Main Split Layout */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6">

                {/* Left Panel: Image Viewer (60%) */}
                <div className="lg:w-[60%] flex flex-col h-[60vh] lg:h-[calc(100vh-8rem)] lg:sticky lg:top-4 bg-zinc-950 rounded-lg overflow-hidden border border-border">

                    {/* Viewer Toolbar */}
                    <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 text-sm shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-zinc-400 font-medium tracking-wide text-xs">AI VISUALIZATION</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 ${showAnnotations ? 'text-blue-400' : 'text-zinc-400'}`}
                                onClick={() => setShowAnnotations(!showAnnotations)}
                            >
                                {showAnnotations ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                                Overlays
                            </Button>
                            <div className="w-px h-4 bg-zinc-700 mx-1" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 ${showScores ? 'text-blue-400' : 'text-zinc-400'}`}
                                onClick={() => setShowScores(!showScores)}
                            >
                                <Check className="mr-2 h-4 w-4" />
                                Scores
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 w-full bg-black relative">
                        <ImageViewer
                            imageUrl={caseData.image.file_url}
                            annotations={visibleAnnotations} // Pass visible only
                            mode="edit"
                            onAnnotationsChange={handleUpdateAnnotation}
                            showAnnotations={showAnnotations}
                            showScores={showScores}
                        />
                    </div>
                </div>

                {/* Right Panel: Tools and Data (40%) */}
                <div className="lg:w-[40%] flex flex-col space-y-4">

                    {/* Confidence Filter */}
                    <div className="shrink-0">
                        <ConfidenceSlider
                            value={threshold}
                            onChange={setThreshold}
                            totalCount={annotations.length}
                            visibleCount={visibleAnnotations.length}
                        />
                    </div>

                    <div className="flex-1 border rounded-lg bg-white dark:bg-zinc-900 p-4">
                        <div className="space-y-6 pb-6">

                            {/* Predictions List */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        Analysis Results
                                    </h3>
                                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-red-500" onClick={handleRemoveAll}>
                                        Mark All False Positive
                                    </Button>
                                </div>

                                {confirmRemoveAll && (
                                    <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 text-sm">
                                        <p className="text-red-800 dark:text-red-300 font-medium mb-2">Mark all detections as false positives?</p>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={confirmRemoveAllAction}>Confirm</Button>
                                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmRemoveAll(false)}>Cancel</Button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {annotations.map((ann) => {
                                        const isFiltered = (ann.confidence_score * 100) < threshold;
                                        const isDeleted = ann.is_false_positive;

                                        if (isFiltered && !isDeleted) return null; // Hide filtered, but show manually deleted ones as grayed out

                                        return (
                                            <div
                                                key={ann.id}
                                                className={`p-3 border rounded-lg flex flex-col gap-2 transition-opacity
                                     ${isDeleted ? 'bg-muted border-dashed opacity-50' : 'bg-card border-border'}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <div className={`w-3 h-3 rounded-full ${CLASS_COLORS[ann.disease_class] || CLASS_COLORS['Other']} ${isDeleted && 'bg-gray-400 opacity-50'}`} />

                                                        {editingId === ann.id ? (
                                                            <Select defaultValue={ann.disease_class} onValueChange={(v) => handleChangeClass(ann.id!, v as DiseaseClass)}>
                                                                <SelectTrigger className="h-7 w-[160px] text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Pneumonia">Pneumonia</SelectItem>
                                                                    <SelectItem value="Tuberculosis">Tuberculosis</SelectItem>
                                                                    <SelectItem value="Lung Tumor">Lung Tumor</SelectItem>
                                                                    <SelectItem value="Normal">Normal</SelectItem>
                                                                    <SelectItem value="Other">Other</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <span className={`font-medium ${isDeleted && 'line-through'}`}>{ann.disease_class}</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {!isDeleted && (
                                                            <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                                {(ann.confidence_score * 100).toFixed(1)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/50">
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => handleFocusClick(ann.id!)}>
                                                        Focus
                                                    </Button>

                                                    <div className="flex items-center gap-1">
                                                        {!isDeleted && (
                                                            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setEditingId(ann.id!)}>
                                                                Edit
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={`h-7 text-xs px-2 ${isDeleted ? 'text-green-600' : 'text-red-500'}`}
                                                            onClick={() => handleToggleFalsePositive(ann.id!, !isDeleted)}
                                                        >
                                                            {isDeleted ? 'Restore' : 'False Positive'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {annotations.filter(a => !a.is_false_positive).length === 0 && (
                                        <div className="p-4 border border-dashed rounded-lg bg-muted/50">
                                            <p className="text-sm text-gray-500 mb-3">No abnormalities detected.</p>
                                            {confirmRevert ? (
                                                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 text-sm">
                                                    <p className="text-amber-800 dark:text-amber-300 font-medium mb-2">Revert to original AI predictions? All manual edits will be lost.</p>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300" onClick={confirmRevertAction}>
                                                            <RotateCcw className="mr-1 h-3 w-3" /> Revert
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmRevert(false)}>Cancel</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button variant="outline" size="sm" className="text-xs" onClick={handleRevert}>
                                                    <RotateCcw className="mr-1 h-3 w-3" /> Revert to original AI predictions
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Priority Setter */}
                            <div>
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-gray-500" />
                                    Case Priority
                                </h3>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select case priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Non_Critical">Non-Critical</SelectItem>
                                        <SelectItem value="Critical">Critical (Immediate Attention)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            {/* Notes Editor */}
                            <div>
                                <h3 className="font-semibold text-lg mb-4">Radiologist Notes</h3>
                                <RichTextEditor
                                    value={notes}
                                    onChange={setNotes}
                                    autoSave
                                />
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
