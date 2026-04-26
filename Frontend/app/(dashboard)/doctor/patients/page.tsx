import * as React from 'react';
import { serverApi } from '@/lib/server-api';
import { PatientSex } from '@/types';
import { PatientsDirectoryView, PatientListItem } from '@/components/dashboard/doctor/patients/PatientsDirectoryView';

const fetchPatientsData = async (): Promise<PatientListItem[]> => {
    try {
        const response = await serverApi.get('/patients');
        const data = Array.isArray(response) ? response : (response?.items || []);
        return data.map((p: any) => ({
            patient_id: p.patient_id,
            full_name: p.full_name || p.name || `Patient ${p.patient_id}`,
            age: p.age || 0,
            sex: (p.sex || 'Unknown') as PatientSex,
            contact_number: p.contact_number || '-',
            consent_given: p.consent_given ?? true,
            consent_recorded: p.consent_recorded ?? true,
            created_at: p.created_at || p.registration_date || new Date().toISOString(),
            last_visit_date: p.last_visit_date || p.created_at || new Date().toISOString(),
            total_cases: p.total_cases || 0,
            active_cases: p.active_cases || 0,
            registration_date: p.registration_date || p.created_at,
        })).sort((a: PatientListItem, b: PatientListItem) => new Date(b.last_visit_date).getTime() - new Date(a.last_visit_date).getTime());
    } catch {
        return [];
    }
};

export default async function PatientsDirectoryPage() {
    const initialData = await fetchPatientsData();
    return (
        <React.Suspense fallback={<div>Loading records...</div>}>
            <PatientsDirectoryView initialData={initialData} />
        </React.Suspense>
    );
}

