import { serverApi } from '@/lib/server-api';
import { DoctorCasesView } from '@/components/dashboard/doctor/cases/DoctorCasesView';
import { CaseStatus, UrgencyLevel } from '@/types';

const fetchDoctorQueue = async () => {
    try {
        const response = await serverApi.get('/cases');
        const data = Array.isArray(response) ? response : (response?.items || []);
        return data.map((c: any) => ({
            case_id: c.case_id,
            patient_id: c.patient_id,
            status: c.status as CaseStatus,
            priority: (c.priority || 'Non_Critical') as UrgencyLevel,
            upload_date: c.created_at || c.updated_at || new Date().toISOString(),
            image: c.images?.[0] || { image_id: '', file_url: '', upload_date: '', format: 'DICOM' as const },
        })).sort((a: any, b: any) => {
            if (a.status === 'Ready_for_Diagnosis' && b.status !== 'Ready_for_Diagnosis') return -1;
            if (a.status !== 'Ready_for_Diagnosis' && b.status === 'Ready_for_Diagnosis') return 1;
            if (a.priority === 'Critical' && b.priority !== 'Critical') return -1;
            if (a.priority !== 'Critical' && b.priority === 'Critical') return 1;
            return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
        });
    } catch {
        return [];
    }
};

export default async function DiagnosisQueuePage() {
    const cases = await fetchDoctorQueue();

    return <DoctorCasesView initialCases={cases} />;
}
