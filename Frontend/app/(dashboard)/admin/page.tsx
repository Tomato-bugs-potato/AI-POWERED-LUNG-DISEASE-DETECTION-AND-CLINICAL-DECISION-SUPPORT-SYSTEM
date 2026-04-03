'use client';

 import { useQuery } from '@tanstack/react-query';
import { Users, Activity, HardDrive, ShieldAlert, Cpu, Database, AlertCircle, ArrowUpRight, Search } from 'lucide-react';

 import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
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
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-black dark:text-white">
                        System Overview
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time infrastructure and security metrics.</p>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search system metrics..."
                        className="pl-9 bg-white/80 dark:bg-zinc-900 border-none shadow-sm rounded-xl focus:ring-teal-500/20"
                    />
                </div>
            </div>
            {/* Grid Layout conforming to Care Point design */}
            <div className="grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6">

                {/* LEFT MAIN AREA */}
                <div className="space-y-6">

                    {/* Statistical Summary Module wrapper */}
                    <div className="bg-[#F5F8F8] dark:bg-zinc-900 rounded-[2rem] p-6 lg:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[1.3rem] font-extrabold text-[#334155] dark:text-gray-100">Statistical Summary</h2>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Card 1: Patients/Personnel */}
                            <div className="card-push-container">
                                <div className="card-overlap-btn-pocket">
                                    <ArrowUpRight className="h-5 w-5 stroke-[2]" />
                                </div>
                                <div className="card-premium-pocket p-7 flex-1 flex flex-col">
                                    <div className="mb-6">
                                        <p className="text-base font-bold text-[#1C2222] dark:text-gray-100 mb-3">Number of patients</p>
                                        <Badge variant="outline" className="bg-white dark:bg-zinc-900 font-bold border-none text-[#1C2222] rounded-full px-4 py-1.5 shadow-sm text-[11px]">
                                            Week ▾
                                        </Badge>
                                    </div>

                                    <div className="space-y-4 flex-1 flex flex-col">
                                        <div className="sub-card-white flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Adult Patients</span>
                                                <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                                     <Users className="h-3.5 w-3.5 text-gray-400" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                 <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{stats.activeToday}</span>
                                            </div>
                                        </div>

                                        <div className="sub-card-white flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Total Users</span>
                                                <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                                     <Users className="h-3.5 w-3.5 text-gray-400" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{stats.totalUsers}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Card 2: Daily Visit / Cases */}
                            <div className="card-push-container">
                                <div className="card-overlap-btn-pocket">
                                    <ArrowUpRight className="h-5 w-5 stroke-[2]" />
                                </div>
                                <div className="card-premium-pocket p-7 flex-1 flex flex-col">
                                    <div className="mb-6">
                                        <p className="text-base font-bold text-[#1C2222] dark:text-gray-100 mb-3">Daily Visit</p>
                                        <Badge variant="outline" className="bg-white dark:bg-zinc-900 font-bold border-none text-[#1C2222] rounded-full px-4 py-1.5 shadow-sm text-[11px]">
                                            Week ▾
                                        </Badge>
                                    </div>

                                    <div className="space-y-4 flex-1 flex flex-col">
                                        <div className="sub-card-white flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Emergency Room</span>
                                                <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                                     <Activity className="h-3.5 w-3.5 text-gray-400" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                 <span className="font-bold text-2xl text-[#1C2222] dark:text-white">78</span>
                                            </div>
                                        </div>

                                        <div className="sub-card-white flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Polyclinic</span>
                                                <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                                     <Database className="h-3.5 w-3.5 text-gray-400" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{stats.casesProcessed}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Card 3: Model Capacity / AI Info */}
                            <div className="card-push-container">
                                <div className="card-overlap-btn-pocket">
                                    <ArrowUpRight className="h-5 w-5 stroke-[2]" />
                                </div>
                                <div className="card-premium-pocket p-7 flex-1 flex flex-col">
                                    <div className="mb-6">
                                        <p className="text-base font-bold text-[#1C2222] dark:text-gray-100 mb-3">Model Capacity</p>
                                        <Badge variant="outline" className="bg-white dark:bg-zinc-900 font-bold border-none text-[#1C2222] rounded-full px-4 py-1.5 shadow-sm text-[11px]">
                                            v2.1 ▾
                                        </Badge>
                                    </div>

                                    <div className="space-y-4 flex-1 flex flex-col">
                                        <div className="sub-card-white flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Accuracy</span>
                                                <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                                     <Cpu className="h-3.5 w-3.5 text-gray-400" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                 <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{stats.modelAccuracy}</span>
                                            </div>
                                        </div>

                                        <div className="sub-card-white flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">Uptime</span>
                                                <div className="h-7 w-7 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100/50 shadow-sm">
                                                     <Activity className="h-3.5 w-3.5 text-gray-400" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-2xl text-[#1C2222] dark:text-white">{stats.uptime}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom row of left side */}
                    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">

                        {/* Health Trends -> Storage */}
                        <div className="bg-[#F5F8F8] dark:bg-zinc-900 rounded-[2rem] p-6 lg:p-8 relative">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="font-extrabold text-[#334155] dark:text-gray-100 text-[1.1rem]">Storage Trends</h3>
                                 
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <p className="text-[13px] font-bold text-gray-500 dark:text-gray-300">Fast Storage (SSD)</p>
                                        <span className="text-xs font-bold text-[#FF6B6B]">{stats.storageUsedGB} / {stats.storageTotalGB} GB</span>
                                    </div>
                                    <Progress value={(stats.storageUsedGB / stats.storageTotalGB) * 100} className="h-3 bg-white dark:bg-zinc-950 [&>div]:bg-[#FF6B6B] rounded-full" />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <p className="text-[13px] font-bold text-gray-500 dark:text-gray-300">Cold Backup (Cloud)</p>
                                        <span className="text-xs font-bold text-[#4DA1A9]">1.2 / 5.0 TB</span>
                                    </div>
                                    <Progress value={(1200 / 5000) * 100} className="h-3 bg-white dark:bg-zinc-950 [&>div]:bg-[#4DA1A9] rounded-full" />
                                </div>
                            </div>
                        </div>

                        {/* Doctor's Schedule -> System Modules */}
                        <div className="bg-[#F5F8F8] dark:bg-zinc-900 rounded-[2rem] p-6 lg:p-8 relative">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-extrabold text-[#334155] dark:text-gray-100 text-[1.1rem]">System Modules</h3>
                                
                            </div>

                            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm mt-4">
                                <div className="space-y-4">
                                    {[
                                        { name: 'Core AI Engine', status: 'Online', icon: Cpu, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                        { name: 'Database Cluster', status: 'Syncing', icon: Database, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                                        { name: 'Backup Service', status: 'Idle', icon: HardDrive, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
                                    ].map((mod, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-xl ${mod.bg}`}>
                                                <mod.icon className={`h-4 w-4 ${mod.color}`} />
                                            </div>
                                            <div>
                                                <h4 className="text-[13px] font-extrabold text-[#334155] dark:text-gray-200">{mod.name}</h4>
                                                <p className="text-[11px] font-bold text-gray-400 mt-0.5">{mod.status}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* RIGHT AREA - System Logs replacing Doctor's Conference */}
                <div className="bg-[#F5F8F8] dark:bg-zinc-900 rounded-[2rem] p-6 lg:p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-extrabold text-[#334155] dark:text-gray-100 text-[1.1rem]">System Logs</h3>
                         
                    </div>

                    {stats.errorCount > 0 && (
                        <div className="mb-8 bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 flex gap-3 items-start relative shadow-sm">
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[13px] font-extrabold text-[#334155]">Action Required</p>
                                <p className="text-[11px] font-bold text-gray-500 mt-1">There are {stats.errorCount} system errors logged recently.</p>
                                <button className="mt-3 bg-[#334155] text-white rounded-full h-7 text-[11px] font-bold px-4 hover:bg-gray-800 transition-colors">Remind</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        {stats.recentLogs.map((log: any, i: number) => (
                            <div key={log.id} className="flex gap-4 group">
                                {/* Time column */}
                                <div className="w-14 shrink-0 text-right pt-1">
                                    <div className="text-[11px] font-extrabold text-[#334155] leading-tight">
                                        {log.time.split(',')[1]?.trim() || "10:00"}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 mt-1">
                                        {log.time.split(',')[0]}
                                    </div>
                                </div>
                                
                                {/* Content Card */}
                                <div className="flex-1 bg-white p-4 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex items-start gap-3">
                                    <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${log.level === 'error' ? 'bg-red-100 text-red-500' : 'bg-[#E5F3F4] text-[#44A7AD]'}`}>
                                        {log.level === 'error' ? <AlertCircle className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-extrabold text-[#334155] leading-snug">{log.message}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-center">
                        <button className="bg-[#FF6B6B] hover:bg-red-500 text-white font-extrabold rounded-full py-3 px-8 text-[13px] transition-colors shadow-sm w-full mx-4">
                            + View Full Logs
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
