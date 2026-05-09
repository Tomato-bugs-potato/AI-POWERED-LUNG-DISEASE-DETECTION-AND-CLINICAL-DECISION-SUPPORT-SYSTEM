// Single KPI tile used across every role dashboard.
// All colors flow from the design tokens defined in app/globals.css — change
// the brand palette there and every dashboard updates.

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface StatCardProps {
    label: string;
    value: number | string;
    sublabel?: string;
    icon?: React.ReactNode;
    /** Optional delta vs. previous window. Positive=up, negative=down. */
    delta?: number;
    /** What direction means "good" for this metric — drives the delta color. */
    deltaDirection?: 'higher-is-better' | 'lower-is-better';
    loading?: boolean;
    /** Tone tints the icon chip background. */
    tone?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
    /** Compact mode: tighter padding and smaller value text — for sidebars. */
    compact?: boolean;
    className?: string;
}

const TONE_BG: Record<NonNullable<StatCardProps['tone']>, string> = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/15 text-primary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    destructive: 'bg-destructive/15 text-destructive',
};

export function StatCard({
    label,
    value,
    sublabel,
    icon,
    delta,
    deltaDirection = 'higher-is-better',
    loading = false,
    tone = 'primary',
    compact = false,
    className,
}: StatCardProps) {
    const deltaIsGood =
        delta == null
            ? false
            : deltaDirection === 'higher-is-better'
              ? delta > 0
              : delta < 0;
    const deltaIsBad =
        delta == null
            ? false
            : deltaDirection === 'higher-is-better'
              ? delta < 0
              : delta > 0;

    return (
        <div
            className={cn(
                'bg-card text-card-foreground rounded-2xl border border-border shadow-sm',
                'transition-shadow hover:shadow-md',
                compact ? 'p-4' : 'p-5',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {label}
                    </p>
                    <div className={cn('flex items-baseline gap-2', compact ? 'mt-1' : 'mt-2')}>
                        {loading ? (
                            <Skeleton className={compact ? 'h-6 w-16' : 'h-8 w-20'} />
                        ) : (
                            <span className={cn('font-bold tabular-nums text-foreground', compact ? 'text-xl' : 'text-3xl')}>
                                {value}
                            </span>
                        )}
                        {delta != null && !loading && (
                            <span
                                className={cn(
                                    'text-xs font-semibold',
                                    deltaIsGood && 'text-success',
                                    deltaIsBad && 'text-destructive',
                                    !deltaIsGood && !deltaIsBad && 'text-muted-foreground',
                                )}
                            >
                                {delta > 0 ? '+' : ''}
                                {delta}
                                {typeof delta === 'number' ? '%' : ''}
                            </span>
                        )}
                    </div>
                    {sublabel && (
                        <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
                    )}
                </div>
                {icon && (
                    <div
                        className={cn(
                            'shrink-0 flex items-center justify-center rounded-full',
                            compact ? 'h-8 w-8' : 'h-10 w-10',
                            TONE_BG[tone],
                        )}
                    >
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}

export function StatGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
    const colClass =
        cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';
    return <div className={cn('grid gap-4', colClass)}>{children}</div>;
}
