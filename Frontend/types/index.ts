export enum Role {
    Lab_Technician = 'Lab_Technician',
    Radiologist = 'Radiologist',
    Doctor = 'Doctor',
    Admin = 'Admin',
}

export type UserStatus = 'Active' | 'Inactive' | 'Locked';

export interface User {
    user_id: string;
    email: string;
    name: string;
    role: Role;
    hospital_id?: string;
    status: UserStatus;
}

export type PatientSex = 'Male' | 'Female';

export interface Patient {
    patient_id: string;
    age: number;
    sex: PatientSex;
    consent_recorded: boolean;
    registered_at?: string;
    symptoms?: string;
    total_cases?: number;
    active_cases?: number;
    last_visit_date?: string;
}

export type CaseStatus =
    | 'Pending_Review'
    | 'In_Review'
    | 'Ready_for_Diagnosis'
    | 'Diagnosed'
    | 'Completed';

export type UrgencyLevel = 'Critical' | 'High' | 'Non_Critical';

export interface Image {
    image_id: string;
    file_url: string;
    upload_date: string;
    format: 'PNG' | 'JPG' | 'JPEG' | 'DICOM';
}

export type DiseaseClass = 'Pneumonia' | 'Tuberculosis' | 'Lung Tumor' | 'Lung_Tumor' | 'Normal' | 'Other';

export interface BoundingBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Prediction {
    id?: string;
    disease_class: DiseaseClass;
    bounding_box: BoundingBox;
    confidence_score: number;
    segmentation?: number[][]; // Polygon as [x, y][]
    is_false_positive?: boolean; // For radiologist review
}

export interface InferenceResult {
    inference_id: string;
    predictions: Prediction[];
    classification?: {
        disease_class: string;
        confidence_score: number;
        probabilities?: Record<string, number>;
    };
    lung_segmentation?: number[][][]; // List of polygons, each is [x, y][]
    model_version: string;
    processing_time_sec: number;
}

export interface RadiologistReview {
    review_id: string;
    radiologist_id: string;
    notes: string;
    confidence_threshold_applied: number;
    reviewed_at: string;
    edited_predictions: Prediction[];
}

export interface Diagnosis {
    diagnosis_id: string;
    case_id: string;
    doctor_id: string;
    primary_diagnosis: DiseaseClass;
    diagnosis_notes: string;
    urgency_level: UrgencyLevel;
    treatment_recommendations?: string;
    diagnosed_at: string;
}

export interface Case {
    case_id: string;
    patient_id: string;
    status: CaseStatus;
    priority: UrgencyLevel;
    upload_date: string;
    image: Image;
    inference_result?: InferenceResult;
    radiologist_review?: RadiologistReview;
    diagnosis?: Diagnosis;
}

export interface Report {
    report_id: string;
    case_id: string;
    pdf_url?: string;
    generated_at: string;
}

export interface AuditLog {
    log_id: string;
    timestamp: string;
    user_id: string;
    action_type: string;
    case_id?: string;
    ip_address?: string;
    details?: string;
}
