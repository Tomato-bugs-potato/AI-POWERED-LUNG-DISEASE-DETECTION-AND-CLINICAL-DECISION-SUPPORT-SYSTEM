import { serverApi } from '@/lib/server-api';
import { UsersDashboardView } from '@/components/dashboard/admin/UsersDashboardView';

export const dynamic = 'force-dynamic';

const fetchUsers = async () => {
    try {
        const response = await serverApi.get('/users');
        const data = Array.isArray(response) ? response : (response?.items || []);
        return data.map((u: any) => ({
            id: u.user_id || u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status === 'Inactive' || u.status === 'Locked' ? 'Suspended' : 'Active',
            last_login: u.last_login || new Date().toISOString(),
        }));
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};

export default async function UserManagementPage() {
    const users = await fetchUsers();

    return <UsersDashboardView initialUsers={users} />;
}
