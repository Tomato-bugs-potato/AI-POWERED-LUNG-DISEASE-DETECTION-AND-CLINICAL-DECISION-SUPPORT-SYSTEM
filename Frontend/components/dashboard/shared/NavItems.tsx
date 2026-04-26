import {
    Home,
    Upload,
    ListTodo,
    User as UserIcon,
    Search,
    FileText,
    Users,
    ShieldAlert,
    HelpCircle,
} from 'lucide-react';
import { Role } from '@/types';
import * as React from 'react';

export type NavItem = {
    name: string;
    href: string;
    icon: React.ElementType;
    showBadge?: boolean;
};

export const getNavItems = (role?: string): NavItem[] => {
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
