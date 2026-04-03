'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, MoreHorizontal, Shield, Edit, Trash2, Ban, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Role } from '@/types';
import api from '@/lib/api';
import { sendWelcomeEmail, sendRoleChangeEmail } from '@/lib/email';

interface AppUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: 'Active' | 'Suspended';
    last_login: string;
}

const fetchUsers = async (): Promise<AppUser[]> => {
    const response = await api.get('/users');
    const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
    return data.map((u: any) => ({
        id: u.user_id || u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status === 'Inactive' || u.status === 'Locked' ? 'Suspended' : 'Active',
        last_login: u.last_login || new Date().toISOString(),
    }));
};

export default function UserManagementPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = React.useState('');
    const [dialogOpen, setDialogOpen] = React.useState(false);

    // Add User form state
    const [newName, setNewName] = React.useState('');
    const [newEmail, setNewEmail] = React.useState('');
    const [newRole, setNewRole] = React.useState<string>(Role.Doctor);
    const [newPassword, setNewPassword] = React.useState('');

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: fetchUsers,
    });

    // === Mutations ===

    const createUserMutation = useMutation({
        mutationFn: async (payload: { name: string; email: string; role: string; password: string }) => {
            return api.post('/users/', payload);
        },
        onSuccess: (_data, variables) => {
            toast.success('User created successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setDialogOpen(false);
            // Fire-and-forget welcome email via EmailJS (non-blocking)
            sendWelcomeEmail({
                to_email: variables.email,
                to_name: variables.name,
                temp_password: variables.password,
            }).catch(() => {/* email failure is non-fatal */ });
            setNewName('');
            setNewEmail('');
            setNewRole(Role.Doctor);
            setNewPassword('');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || 'Failed to create user');
        },
    });

    const suspendUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            return api.post(`/users/${userId}/deactivate`);
        },
        onSuccess: () => {
            toast.success('User suspended');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: () => toast.error('Failed to suspend user'),
    });

    const changeRoleMutation = useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
            return api.patch(`/users/${userId}/role`, { role });
        },
        onSuccess: (_data, variables) => {
            toast.success('User role updated');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            // Notify affected user via EmailJS (fire-and-forget)
            const affected = users.find(u => u.id === variables.userId);
            if (affected) {
                sendRoleChangeEmail({
                    to_email: affected.email,
                    to_name: affected.name,
                    new_role: variables.role,
                }).catch(() => {/* email failure is non-fatal */ });
            }
        },
        onError: () => toast.error('Failed to update role'),
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            return api.delete(`/users/${userId}`);
        },
        onSuccess: () => {
            toast.success('User deleted');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: () => toast.error('Failed to delete user. User may only be deactivated.'),
    });

    // === Handlers ===

    const handleCreateUser = () => {
        if (!newName || !newEmail || !newPassword) {
            toast.error('Please fill all required fields');
            return;
        }
        createUserMutation.mutate({ name: newName, email: newEmail, role: newRole, password: newPassword });
    };

    const handleSuspend = (userId: string, userName: string) => {
        if (confirm(`Suspend ${userName}? They will lose access.`)) {
            suspendUserMutation.mutate(userId);
        }
    };

    const handleDelete = (userId: string, userName: string) => {
        if (confirm(`Permanently delete ${userName}? This cannot be undone.`)) {
            deleteUserMutation.mutate(userId);
        }
    };

    const handleRoleChange = (userId: string, newRoleValue: string) => {
        changeRoleMutation.mutate({ userId, role: newRoleValue });
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-6 w-6 text-black" />
                        User Management
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage staff access roles and system permissions.</p>
                </div>

                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Add New User
                </Button>
            </div>

            {/* Add User Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[480px] bg-white">
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                            Add a new staff member. They will use these credentials to log in.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="user-name">Full Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="user-name"
                                placeholder="Dr. John Doe"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-email">Email <span className="text-red-500">*</span></Label>
                            <Input
                                id="user-email"
                                type="email"
                                placeholder="john@hospital.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-role">Role</Label>
                            <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger id="user-role">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className='bg-white'>
                                    <SelectItem value={Role.Admin}>Admin</SelectItem>
                                    <SelectItem value={Role.Doctor}>Doctor</SelectItem>
                                    <SelectItem value={Role.Radiologist}>Radiologist</SelectItem>
                                    <SelectItem value={Role.Lab_Technician}>Lab Technician</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-password">Temporary Password <span className="text-red-500">*</span></Label>
                            <Input
                                id="user-password"
                                type="password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreateUser}
                            disabled={createUserMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {createUserMutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                            ) : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card className="border-none shadow-none rounded-none bg-transparent dark:bg-transparent overflow-hidden">
                <CardContent className="p-0 space-y-4">

                    <div className="relative max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            className="pl-9 h-11 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus-visible:ring-1 focus-visible:ring-black/5"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="relative min-h-[400px]">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                <Shield className="h-10 w-10 text-gray-300 mb-3" />
                                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No users found</h3>
                                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or add a new user.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-sm text-left border-collapse border-spacing-0">
                                    <thead className="text-[10px] text-black uppercase bg-gray-200 font-black tracking-widest border-b border-gray-200">
                                        <tr className="divide-x divide-gray-100">
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Personnel Name</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100 text-center">Designation</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100 text-center">Account Status</th>
                                            <th scope="col" className="px-4 py-3.5 border-r border-gray-100">Recorded Activity</th>
                                            <th scope="col" className="px-4 py-3.5 text-right w-[100px]">Options</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id} className="bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-none divide-x divide-gray-100">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-black dark:text-gray-100 leading-tight">{u.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-medium">{u.email}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant="outline" className={`rounded-md px-2 py-0 border-none font-black text-[9px] uppercase ${
                                                        u.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                                                        u.role === 'Doctor' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-orange-100 text-orange-700'
                                                    }`}>
                                                        {u.role}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-gray-100">
                                                        <div className={`h-1.5 w-1.5 rounded-full ${u.status === 'Active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`} />
                                                        <span className={`text-[9px] font-black uppercase ${u.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>{u.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 font-bold text-[10px]">
                                                    {format(new Date(u.last_login), 'MMM d, h:mm a')}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className='bg-white'>
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    <Edit className="mr-2 h-4 w-4" /> Change Role
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent >
                                                                    <DropdownMenuItem onClick={() => handleRoleChange(u.id, Role.Admin)} disabled={u.role === Role.Admin}>Admin</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleRoleChange(u.id, Role.Doctor)} disabled={u.role === Role.Doctor}>Doctor</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleRoleChange(u.id, Role.Radiologist)} disabled={u.role === Role.Radiologist}>Radiologist</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleRoleChange(u.id, Role.Lab_Technician)} disabled={u.role === Role.Lab_Technician}>Lab Technician</DropdownMenuItem>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-orange-600" onClick={() => handleSuspend(u.id, u.name)}>
                                                                <Ban className="mr-2 h-4 w-4" /> Suspend user
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(u.id, u.name)}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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
