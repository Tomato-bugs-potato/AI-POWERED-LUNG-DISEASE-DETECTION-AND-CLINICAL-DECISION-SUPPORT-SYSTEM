'use client';

 import Link from 'next/link';
import { X, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useUIStore, useAuthStore } from '@/store';
import { Role } from '@/types';
import { getNavItems } from './NavItems';
import { clearTokens } from '@/lib/auth';

export function MobileSidebar() {
    const router = useRouter();
    const { sidebarOpen, setSidebarOpen } = useUIStore();
    const { user, logout } = useAuthStore();
    const currentRole = user?.role || Role.Admin;
    const navItems = getNavItems(currentRole);

    const handleLogout = () => {
        logout();
        clearTokens();
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        setSidebarOpen(false);
        router.push('/login');
    };

    if (!sidebarOpen) return null;

    return (
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
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 rounded-xl text-red-500 font-bold hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </div>
    );
}
