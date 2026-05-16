'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Terminal, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';

interface AuditLog {
    id: string;
    timestamp: string;
    user_id: string;
    user_name: string;
    action: string;
    resource: string;
    ip_address: string;
    status: 'Success' | 'Failure';
}

interface LogsDashboardViewProps {
    initialLogs: AuditLog[];
}

const fetchLogs = async (): Promise<AuditLog[]> => {
    try {
        const response = await api.get('/logs');
        const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        return data.map((log: any, i: number) => ({
            id: log.log_id || `LOG-${i}`,
            timestamp: log.timestamp || new Date().toISOString(),
            user_id: log.user_id ? String(log.user_id).substring(0, 8) : 'system',
            user_name: log.user_name || `User ${log.user_id ? String(log.user_id).substring(0, 8) : 'system'}`,
            action: log.action_type || log.action || 'Unknown',
            resource: log.resource || (typeof log.details === 'object' ? JSON.stringify(log.details) : log.details) || '-',
            ip_address: log.ip_address || '-',
            status: (String(log.action_type || '').toLowerCase().includes('fail') || String(log.action_type || '').toLowerCase().includes('error') ? 'Failure' : 'Success') as 'Success' | 'Failure',
        })).sort((a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
        return [];
    }
};

export function LogsDashboardView({ initialLogs }: LogsDashboardViewProps) {
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');

    const { data: logs = initialLogs, isLoading } = useQuery({
        queryKey: ['admin-logs'],
        queryFn: fetchLogs,
        initialData: initialLogs,
    });

    const filteredLogs = logs.filter(l => {
        if (statusFilter !== 'all' && l.status !== statusFilter) return false;
        if (search && !l.user_name.toLowerCase().includes(search.toLowerCase()) && !l.action.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                        <Terminal className="h-6 w-6 text-black" />
                        System Audit Logs
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Review system activities for security and compliance tracking.</p>
                </div>
            </div>

            <Card className="border-none shadow-none rounded-none bg-transparent dark:bg-transparent overflow-hidden">
                <CardContent className="p-0 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                className="pl-9 h-11 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus-visible:ring-1 focus-visible:ring-black/5"
                                placeholder="Search user or action..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] bg-white">
                                <Filter className="mr-2 h-4 w-4 text-gray-500" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className='bg-white'>
                                <SelectItem value="all">All Events</SelectItem>
                                <SelectItem value="Success">Success Only</SelectItem>
                                <SelectItem value="Failure">Failures Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative min-h-[500px]">
                        {isLoading && !initialLogs ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-sm text-left border-collapse border-spacing-0">
                                    <thead className="text-[10px] text-black uppercase bg-gray-200 font-black tracking-widest border-b border-gray-200">
                                        <tr className="divide-x divide-gray-100">
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Timestamp</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">User</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Action</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Resource</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">IP Address</th>
                                            <th scope="col" className="px-4 py-3.5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredLogs.map((log) => (
                                            <tr key={log.id} className="bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-none divide-x divide-gray-100 font-mono text-xs">
                                                <td className="px-4 py-3 text-gray-500">
                                                    {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                                                </td>
                                                <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-sans">
                                                    {log.user_name}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                                                    {log.action}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {log.resource}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {log.ip_address}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={log.status === 'Success' ? 'text-green-600' : 'text-red-600 font-bold'}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
