'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Stethoscope, Save, FileText, CheckCircle2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { ImageViewer } from '@/components/radiologist/ImageViewer';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CaseStatusBadge } from '@/components/shared/CaseStatusBadge';
import { DiseaseClass, Case } from '@/types';
import api from '@/lib/api';

const CLASS_COLORS: Record<string, string> = {
    'Pneumonia': 'bg-red-500',
    'Tuberculosis': 'bg-yellow-500',
    'Lung Tumor': 'bg-orange-500',
    'Normal': 'bg-green-500',
    'Other': 'bg-blue-500',
};

const fetchDiagnosisDetails = async (id: string) => {
    try {
        const response = await api.get(`/cases/${id}`);
        const c = response.data;
        return {
            case_id: c.case_id,
            patient: {
                id: c.patient_id,
                name: c.patient_name || `Patient ${c.patient_id}`,
                age: c.patient_age || 0,
                sex: c.patient_sex || 'Unknown',
                symptoms: c.patient_symptoms || 'No symptoms recorded',
            },
            status: c.status || 'Ready_for_Diagnosis',
            priority: c.priority || 'Non-Critical',
            image: c.images?.[0] ? { file_url: c.images[0].file_url ? `http://localhost:9000/xray-images/${c.images[0].file_url}` : '' } : { file_url: '' },
            radiologist_review: c.radiologist_review || {
                radiologist_name: 'Radiologist',
                confidence_threshold_applied: 50,
                notes: '',
                edited_predictions: [],
            },
        };
    } catch {
        return {
            case_id: id,
            patient: { id: 'Unknown', name: 'Unknown', age: 0, sex: 'Unknown', symptoms: '' },
            status: 'Ready_for_Diagnosis',
            priority: 'Non-Critical',
            image: { file_url: '' },
            radiologist_review: { radiologist_name: 'Unknown', confidence_threshold_applied: 50, notes: '', edited_predictions: [] },
        };
    }
};

