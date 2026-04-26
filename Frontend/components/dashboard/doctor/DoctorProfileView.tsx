'use client';

 import { useAuthStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Hospital, Shield } from 'lucide-react';

export function DoctorProfileView() {
    const { user } = useAuthStore();

    return (
        <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-3 duration-700">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">My Profile</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Your account information and settings.</p>
            </div>

            <Card className="border-border shadow-sm">
                <CardContent className="p-4 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 min-w-0">
                        <Avatar className="size-20 sm:size-24  shrink-0">
                            <AvatarFallback className="bg-blue-100   w-10 h-10 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xl sm:text-2xl font-bold">
                                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 text-center sm:text-left">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name || 'Unknown'}</h2>
                            <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                                {user?.role?.replace('_', ' ') || 'Staff'}
                            </Badge>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900/50 min-w-0">
                            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wider">Email</p>
                                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.email || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900/50 min-w-0">
                            <Shield className="h-4 w-4 text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wider">Role</p>
                                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.role?.replace('_', ' ') || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900/50 min-w-0">
                            <Hospital className="h-4 w-4 text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wider">Hospital</p>
                                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.hospital_id || 'Not assigned'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900/50 min-w-0">
                            <User className="h-4 w-4 text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wider">User ID</p>
                                <p className="text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 truncate">{user?.user_id || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
