'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileImage, Search, User, FileWarning, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PatientRegistrationForm } from '@/components/shared/PatientRegistrationForm';
import { Patient } from '@/types';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function UploadXrayPage() {
    const router = useRouter();

    // Patient State
    const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isSearching, setIsSearching] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState<Patient[]>([]);

    // File Upload State
    const [file, setFile] = React.useState<File | null>(null);
    const [dragActive, setDragActive] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [isUploading, setIsUploading] = React.useState(false);
    const [fileError, setFileError] = React.useState<string | null>(null);
    const [duplicateWarning, setDuplicateWarning] = React.useState<boolean>(false);

    // Consent State for Existing Patient
    const [existingPatientConsent, setExistingPatientConsent] = React.useState(false);
    const [isNewRegistration, setIsNewRegistration] = React.useState(false);

    const validateFile = (selectedFile: File): boolean => {
        setFileError(null);
        setDuplicateWarning(false);

        const validTypes = ['image/jpeg', 'image/png', 'application/dicom'];
        const isExtensionValid = /\.(jpg|jpeg|png|dcm|dicom)$/i.test(selectedFile.name);

        if (!validTypes.includes(selectedFile.type) && !isExtensionValid) {
            setFileError('Unsupported format. Please use PNG, JPEG, or DICOM');
            return false;
        }

        if (selectedFile.size > 20 * 1024 * 1024) {
            setFileError('File exceeds maximum size limit (20MB)');
            return false;
        }

        return true;
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (validateFile(droppedFile)) {
                setFile(droppedFile);
                if (droppedFile.name.includes('duplicate')) {
                    setDuplicateWarning(true);
                }
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (validateFile(selectedFile)) {
                setFile(selectedFile);
                if (selectedFile.name.includes('duplicate')) {
                    setDuplicateWarning(true);
                }
            }
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);

        try {
            const response = await api.get('/patients/search', { params: { patient_id: searchQuery.trim() } });
            const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
            setSearchResults(data.map((p: any) => ({
                patient_id: p.patient_id,
                age: p.age,
                sex: p.sex,
                consent_recorded: p.consent_recorded ?? true,
                registered_at: p.registered_at || p.created_at,
                symptoms: p.symptoms,
            })) as Patient[]);
        } catch {
            setSearchResults([]);
        }

        setIsSearching(false);
    };

    // Duplicate confirmation state
    const [showDuplicateConfirm, setShowDuplicateConfirm] = React.useState(false);
    const [pendingCaseId, setPendingCaseId] = React.useState<string | null>(null);

    const uploadImageWithRetry = async (
        caseId: string,
        fileToUpload: File,
        allowDuplicate: boolean = false,
        maxRetries: number = 3
    ): Promise<void> => {
        let lastError: any = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('case_id', caseId);
                if (allowDuplicate) {
                    formData.append('allow_duplicate', 'true');
                }

                await api.post('/images/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const progress = progressEvent.total ?
                            Math.round((progressEvent.loaded * 100) / progressEvent.total) : 50;
                        setUploadProgress(Math.min(progress, 95));
                    },
                });

                return; // Success, exit retry loop
            } catch (err: any) {
                lastError = err;

                // Handle 409 duplicate response
                if (err?.response?.status === 409) {
                    throw err; // Don't retry duplicates, handle separately
                }

                // Only retry on network errors (no response from server)
                const isNetworkError = !err?.response;
                if (!isNetworkError || attempt === maxRetries) {
                    throw err;
                }

                const delayMs = attempt * 1000; // 1s, 2s, 3s
                toast.warning(`Upload failed. Retrying (${attempt}/${maxRetries}) in ${attempt}s...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        throw lastError;
    };

    const handleSubmit = async (allowDuplicate: boolean = false) => {
        if (!file || !selectedPatient) return;

        setIsUploading(true);
        setUploadProgress(0);
        setShowDuplicateConfirm(false);

        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 95) {
                    clearInterval(interval);
                    return 95;
                }
                return prev + 5;
            });
        }, 100);

        try {
            let caseId = pendingCaseId;

            // Create case only if we don't already have one (from a previous duplicate attempt)
            if (!caseId) {
                const caseResponse = await api.post('/cases/', {
                    patient_id: selectedPatient.patient_id,
                    visit_date: new Date().toISOString().split('T')[0]
                });
                caseId = caseResponse.data.case_id;
                setPendingCaseId(caseId);
            }

            await uploadImageWithRetry(caseId!, file, allowDuplicate);

            clearInterval(interval);
            setUploadProgress(100);
            setPendingCaseId(null);

            toast.success('Upload complete! Case is ready for review.');

            setTimeout(() => {
                router.push(`/radiologist/cases/${caseId}`);
            }, 500);

        } catch (err: any) {
            clearInterval(interval);

            // Handle 409 duplicate: show confirmation dialog
            if (err?.response?.status === 409) {
                setIsUploading(false);
                setUploadProgress(0);
                setShowDuplicateConfirm(true);
                toast.warning('A duplicate image was detected. Please confirm if you want to proceed.');
                return;
            }

            setIsUploading(false);
            setPendingCaseId(null);
            setFileError('File appears corrupted or upload failed. Please try another.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[#1C2222] dark:text-white">
                        Upload X-ray
                    </h1>
                    <p className="text-[#1C2222]/40 mt-1 font-medium">Register patient details and upload medical imagery for AI analysis.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">

                {/* Left Column - Patient Info */}
                <section className="space-y-4">
                    <Tabs defaultValue="existing" className="w-full">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="existing">Existing Patient</TabsTrigger>
                            <TabsTrigger value="new">New Patient</TabsTrigger>
                        </TabsList>

                        <TabsContent value="existing" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Select Patient</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!selectedPatient ? (
                                        <>
                                            <form onSubmit={handleSearch} className="flex gap-2">
                                                <Input
                                                    placeholder="Search by Patient ID"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                                <Button type="submit" disabled={isSearching} variant="secondary">
                                                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                                </Button>
                                            </form>

                                            {searchResults.length > 0 && (
                                                <div className="mt-4 rounded-md border text-sm max-h-60 overflow-y-auto">
                                                    {searchResults.map((p) => (
                                                        <div
                                                            key={p.patient_id}
                                                            className="flex justify-between items-center p-3 border-b border-border last:border-0 hover:bg-muted cursor-pointer"
                                                            onClick={() => { setSelectedPatient(p); setIsNewRegistration(false); }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-[#4BA0A2]/20 text-[#4BA0A2] p-2 rounded-full">
                                                                    <User className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-900 dark:text-white">{p.patient_id}</p>
                                                                    <p className="text-xs text-muted-foreground">{p.age} yrs • {p.sex}</p>
                                                                </div>
                                                            </div>
                                                            <Button variant="ghost" size="sm">Select</Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="rounded-lg border border-[#4BA0A2]/20 bg-[#4BA0A2]/5 dark:border-[#4BA0A2]/30 dark:bg-[#4BA0A2]/10 p-4 relative">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                                    onClick={() => { setSelectedPatient(null); setIsNewRegistration(false); }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-[#4BA0A2]/20 text-[#4BA0A2] p-2 rounded-full dark:bg-[#4BA0A2]/30">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-[#1C2222] dark:text-white">{selectedPatient.patient_id}</h3>
                                                        <p className="text-sm text-[#1C2222]/50">
                                                            {selectedPatient.age} yrs • {selectedPatient.sex} • Reg: {selectedPatient.registered_at ? format(new Date(selectedPatient.registered_at), 'MMM yyyy') : 'Unknown'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3 border rounded-lg p-3 bg-muted/30">
                                                <Checkbox
                                                    id="consent"
                                                    checked={existingPatientConsent}
                                                    onCheckedChange={(checked) => setExistingPatientConsent(checked === true)}
                                                />
                                                <Label htmlFor="consent" className="text-sm font-medium leading-snug cursor-pointer">
                                                    I confirm patient consent has been obtained for this visit
                                                </Label>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="new" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Register New Patient</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {!selectedPatient ? (
                                        <PatientRegistrationForm
                                            onSuccess={(patient) => { setSelectedPatient(patient); setIsNewRegistration(true); }}
                                        />
                                    ) : (
                                        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 p-4 relative">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6 rounded-full text-green-700 hover:text-green-900 hover:bg-green-100"
                                                onClick={() => { setSelectedPatient(null); setIsNewRegistration(false); }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-green-100 text-green-700 p-2 rounded-full dark:bg-green-800 dark:text-green-200">
                                                    <CheckCircle2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-green-900 dark:text-green-100">{selectedPatient.patient_id} Registered</h3>
                                                    <p className="text-sm text-green-700 dark:text-green-300">
                                                        {selectedPatient.age} yrs • {selectedPatient.sex} • Consent Verified
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </section>

                {/* Right Column - Image Upload */}
                <section className="space-y-4 flex flex-col h-full">
                    <Card className="flex-1 flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg">Image Upload</CardTitle>
                            <CardDescription>Drag and drop or select file</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col space-y-4">

                            {!file ? (
                                <div
                                    className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center transition-colors flex-1 min-h-[250px]
                            ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}
                            ${fileError ? 'border-red-300 bg-red-50' : ''}
                        `}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <Upload className={`h-10 w-10 mb-4 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <p className="text-base font-medium text-foreground mb-1">
                                        Drag & Drop X-ray image here
                                    </p>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        or click to browse
                                    </p>

                                    <label htmlFor="file-upload">
                                        <Button variant="outline" asChild>
                                            <span>Browse Files</span>
                                        </Button>
                                    </label>
                                    <input
                                        id="file-upload"
                                        type="file"
                                        className="hidden"
                                        accept=".png,.jpg,.jpeg,.dcm,.dicom,image/png,image/jpeg,application/dicom"
                                        onChange={handleChange}
                                    />

                                    <p className="text-xs text-muted-foreground mt-6">
                                        Accepted formats: PNG, JPEG, DICOM • Max 20MB
                                    </p>
                                </div>
                            ) : (
                                <div className="border rounded-lg p-6 bg-muted/10 relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 text-muted-foreground"
                                        onClick={() => { setFile(null); setDuplicateWarning(false); setFileError(null); }}
                                        disabled={isUploading}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                            <FileImage className="h-8 w-8" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground truncate">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>

                                            {isUploading && (
                                                <div className="mt-4 space-y-2">
                                                    <div className="flex justify-between text-xs text-muted-foreground">
                                                        <span>Uploading...</span>
                                                        <span>{uploadProgress}%</span>
                                                    </div>
                                                    <Progress value={uploadProgress} className="h-2" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {fileError && (
                                <Alert variant="destructive">
                                    <FileWarning className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{fileError}</AlertDescription>
                                </Alert>
                            )}

                            {duplicateWarning && (
                                <Alert className="bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-900">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                                    <AlertTitle className="text-yellow-800 dark:text-yellow-300">Duplicate Found</AlertTitle>
                                    <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                                        This image already exists in the system. Are you sure you want to proceed?
                                    </AlertDescription>
                                    <div className="mt-3 flex gap-3">
                                        <Button variant="outline" size="sm" className="bg-white text-yellow-800 border-yellow-300 hover:bg-yellow-100" onClick={() => setDuplicateWarning(false)}>
                                            Proceed anyway
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-yellow-800 hover:bg-yellow-200" onClick={() => { setFile(null); setDuplicateWarning(false); }}>
                                            Cancel
                                        </Button>
                                    </div>
                                </Alert>
                            )}

                            {showDuplicateConfirm && (
                                <Alert className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-900">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                                    <AlertTitle className="text-amber-800 dark:text-amber-300">Duplicate Image Detected</AlertTitle>
                                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                                        The server detected this image already exists. Do you want to upload it anyway?
                                    </AlertDescription>
                                    <div className="mt-3 flex gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-white text-amber-800 border-amber-300 hover:bg-amber-100"
                                            onClick={() => handleSubmit(true)}
                                        >
                                            Yes, upload anyway
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-amber-800 hover:bg-amber-200"
                                            onClick={() => { setShowDuplicateConfirm(false); setPendingCaseId(null); }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </Alert>
                            )}

                        </CardContent>
                        <CardFooter className="pt-2 border-t mt-auto">
                            <Button
                                className="w-full bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-xl font-bold"
                                size="lg"
                                disabled={
                                    !file ||
                                    !selectedPatient ||
                                    isUploading ||
                                    (!isNewRegistration && !existingPatientConsent)
                                }
                                onClick={() => handleSubmit(false)}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Analyzing with AI...
                                    </>
                                ) : "Upload & Analyze"}
                            </Button>
                        </CardFooter>
                    </Card>
                </section>
            </div>
        </div>
    );
}
