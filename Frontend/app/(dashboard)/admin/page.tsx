import { serverApi } from '@/lib/server-api';
import { AdminDashboardView } from '@/components/dashboard/admin/AdminDashboardView';

const fetchAdminStats = async () => {
    const results = await Promise.allSettled([
        serverApi.get('/users'),
        serverApi.get('/logs', { next: { revalidate: 0 } }),
        serverApi.get('/cases'),
    ]);

    const usersRaw = results[0].status === 'fulfilled' ? results[0].value : [];
    const logsData = results[1].status === 'fulfilled' ? results[1].value : null;
    const casesData = results[2].status === 'fulfilled' ? results[2].value : null;

    const users = Array.isArray(usersRaw) ? usersRaw : usersRaw?.items || [];
    const logs = Array.isArray(logsData) ? logsData : logsData?.items || [];
    const cases = Array.isArray(casesData) ? casesData : casesData?.items || [];

    const totalUsers = users.length;
    const activeUsers = users.filter((u: any) => u.status === 'Active').length;
    const totalCases = cases.length;

    // Most recent log entries (sorted newest-first) for the activity feed.
    const sortedLogs = [...logs].sort((a: any, b: any) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta;
    });
    const recentLogs = sortedLogs.slice(0, 8).map((log: any, i: number) => {
        const action = String(log.action_type || '').toLowerCase();
        const level: 'info' | 'warning' | 'error' =
            action.includes('fail') || action.includes('error')
                ? 'error'
                : action.includes('warn')
                    ? 'warning'
                    : 'info';
        return {
            id: log.log_id || String(i),
            level,
            message: `${log.action_type || 'Action'} by user ${log.user_id?.substring(0, 8) || 'system'}`,
            time: log.timestamp ? new Date(log.timestamp).toLocaleString() : 'recently',
            iso: log.timestamp,
        };
    });

    const errorCount = recentLogs.filter((l) => l.level === 'error').length;

    return {
        // Real values from the backend.
        totalUsers,
        activeToday: activeUsers,
        casesProcessed: totalCases,
        recentLogs,
        errorCount,
        users,
        logs,
        cases,
        // Infra metrics — using reasonable mock values for now 
        // In a real system, these would come from Prometheus or CloudWatch
        systemHealth: 100,
        uptime: "14d 6h",
        storageUsedGB: 12,
        storageTotalGB: 100,
        modelAccuracy: "94.2%",
    };
};

export default async function AdminDashboardPage() {
    const stats = await fetchAdminStats();
    return <AdminDashboardView stats={stats} />;
}
