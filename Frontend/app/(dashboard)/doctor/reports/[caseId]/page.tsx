import * as React from 'react';
import { serverApi } from '@/lib/server-api';
import { ReportDetailView, ReportDetailData } from '@/components/dashboard/doctor/reports/ReportDetailView';

 const fetchReportDetailServer = async (id: string): Promise<ReportDetailData | null> => {
    try {
        const response = await serverApi.get(`/reports/${id}`);
        const r = response;
        return {
            report_id: r.report_id || `REP-${id}`,
            case_id: r.case_id || id,
            status: r.status || 'Final',
            generated_at: r.generated_at || r.created_at || new Date().toISOString(),
            pdf_url: r.pdf_url || null,
            patient: {
                id: r.patient?.patient_id || r.patient_id || 'Unknown',
                name: r.patient?.name || `Patient ${(r.patient_id || '').toString().substring(0, 8)}`,
                age: r.patient?.age || 0,
                sex: r.patient?.sex || 'Unknown',
                contact: 'N/A',
            },
            clinical_details: {
                date_of_exam: r.generated_at || new Date().toISOString(),
                modality: 'Chest X-Ray (PA View)',
                referring_physician: 'N/A',
            },
            radiologist: {
                name: r.radiologist?.name || 'Radiologist',
                findings: r.radiologist?.findings || 'No findings recorded.',
            },
            ai_inference: {
                model_version: r.ai_inference?.model_version || 'unknown',
                primary_finding: r.ai_inference?.primary_finding || 'N/A',
                confidence: r.ai_inference?.confidence || 0,
            },
            doctor: {
                name: r.doctor?.name || 'Doctor',
                final_diagnosis: r.final_diagnosis || 'Pending',
                recommendations: r.doctor?.recommendations || 'No recommendations recorded.',
            },
        };
    } catch {
        return null;
    }
};

export default async function ReportPreviewPage({
    params,
}: {
    params: Promise<{ caseId: string }>;
}) {
      const resolvedParams = await params;
    const initialData = await fetchReportDetailServer(resolvedParams.caseId);
    
    return (
        <React.Suspense fallback={
            <div className="flex flex-col h-[80vh] items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <p className="text-muted-foreground animate-pulse">Loading Report...</p>
            </div>
        }>
            <ReportDetailView caseId={resolvedParams.caseId} initialData={initialData} />
        </React.Suspense>
    );
}
