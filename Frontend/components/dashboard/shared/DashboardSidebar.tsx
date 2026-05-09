'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/store';
import { clearTokens } from '@/lib/auth';
import { Role } from '@/types';
import { getNavItems } from './NavItems';

export function DashboardSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const [mounted, setMounted] = React.useState(false);
    const [isDesktopExpanded, setIsDesktopExpanded] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
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
        <aside
            className={`sticky top-0 h-screen shrink-0 hidden lg:flex flex-col py-6 bg-transparent transition-all duration-300 overflow-y-auto ${isDesktopExpanded ? 'w-64 px-4' : 'w-24 items-center'}`}
        >
            {/* Logo Section */}
            <div className={`mb-10 flex items-center gap-3 ${isDesktopExpanded ? 'px-2' : 'justify-center w-full'}`}>
                <div className={`bg-[#4BA0A2] shrink-0 rounded-2xl text-white shadow-md flex items-center justify-center transition-all duration-300 overflow-hidden ${isDesktopExpanded ? 'w-10 h-10' : 'w-12 h-12'}`}>
                    <img src="/image.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                {isDesktopExpanded && (
                    <p className="font-bold text-sm leading-tight text-[#1C2222] dark:text-white transition-colors duration-300">
                        Lung Disease Detection
                    </p>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-3 w-full">
                <button
                    onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
                    className={`transition-all duration-300 flex items-center ${isDesktopExpanded ? 'p-3 px-4 rounded-2xl text-gray-900 dark:text-white hover:bg-white/50 dark:hover:bg-zinc-800/50 w-full' : 'w-12 h-12 rounded-full bg-white/40 dark:bg-zinc-900/40 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-zinc-800 justify-center mx-auto shadow-sm'}`}
                >
                    <ChevronLeft className={`w-5 h-5 shrink-0 transition-transform duration-300 ${!isDesktopExpanded ? 'rotate-180' : ''}`} />
                    {isDesktopExpanded && <span className="ml-3 font-extrabold text-[13px]">Collapse</span>}
                </button>

                <div className="w-full h-px bg-gray-200/50 my-2"></div>

                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            title={!isDesktopExpanded ? item.name : undefined}
                            className={`group flex items-center transition-all duration-300 ${isActive
                                ? (isDesktopExpanded ? 'bg-[#1C2222] text-white shadow-md rounded-2xl p-3 px-4' : 'bg-[#1C2222] text-white shadow-lg rounded-full w-12 h-12 justify-center')
                                : (isDesktopExpanded ? 'text-black dark:text-white/80 hover:bg-white/50 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-white rounded-2xl p-3 px-4' : 'bg-white/60 dark:bg-zinc-900/40 text-black dark:text-gray-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white rounded-full w-12 h-12 justify-center shadow-sm')
                                } ${isDesktopExpanded ? 'w-full' : 'mx-auto'}`}
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
                className={`mt-auto transition-all duration-300 flex items-center ${isDesktopExpanded ? 'p-3 px-4 rounded-2xl text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-white/50 dark:hover:bg-zinc-800/50 w-full' : 'w-12 h-12 rounded-full bg-white/40 dark:bg-zinc-900/40 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-white dark:hover:bg-zinc-800 justify-center mx-auto shadow-sm'}`}
            >
                <LogOut className="w-5 h-5 shrink-0" />
                {isDesktopExpanded && <span className="ml-3 font-extrabold text-[13px] text-black dark:text-white transition-colors duration-300">Logout</span>}
            </button>
        </aside>
    );
}
