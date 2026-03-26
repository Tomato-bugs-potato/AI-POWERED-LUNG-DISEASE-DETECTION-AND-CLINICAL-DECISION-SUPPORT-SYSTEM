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
    HelpCircle,
    ChevronLeft,
 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
    const [isDesktopExpanded, setIsDesktopExpanded] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

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
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.push('/login');
    };

    const displayedUser = mounted ? user : null;
    const currentRole = displayedUser?.role || Role.Admin;
    const navItems = getNavItems(currentRole);

    return (
        <div className="h-screen w-full bg-[#E5EBEB] flex overflow-hidden">
            
             <aside 
                className={`shrink-0 flex flex-col py-6 bg-transparent transition-all duration-300 ${isDesktopExpanded ? 'w-64 px-4' : 'w-20 items-center'}`}
            >
                {/* Logo Section */}
                <div className={`mb-10 flex items-center gap-3 ${isDesktopExpanded ? 'px-2' : 'justify-center w-full'}`}>
                    <div className="bg-[#4BA0A2] w-10 h-10 shrink-0 rounded-xl text-white shadow-sm flex items-center justify-center">
                        <span className="font-extrabold text-lg leading-none">AI</span>
                    </div>
                    {isDesktopExpanded && (
                        <p className="font-bold text-sm leading-tight text-[#1C2222]">
                            Lung Disease Detection
                        </p>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col gap-3 w-full">
                    {/* Expand/Collapse Toggle */}
                    <button
                        onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
                        className={`p-2.5 rounded-xl text-gray-500 hover:bg-white hover:shadow-sm flex items-center transition-all ${isDesktopExpanded ? 'text-gray-900 justify-start px-4' : 'justify-center mx-auto'}`}
                    >
                        <ChevronLeft className={`w-5 h-5 shrink-0 transition-transform duration-300 ${!isDesktopExpanded ? 'rotate-180' : ''}`} />
                        {isDesktopExpanded && <span className="ml-3 font-extrabold text-[13px]">Collapse</span>}
                    </button>

                    <div className="w-full h-px bg-gray-200/50 my-2"></div>

                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={!isDesktopExpanded ? item.name : undefined}
                                className={`group flex items-center p-2.5 rounded-xl transition-all duration-200 ${
                                    isActive 
                                    ? 'bg-[#1C2222] text-white shadow-sm' 
                                    : 'text-[#8C9C9D] hover:bg-white hover:shadow-sm hover:text-gray-900'
                                } ${!isDesktopExpanded ? 'justify-center mx-auto' : 'justify-start px-4'}`}
                            >
                                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
                                {isDesktopExpanded && (
                                    <span className="ml-3 font-extrabold text-[13px] whitespace-nowrap overflow-hidden text-ellipsis">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <button 
                    onClick={handleLogout}
                    title="Logout"
                    className={`p-2.5 mt-auto rounded-xl text-gray-400 hover:text-red-500 hover:bg-white hover:shadow-sm flex items-center transition-all ${isDesktopExpanded ? 'justify-start px-4' : 'justify-center mx-auto'}`}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {isDesktopExpanded && <span className="ml-3 font-extrabold text-[13px]">Logout</span>}
                </button>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                
                {/* TOP HEADER */}
                <header className="h-24 flex items-center px-6 lg:px-10 shrink-0 border-none bg-transparent gap-8">
                    <nav className="hidden lg:flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`relative flex items-center px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-200 whitespace-nowrap ${
                                        isActive 
                                        ? 'bg-[#1C2222] text-white shadow-sm' 
                                        : 'text-[#8C9C9D] hover:text-gray-800'
                                    }`}
                                >
                                    <span>{item.name}</span>
                                    {item.showBadge && criticalCount > 0 && (
                                        <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-[10px] animate-pulse">
                                            {criticalCount}
                                        </Badge>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="lg:hidden flex-1">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-4 ml-auto shrink-0">
                        <div className="flex items-center gap-3 bg-white pl-1.5 pr-4 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] ml-2">
                            <Avatar className="h-8 w-8 border-none">
                                <AvatarFallback className="bg-[#FFDBA6] text-amber-800 font-bold text-xs">
                                    {displayedUser?.name ? displayedUser.name.charAt(0).toUpperCase() : 'A'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-400 leading-tight uppercase text-[10px]">
                                    {currentRole.replace('_', ' ')}
                                </span>
                                <span className="text-sm font-extrabold text-[#334155] leading-tight">
                                    {displayedUser?.name || 'Admin'}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-transparent">
                    <div className="p-4 sm:p-6 lg:p-8 xl:pr-10 max-w-[1600px] h-full flex flex-col">
                        <IdleTimeoutProvider>
                            <OnboardingTour />
                            {children}
                        </IdleTimeoutProvider>
                    </div>
                </main>
            </div>

            {/* Mobile Sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-2xl flex flex-col">
                         <div className="h-20 flex items-center px-6 justify-between border-b border-gray-100">
                             <span className="font-extrabold text-xl">Menu</span>
                             <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                                 <X className="h-5 w-5" />
                             </Button>
                         </div>
                         <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                             {navItems.map((item) => (
                                 <Link
                                     key={item.name}
                                     href={item.href}
                                     onClick={() => setSidebarOpen(false)}
                                     className="flex items-center px-4 py-3 rounded-xl text-gray-700 font-bold hover:bg-gray-100"
                                 >
                                     <item.icon className="mr-3 h-5 w-5" />
                                     <span>{item.name}</span>
                                 </Link>
                             ))}
                         </nav>
                    </aside>
                </div>
            )}
        </div>
    );
}