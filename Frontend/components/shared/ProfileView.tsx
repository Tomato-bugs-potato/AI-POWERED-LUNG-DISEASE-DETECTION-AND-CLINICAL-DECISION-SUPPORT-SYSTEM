'use client';

import * as React from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Mail, Hospital, Shield, Camera, Edit2, Check, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/lib/api';

export function ProfileView() {
    const { user, setUser } = useAuthStore();
    const [isEditing, setIsEditing] = React.useState(false);
    const [name, setName] = React.useState(user?.name || '');
    const [phone, setPhone] = React.useState(user?.phone_number || '');
    const [isUploading, setIsUploading] = React.useState(false);
    const [avatarSrc, setAvatarSrc] = React.useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (user) {
            setName(user.name || '');
            setPhone(user.phone_number || '');
        }
    }, [user]);

    // Fetch avatar via authenticated API client (plain <img> can't send JWT)
    React.useEffect(() => {
        if (!user?.avatar_url) { setAvatarSrc(''); return; }
        let revoked = false;
        api.get('/users/me/avatar', { responseType: 'blob' })
            .then((res) => {
                if (revoked) return;
                const url = URL.createObjectURL(res.data);
                setAvatarSrc(url);
            })
            .catch(() => setAvatarSrc(''));
        return () => { revoked = true; };
    }, [user?.avatar_url]);

    const handleSave = async () => {
        try {
            const res = await api.patch('/users/me', {
                name,
                phone_number: phone
            });
            setUser(res.data);
            setIsEditing(false);
            toast.success('Profile updated successfully');
        } catch (error: any) {
            toast.error('Failed to update profile');
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/users/me/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setUser(res.data);
            toast.success('Avatar updated successfully');
        } catch (error: any) {
            toast.error('Failed to upload avatar');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-3 duration-700 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">My Profile</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Your account information and settings.</p>
                </div>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="rounded-xl border-[#1C2222]/10">
                        <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm" className="rounded-xl">
                            <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                        <Button onClick={handleSave} size="sm" className="rounded-xl bg-[#4BA0A2] hover:bg-[#3a8284] text-white">
                            <Check className="mr-2 h-4 w-4" /> Save Changes
                        </Button>
                    </div>
                )}
            </div>

            <Card className="border-border shadow-sm overflow-hidden rounded-[2rem]">
                <CardContent className="p-0">
                    <div className="bg-premium-gradient p-8 sm:p-12">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 min-w-0">
                            <div className="relative group shrink-0">
                                <Avatar className="size-24 sm:size-32 border-4 border-white shadow-xl">
                                    <AvatarImage src={avatarSrc} />
                                    <AvatarFallback className="bg-[#4BA0A2] text-white text-3xl sm:text-4xl font-black">
                                        {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <button
                                    onClick={handleAvatarClick}
                                    disabled={isUploading}
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                                    ) : (
                                        <Camera className="text-white h-8 w-8" />
                                    )}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>

                            <div className="flex-1 text-center sm:text-left space-y-4 pt-4">
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#1C2222]/50 dark:text-white/50 uppercase tracking-widest">Full Name</label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="text-xl font-bold rounded-xl border-[#1C2222]/10 bg-white/60 focus:bg-white"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <h2 className="text-3xl font-black text-[#1C2222] dark:text-white tracking-tight">{user?.name || 'Unknown User'}</h2>
                                        <Badge variant="outline" className="mt-3 bg-[#4BA0A2]/10 text-[#4BA0A2] border-[#4BA0A2]/20 font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-wider">
                                            {user?.role?.toString().replace('_', ' ') || 'Staff'}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-8 sm:p-12 transition-colors duration-300">
                        <div className="grid gap-8 sm:grid-cols-2">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 group">
                                    <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-[#4BA0A2]/10 transition-colors">
                                        <Mail className="h-5 w-5 text-gray-400 group-hover:text-[#4BA0A2] transition-colors" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Email Address</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.email || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-[#4BA0A2]/10 transition-colors">
                                        <Phone className="h-5 w-5 text-gray-400 group-hover:text-[#4BA0A2] transition-colors" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</p>
                                        {isEditing ? (
                                            <Input
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="mt-1 rounded-lg border-[#1C2222]/10 bg-gray-50 text-sm h-8"
                                                placeholder="+1 234 567 890"
                                            />
                                        ) : (
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.phone_number || 'Not provided'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 group">
                                    <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-[#4BA0A2]/10 transition-colors">
                                        <Shield className="h-5 w-5 text-gray-400 group-hover:text-[#4BA0A2] transition-colors" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Verified Role</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.role?.toString().replace('_', ' ') || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-[#4BA0A2]/10 transition-colors">
                                        <Hospital className="h-5 w-5 text-gray-400 group-hover:text-[#4BA0A2] transition-colors" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Medical Institution</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.hospital_id || 'Global Healthcare Unit'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-gray-100">
                            <div className="flex items-center gap-4 group">
                                <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center">
                                    <UserIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System User ID</p>
                                    <p className="text-xs font-mono text-gray-500 truncate">{user?.user_id || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
