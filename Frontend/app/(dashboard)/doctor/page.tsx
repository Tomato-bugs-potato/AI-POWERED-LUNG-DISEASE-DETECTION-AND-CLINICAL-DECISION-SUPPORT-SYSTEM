import { serverApi } from '@/lib/server-api';
import { DoctorDashboardView } from '@/components/dashboard/doctor/DoctorDashboardView';

const fetchDoctorDashboardData = async () => {
    try {
        const response = await serverApi.get('/cases?limit=100');
        const data = Array.isArray(response) ? response : (response?.items || []);

        const allCases = data.map((c: any) => ({
            case_id: c.case_id,
            patient_id: c.patient_id,
            status: c.status,
            priority: c.priority || 'Non_Critical',
            updated_at: c.updated_at || c.created_at || new Date().toISOString(),
        }));

        const pending = allCases
            .filter((c: any) => c.status === 'Ready_for_Diagnosis' || c.status === 'In_Review')
            .sort((a: any, b: any) => {
                if (a.priority === 'Critical' && b.priority !== 'Critical') return -1;
                if (a.priority !== 'Critical' && b.priority === 'Critical') return 1;
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });
        const completed = allCases.filter((c: any) => c.status === 'Diagnosed' || c.status === 'Completed');

        return { pending, completed, total: allCases.length };
    } catch {
        return { pending: [], completed: [], total: 0 };
    }
};

export default async function DoctorDashboard() {
    const initialData = await fetchDoctorDashboardData();
    return <DoctorDashboardView initialData={initialData} />;
}
