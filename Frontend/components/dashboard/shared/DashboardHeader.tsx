'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore, useUIStore } from '@/store';
import { Role } from '@/types';
import api from '@/lib/api';
import { getNavItems } from './NavItems';

export function DashboardHeader() {
    const pathname = usePathname();
    const { user } = useAuthStore();
    const { setSidebarOpen } = useUIStore();
    const [mounted, setMounted] = React.useState(false);
    const [criticalCount, setCriticalCount] = React.useState(0);

    React.useEffect(() => {
        setMounted(true);
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

    const displayedUser = mounted ? user : null;
    const currentRole = displayedUser?.role || Role.Admin;
    const navItems = getNavItems(currentRole);

    return (
        <header className="h-16 sm:h-24 flex items-center px-3 sm:px-6 lg:px-10 shrink-0 border-none bg-transparent gap-4 sm:gap-8">
            <nav className="hidden lg:flex items-center gap-2 overflow-x-auto no-scrollbar">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`relative flex items-center px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-200 whitespace-nowrap ${isActive
                                ? 'bg-[#1C2222] text-white shadow-sm'
                                : 'text-black hover:text-gray-800'
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
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900/80 pl-3 pr-4 py-1.5 rounded-full ml-2 shadow-sm border border-slate-100 dark:border-zinc-800">
                    <Avatar className="size-8 sm:size-10 ring-2 ring-[#1C2222] ring-offset-1">
                        <AvatarFallback className="bg-[#4BA0A2] text-white font-bold text-xs sm:text-sm">
                            {displayedUser?.name ? displayedUser.name.charAt(0).toUpperCase() : 'A'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 leading-tight uppercase text-[10px]">
                            {currentRole.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-extrabold text-[#334155] dark:text-white leading-tight">
                            {displayedUser?.name || 'Admin'}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}
