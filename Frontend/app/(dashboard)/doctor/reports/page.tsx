import * as React from 'react';
import { serverApi } from '@/lib/server-api';
import { ReportsDirectoryView, ReportMock } from '@/components/dashboard/doctor/reports/ReportsDirectoryView';

const fetchReportsServer = async (): Promise<ReportMock[]> => {
    try {
        const response = await serverApi.get('/reports');
        const data = Array.isArray(response) ? response : (response?.items || []);
        return data.map((r: any, i: number) => ({
            id: r.report_id || `REP-${i}`,
            case_id: r.case_id || '-',
            patient_id: r.patient_id || '-',
            patient_name: r.patient_name || `Patient ${r.patient_id ? String(r.patient_id).substring(0, 8) : i}`,
            final_diagnosis: r.final_diagnosis || r.diagnosis || 'Pending',
            status: (r.status === 'Draft' ? 'Draft' : 'Final') as 'Final' | 'Draft',
            generated_at: r.generated_at || r.created_at || new Date().toISOString(),
        })).sort((a: ReportMock, b: ReportMock) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
    } catch {
        return [];
    }
};

export default async function PastReportsPage() {
    const initialData = await fetchReportsServer();
    
    return (
        <React.Suspense fallback={<div>Loading clinical reports...</div>}>
            <ReportsDirectoryView initialData={initialData} />
        </React.Suspense>
    );
}
