import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { CaseStatus } from '@/types';

interface CaseStatusBadgeProps {
    status: CaseStatus;
    className?: string;
}

export function CaseStatusBadge({ status, className = '' }: CaseStatusBadgeProps) {
    const getBadgeStyle = () => {
        switch (status) {
            case 'Pending_Review':
                return 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300';
            case 'In_Review':
                return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300';
            case 'Ready_for_Diagnosis':
                return 'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300';
            case 'Diagnosed':
                return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300';
            case 'Completed':
                return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const label = status.replace(/_/g, ' ');

    return (
        <Badge variant="secondary" className={`${getBadgeStyle()} border-0 ${className}`}>
            {label}
        </Badge>
    );
}
