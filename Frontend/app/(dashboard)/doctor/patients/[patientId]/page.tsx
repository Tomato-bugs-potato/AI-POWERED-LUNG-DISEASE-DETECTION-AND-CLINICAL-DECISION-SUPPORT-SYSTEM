 import { serverApi } from '@/lib/server-api';
import { PatientDetailView, PatientDetailData } from '@/components/dashboard/doctor/patients/PatientDetailView';

 const fetchPatientDetailData = async (id: string): Promise<PatientDetailData> => {
    try {
        const response = await serverApi.get(`/patients/${id}`);
        const p = response;
        return {
            patient_id: p.patient_id,
            full_name: p.full_name || p.name || `Patient ${p.patient_id}`,
            age: p.age || 0,
            sex: p.sex || 'Unknown',
            contact_number: p.contact_number || p.phone || 'N/A',
            consent_given: p.consent_given ?? true,
            consent_recorded: p.consent_recorded ?? true,
            created_at: p.created_at || p.registration_date || new Date().toISOString(),
            history: (p.cases || p.history || []).map((c: any) => ({
                case_id: c.case_id,
                patient_id: id,
                status: c.status,
                priority: c.priority || 'Non_Critical',
                upload_date: c.created_at || c.upload_date || new Date().toISOString(),
                image: c.images?.[0] || { image_id: '', file_url: '', upload_date: '', format: 'DICOM' },
                radiologist_review: c.radiologist_review || undefined,
                diagnosis: c.diagnosis || undefined,
            })),
        };
    } catch {
        // Fallback or handle error
        return {
            patient_id: id,
            full_name: 'Unknown Patient',
            age: 0,
            sex: 'Male' as const,
            contact_number: 'N/A',
            consent_given: false,
            consent_recorded: false,
            created_at: new Date().toISOString(),
            history: [],
        };
    }
};

export default async function PatientDetailPage({ params }: { params: { patientId: string } }) {
    const { patientId } = params;
    const initialData = await fetchPatientDetailData(patientId);

    return (
        <PatientDetailView patientId={patientId} initialData={initialData} />
    );
}

