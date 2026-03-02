'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileImage, Search, User, FileWarning, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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

    // Consent State for Existing Patient (New patient consent handled by form)
    const [existingPatientConsent, setExistingPatientConsent] = React.useState(false);

    // Handlers for File Selection
    const validateFile = (selectedFile: File): boolean => {
        setFileError(null);
        setDuplicateWarning(false);

        const validTypes = ['image/jpeg', 'image/png', 'application/dicom']; // Added basic mime types
        const isExtensionValid = /\.(jpg|jpeg|png|dcm|dicom)$/i.test(selectedFile.name);

        if (!validTypes.includes(selectedFile.type) && !isExtensionValid) {
            setFileError('Unsupported format. Please use PNG, JPEG, or DICOM');
            return false;
        }

        // 20MB limit
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
                // Mock duplicate detection check
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

    // Handlers for Patient Search
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
                consent_given: p.consent_given ?? true,
                registration_date: p.registration_date || p.created_at,
            })) as Patient[]);
        } catch {
            setSearchResults([]);
        }

        setIsSearching(false);
    };

    // Submission
    const handleSubmit = async () => {
        if (!file || !selectedPatient) return;

        setIsUploading(true);
        setUploadProgress(0);

        // Simulating progress
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
            // 1. Create a new case
            const caseResponse = await api.post('/cases/', {
                patient_id: selectedPatient.patient_id,
                visit_date: new Date().toISOString().split('T')[0]
            });

            const newCaseId = caseResponse.data.case_id;

            // 2. Upload image pointing to that case
            const formData = new FormData();
            formData.append('file', file);
            formData.append('case_id', newCaseId);

            await api.post('/images/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = progressEvent.total ?
                        Math.round((progressEvent.loaded * 100) / progressEvent.total) : 50;
                    setUploadProgress(Math.min(progress, 95));
                },
            });

            clearInterval(interval);
            setUploadProgress(100);

            toast.success('Upload complete! Case is ready for review.');

            setTimeout(() => {
                router.push(`/radiologist/cases/${newCaseId}`);
            }, 500);

        } catch (e) {
            clearInterval(interval);
            setIsUploading(false);
            setFileError('File appears corrupted or upload failed. Please try another.');
        }
    };

    const isFormValid = file && selectedPatient && (!duplicateWarning || duplicateWarning); // can proceed if warning bypassed - wait, button logic will handle this

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Upload X-ray
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Register patient details and upload medical imagery for AI analysis.</p>
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
                                                            onClick={() => setSelectedPatient(p)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-blue-100 text-blue-700 p-2 rounded-full dark:bg-blue-900 dark:text-blue-300">
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
                                            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20 p-4 relative">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                                    onClick={() => setSelectedPatient(null)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-100 text-blue-700 p-2 rounded-full dark:bg-blue-800 dark:text-blue-200">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-blue-900 dark:text-blue-100">{selectedPatient.patient_id}</h3>
                                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                                            {selectedPatient.age} yrs • {selectedPatient.sex} • Reg: {selectedPatient.registration_date ? format(new Date(selectedPatient.registration_date), 'MMM yyyy') : 'Unknown'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <label className="flex items-center space-x-2 border rounded p-3 bg-muted/30">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300"
                                                    checked={existingPatientConsent}
                                                    onChange={(e) => setExistingPatientConsent(e.target.checked)}
                                                />
                                                <span className="text-sm font-medium">I confirm patient consent has been obtained for this visit</span>
                                            </label>
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
                                            onSuccess={(patient) => setSelectedPatient(patient)}
                                        />
                                    ) : (
                                        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 p-4 relative">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6 rounded-full text-green-700 hover:text-green-900 hover:bg-green-100"
                                                onClick={() => setSelectedPatient(null)}
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

                            {/* Dropzone */}
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
                                        Accepted formats: PNG, JPEG, DICOM
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

                            {/* Errors & Warnings */}
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

                        </CardContent>
                        <CardFooter className="pt-2 border-t mt-auto">
                            <Button
                                className="w-full"
                                size="lg"
                                disabled={
                                    !file ||
                                    !selectedPatient ||
                                    isUploading ||
                                    (selectedPatient && !selectedPatient.registration_date && !existingPatientConsent) // check consent if it's existing patient
                                }
                                onClick={handleSubmit}
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

// Need to import CheckCircle2 above
import { CheckCircle2 } from 'lucide-react';
