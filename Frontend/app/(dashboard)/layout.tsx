'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LogOut,
    Menu,
    X,
    Home,
    Upload,
    ListTodo,
    User as UserIcon,
    Search,
    FileText,
    Users,
    ShieldAlert,
    Hospital,
    HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LanguageToggle } from '@/components/auth/LanguageToggle';
import { useAuthStore, useUIStore } from '@/store';
import { clearTokens } from '@/lib/auth';
import { Role } from '@/types';
import api from '@/lib/api';
import { IdleTimeoutProvider } from '@/components/shared/IdleTimeoutProvider';
import { OnboardingTour } from '@/components/shared/OnboardingTour';

type NavItem = {
    name: string;
    href: string;
    icon: React.ElementType;
    showBadge?: boolean;
};

const getNavItems = (role?: string): NavItem[] => {
    switch (role) {
        case Role.Radiologist:
        case Role.Lab_Technician:
            return [
                { name: 'Dashboard', href: '/radiologist', icon: Home },
                { name: 'Upload X-ray', href: '/radiologist/upload', icon: Upload },
                { name: 'Cases Queue', href: '/radiologist/cases', icon: ListTodo, showBadge: true },
                { name: 'Profile', href: '/radiologist/profile', icon: UserIcon },
                { name: 'Help', href: '/help', icon: HelpCircle },
            ];
        case Role.Doctor:
            return [
                { name: 'Dashboard', href: '/doctor', icon: Home },
                { name: 'Diagnosis Queue', href: '/doctor/cases', icon: ListTodo, showBadge: true },
                { name: 'Patients / Search', href: '/doctor/patients', icon: Search },
                { name: 'Past Reports', href: '/doctor/reports', icon: FileText },
                { name: 'Profile', href: '/doctor/profile', icon: UserIcon },
                { name: 'Help', href: '/help', icon: HelpCircle },
            ];
        case Role.Admin:
            return [
                { name: 'Dashboard', href: '/admin', icon: Home },
                { name: 'User Management', href: '/admin/users', icon: Users },
                { name: 'Audit Logs', href: '/admin/logs', icon: ShieldAlert },
                { name: 'Help', href: '/help', icon: HelpCircle },
            ];
        default:
            return [];
    }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const { sidebarOpen, setSidebarOpen } = useUIStore();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch real critical count from cases API
    const [criticalCount, setCriticalCount] = React.useState(0);
    React.useEffect(() => {
        api.get('/cases', { params: { priority: 'Critical' } })
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
                const pending = data.filter((c: any) =>
                    c.status === 'Pending_Review' || c.status === 'In_Review' || c.status === 'Ready_for_Diagnosis'
                );
                setCriticalCount(pending.length);
            })
            .catch(() => setCriticalCount(0));
    }, []);

    const handleLogout = () => {
        logout();
        clearTokens();
        // Clear cookies
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.push('/login');
    };

    // Prevent hydration mismatch by using null on first render/SSR
    const displayedUser = mounted ? user : null;

    const currentRole = displayedUser?.role || Role.Radiologist;
    const navItems = getNavItems(currentRole);

    const roleColor = {
        [Role.Admin]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        [Role.Doctor]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        [Role.Radiologist]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        [Role.Lab_Technician]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    }[currentRole as string] || 'bg-gray-100 text-gray-800';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex transition-colors duration-300">

            {/* Mobile Sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-border transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static'}`}
            >
                <div className="h-16 flex items-center px-6 border-b border-border justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded text-white flex-shrink-0">
                            <span className="font-bold text-lg leading-none">AI</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white truncate">LungDetect</span>
                    </div>
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800/50'
                                    }`}
                            >
                                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                                <span className="flex-1 truncate">{item.name}</span>
                                {item.showBadge && criticalCount > 0 && (
                                    <Badge variant="destructive" className="ml-auto shrink-0 animate-pulse text-xs px-1.5 py-0">
                                        {criticalCount}
                                    </Badge>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-border">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content Group */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Top Header */}
                <header className="h-16 flex items-center justify-between border-b border-border bg-white dark:bg-zinc-900 px-4 sm:px-6 lg:px-8 shrink-0 z-10 sticky top-0">
                    <div className="flex items-center flex-1">
                        <Button variant="ghost" size="icon" className="mr-2 lg:hidden" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="hidden sm:flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Hospital className="h-4 w-4 mr-2" />
                            <span>{displayedUser?.hospital_id || 'St. Paul Hospital Millennium Medical College'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <LanguageToggle />

                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 mx-2" />

                        <div className="flex items-center gap-3">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium leading-none text-gray-900 dark:text-white">
                                    {displayedUser?.name || 'Dr. Endashaw'}
                                </p>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 mt-1 text-xs font-medium ${roleColor}`}>
                                    {currentRole.replace('_', ' ')}
                                </span>
                            </div>
                            <Avatar className="h-9 w-9 border border-border">
                                <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    {displayedUser?.name ? displayedUser.name.charAt(0).toUpperCase() : 'E'}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-gray-50 dark:bg-zinc-950">
                    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-full">
                        <IdleTimeoutProvider>
                            <OnboardingTour />
                            {children}
                        </IdleTimeoutProvider>
                    </div>
                </main>
            </div>
        </div>
    );
}
