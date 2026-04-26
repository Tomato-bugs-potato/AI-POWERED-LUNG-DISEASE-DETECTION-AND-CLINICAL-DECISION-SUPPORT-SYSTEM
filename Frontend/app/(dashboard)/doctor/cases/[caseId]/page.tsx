import { serverApi } from '@/lib/server-api';
import { CaseDetailsView } from '@/components/dashboard/doctor/cases/CaseDetailsView';

const fetchCaseData = async (id: string) => {
    try {
        const [caseRes, reviewRes, reportStatusRes] = await Promise.allSettled([
            serverApi.get(`/cases/${id}`),
            serverApi.get(`/reviews/${id}`),
            serverApi.get(`/reports/${id}/status`)
        ]);

        const c = caseRes.status === 'fulfilled' ? caseRes.value : null;
        if (!c) return null;

        const review = reviewRes.status === 'fulfilled' ? reviewRes.value : null;
        const reportStatus = reportStatusRes.status === 'fulfilled' ? reportStatusRes.value : null;

        const firstImage = c.images?.[0];
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
            image: { file_url: '' },
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

export default async function DiagnosisPage({ params }: { params: Promise<{ caseId: string }> }) {
    const { caseId } = await params;
    const initialData = await fetchCaseData(caseId);

    if (!initialData) return <div className="p-8 text-center text-red-500">Case not found or failed to load.</div>;

    return <CaseDetailsView initialData={initialData} caseId={caseId} />;
}
