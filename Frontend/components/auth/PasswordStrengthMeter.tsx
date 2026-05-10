'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { PASSWORD_RULES, passwordStrength } from '@/lib/password';

interface PasswordStrengthMeterProps {
    value: string;
    className?: string;
}

const BAR_COLORS = [
    'bg-zinc-200',     // 0 empty
    'bg-red-500',      // 1
    'bg-orange-500',   // 2
    'bg-yellow-500',   // 3
    'bg-lime-500',     // 4
    'bg-green-600',    // 5
];

const LABEL_COLORS = [
    'text-zinc-400',
    'text-red-600',
    'text-orange-600',
    'text-yellow-600',
    'text-lime-600',
    'text-green-700',
];

export function PasswordStrengthMeter({ value, className = '' }: PasswordStrengthMeterProps) {
    const { score, label } = passwordStrength(value);

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4, 5].map((segment) => (
                        <div
                            key={segment}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                                segment <= score ? BAR_COLORS[score] : 'bg-zinc-200 dark:bg-zinc-800'
                            }`}
                        />
                    ))}
                </div>
                <span className={`text-xs font-semibold ${LABEL_COLORS[score]} min-w-[64px] text-right`}>
                    {label}
                </span>
            </div>

            <ul className="space-y-1">
                {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(value);
                    return (
                        <li
                            key={rule.id}
                            className={`flex items-center gap-2 text-xs transition-colors ${
                                ok ? 'text-green-700 dark:text-green-400' : 'text-[#1C2222]/50 dark:text-zinc-400'
                            }`}
                        >
                            {ok ? (
                                <Check className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                                <X className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
                            )}
                            <span>{rule.label}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