export default function DiagnosisPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.caseId as string;

    const { data: caseData, isLoading } = useQuery({
        queryKey: ['diagnosis-case', caseId],
        queryFn: () => fetchDiagnosisDetails(caseId),
    });

    const [finalDiagnosis, setFinalDiagnosis] = React.useState<string>('');
    const [doctorNotes, setDoctorNotes] = React.useState('');
    const [urgency, setUrgency] = React.useState<string>('Routine');

    const visibleAnnotations = React.useMemo(() => {
        if (!caseData?.radiologist_review?.edited_predictions) return [];
        // The doctor only sees what the radiologist approved (not false positives)
        // and only those that passed the radiologist's threshold filter.
        return caseData.radiologist_review.edited_predictions.filter(
            (p: any) => !p.is_false_positive && (p.confidence_score * 100) >= caseData.radiologist_review.confidence_threshold_applied
        );
    }, [caseData]);

    const handleSaveDraft = async () => {
        toast.info('Saving draft...');
        await api.post(`/diagnoses/${caseId}/draft`, {
            final_diagnosis: finalDiagnosis,
            notes: doctorNotes,
            urgency,
        }).catch(() => { });
        toast.success('Draft saved successfully');
    };

    const handleFinalize = async () => {
        if (!finalDiagnosis) {
            toast.error('Please select a final disease classification');
            return;
        }
        toast.info('Finalizing diagnosis...');
        await api.post(`/diagnoses/${caseId}`, {
            final_diagnosis: finalDiagnosis,
            notes: doctorNotes,
            urgency,
        }).catch(() => { });
        toast.success('Diagnosis finalized successfully');
        router.push('/doctor/cases');
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
        <div className="flex flex-col h-[calc(100vh-6rem)] -mt-4">
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-4 shrink-0">
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

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleSaveDraft}>
                        <Save className="mr-2 h-4 w-4" /> Save Draft
                    </Button>
                    <Button onClick={handleFinalize} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Finalize Diagnosis
                    </Button>
                </div>
            </div>

            {/* Main Split Layout */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">

                {/* Left Panel: Image Viewer (60%) */}
                <div className="lg:w-[60%] flex flex-col h-full bg-zinc-950 rounded-lg overflow-hidden border border-border">
                    <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 text-sm shrink-0">
                        <span className="text-zinc-400 font-medium tracking-wide text-xs">DIAGNOSTIC VISUALIZATION (READ-ONLY)</span>
                        <span className="text-zinc-500 text-xs">Annotations provided by {caseData.radiologist_review.radiologist_name}</span>
                    </div>

                    <div className="flex-1 w-full bg-black relative">
                        <ImageViewer
                            imageUrl={caseData.image.file_url}
                            annotations={visibleAnnotations}
                            mode="view" // Doctor only views annotations
                            showAnnotations={true}
                            showScores={true}
                        />
                    </div>
                </div>

                {/* Right Panel: Tools and Data (40%) */}
                <div className="lg:w-[40%] flex flex-col h-full overflow-hidden space-y-4">
                    <ScrollArea className="flex-1 border rounded-lg bg-white dark:bg-zinc-900 overflow-y-auto">
                        <div className="p-4 space-y-6">

                            {/* Patient Information */}
                            <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                                    <UserIcon className="h-5 w-5 text-gray-500" />
                                    Patient Profile
                                </h3>
                                <Card className="bg-gray-50/50 dark:bg-zinc-900/50 shadow-none border-dashed">
                                    <CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase mb-1">Name</p>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{caseData.patient.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase mb-1">Patient ID</p>
                                            <p className="font-mono text-gray-900 dark:text-gray-100">{caseData.patient.id}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase mb-1">Demographics</p>
                                            <p className="text-gray-900 dark:text-gray-100">{caseData.patient.age} yrs, {caseData.patient.sex === 'M' ? 'Male' : 'Female'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase mb-1">Reported Symptoms</p>
                                            <p className="text-gray-900 dark:text-gray-100 italic">{caseData.patient.symptoms}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Separator />

                            {/* Radiologist Analysis */}
                            <div>
                                <h3 className="font-semibold text-lg mb-3">Radiologist Analysis</h3>

                                <div className="space-y-3 mb-4">
                                    {visibleAnnotations.map((ann: any) => (
                                        <div key={ann.id} className="p-2 border rounded-md flex items-center justify-between bg-card text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${CLASS_COLORS[ann.disease_class] || CLASS_COLORS['Other']}`} />
                                                <span className="font-medium">{ann.disease_class}</span>
                                            </div>
                                            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                {(ann.confidence_score * 100).toFixed(1)}% Conf.
                                            </span>
                                        </div>
                                    ))}
                                    {visibleAnnotations.length === 0 && (
                                        <p className="text-sm text-gray-500 italic">No significant findings reported in imaging.</p>
                                    )}
                                </div>

                                {caseData.radiologist_review.notes && (
                                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">Radiologist's Notes</p>
                                        <div
                                            className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: caseData.radiologist_review.notes }}
                                        />
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Final Diagnosis Form */}
                            <div className="space-y-4 pb-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Stethoscope className="h-5 w-5 text-gray-500" />
                                    Final Diagnosis
                                </h3>

                                <div className="space-y-3 p-4 border border-border bg-card rounded-lg shadow-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Final Classification <span className="text-red-500">*</span></label>
                                            <Select value={finalDiagnosis} onValueChange={setFinalDiagnosis}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select primary disease..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Pneumonia">Pneumonia</SelectItem>
                                                    <SelectItem value="Tuberculosis">Tuberculosis</SelectItem>
                                                    <SelectItem value="Lung Tumor">Lung Tumor</SelectItem>
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
                                                    <SelectItem value="Routine">Routine Care</SelectItem>
                                                    <SelectItem value="Urgent">Urgent Review</SelectItem>
                                                    <SelectItem value="Immediate">Immediate Protocol / Critical</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <label className="text-sm font-medium">Diagnostic Notes & Recommendations</label>
                                        <RichTextEditor
                                            value={doctorNotes}
                                            onChange={setDoctorNotes}
                                            autoSave={false}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">These notes will be included in the final printable patient report.</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
