'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Activity, HardDrive, ShieldAlert, Cpu, Database, AlertCircle, ArrowUpRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const fetchAdminStats = async () => {
    // Fetch real data from backend
    const [usersRes, logsRes, casesRes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/logs', { params: { page_size: 50 } }),
        api.get('/cases'),
    ]);

    const users = usersRes.status === 'fulfilled' ? usersRes.value.data : [];
    const logs = logsRes.status === 'fulfilled' ? (logsRes.value.data?.items || logsRes.value.data || []) : [];
    const cases = casesRes.status === 'fulfilled' ? (casesRes.value.data?.items || casesRes.value.data || []) : [];

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

export default function AdminDashboard() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: fetchAdminStats,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">System overview and control center.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">System Health</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.systemHealth}%</div>
                        <p className="text-xs text-green-600 font-medium mt-1">Uptime: {stats.uptime}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Active Personnel</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeToday} <span className="text-base font-normal text-muted-foreground">/ {stats.totalUsers}</span></div>
                        <p className="text-xs text-blue-600 font-medium mt-1">Online today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">AI Model Status</CardTitle>
                        <Cpu className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">v2.1 Active</div>
                        <p className="text-xs text-purple-600 font-medium mt-1">Accuracy: {stats.modelAccuracy}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Processed</CardTitle>
                        <Database className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.casesProcessed.toLocaleString()}</div>
                        <p className="text-xs text-orange-600 font-medium mt-1">Lifetime cases</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Storage Capacity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-gray-400" /> Storage Capacity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Fast Storage (SSD)</span>
                                <span className="text-gray-500">{stats.storageUsedGB} GB / {stats.storageTotalGB} GB</span>
                            </div>
                            <Progress value={(stats.storageUsedGB / stats.storageTotalGB) * 100} className="h-2" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Cold Backup (Cloud)</span>
                                <span className="text-gray-500">1.2 TB / 5 TB</span>
                            </div>
                            <Progress value={(1200 / 5000) * 100} className="h-2 bg-blue-100" />
                        </div>
                    </CardContent>
                </Card>

                {/* System Alerts */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-gray-400" /> Recent System Logs
                        </CardTitle>
                        {stats.errorCount > 0 && <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400">{stats.errorCount} Error{stats.errorCount > 1 ? 's' : ''}</Badge>}
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentLogs.map(log => (
                                <div key={log.id} className="flex items-start justify-between border-b border-border last:border-0 pb-3 last:pb-0">
                                    <div className="flex gap-3">
                                        {log.level === 'error' ? (
                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        ) : log.level === 'warning' ? (
                                            <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <Activity className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.message}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{log.time}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
