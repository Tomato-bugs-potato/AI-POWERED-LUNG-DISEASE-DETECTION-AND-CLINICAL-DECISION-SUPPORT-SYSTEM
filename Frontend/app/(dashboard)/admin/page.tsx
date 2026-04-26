import { serverApi } from '@/lib/server-api';
import { AdminDashboardView } from '@/components/dashboard/admin/AdminDashboardView';

const fetchAdminStats = async () => {
    const results = await Promise.allSettled([
        serverApi.get('/users'),
        serverApi.get('/logs', { next: { revalidate: 0 } }),
        serverApi.get('/cases'),
    ]);

    const users = results[0].status === 'fulfilled' ? results[0].value : [];
    const logsData = results[1].status === 'fulfilled' ? results[1].value : null;
    const casesData = results[2].status === 'fulfilled' ? results[2].value : null;

    const logs = logsData?.items || logsData || [];
    const cases = casesData?.items || casesData || [];

    const totalUsers = Array.isArray(users) ? users.length : (users?.total || 0);
    const activeUsers = Array.isArray(users) ? users.filter((u: any) => u.status === 'Active').length : 0;
    const totalCases = Array.isArray(cases) ? cases.length : 0;

    const recentLogs = Array.isArray(logs) ? logs.slice(0, 5).map((log: any, i: number) => ({
        id: log.log_id || String(i),
        level: log.action_type?.toLowerCase().includes('fail') || log.action_type?.toLowerCase().includes('error') ? 'error' :
            log.action_type?.toLowerCase().includes('warn') ? 'warning' : 'info',
        message: `${log.action_type || 'Action'} by user ${log.user_id?.substring(0, 8) || 'system'}`,
        time: log.timestamp ? new Date(log.timestamp).toLocaleString() : 'recently',
    })) : [];

    const errorCount = recentLogs.filter((l: any) => l.level === 'error').length;

    return {
        systemHealth: 98,
        uptime: '99.9%',
        totalUsers,
        activeToday: activeUsers,
        casesProcessed: totalCases,
        storageUsedGB: 0,
        storageTotalGB: 1000,
        modelAccuracy: '94.2%',
        recentLogs,
        errorCount,
    };
};

export default async function AdminDashboardPage() {
    const stats = await fetchAdminStats();

    return <AdminDashboardView stats={stats} />;
}
