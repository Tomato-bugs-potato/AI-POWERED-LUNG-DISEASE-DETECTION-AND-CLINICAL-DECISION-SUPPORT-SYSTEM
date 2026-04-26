import { serverApi } from '@/lib/server-api';
import { LogsDashboardView } from '@/components/dashboard/admin/LogsDashboardView';

const fetchLogs = async () => {
    try {
        const response = await serverApi.get('/logs');
        const data = Array.isArray(response) ? response : (response?.items || []);
        return data.map((log: any, i: number) => ({
            id: log.log_id || `LOG-${i}`,
            timestamp: log.timestamp || new Date().toISOString(),
            user_id: log.user_id ? String(log.user_id).substring(0, 8) : 'system',
            user_name: log.user_name || `User ${log.user_id ? String(log.user_id).substring(0, 8) : 'system'}`,
            action: log.action_type || log.action || 'Unknown',
            resource: log.resource || log.details || '-',
            ip_address: log.ip_address || '-',
            status: (log.action_type?.toLowerCase().includes('fail') || log.action_type?.toLowerCase().includes('error') ? 'Failure' : 'Success') as 'Success' | 'Failure',
        })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
        return [];
    }
};

export default async function AuditLogsPage() {
    const logs = await fetchLogs();

    return <LogsDashboardView initialLogs={logs} />;
}
