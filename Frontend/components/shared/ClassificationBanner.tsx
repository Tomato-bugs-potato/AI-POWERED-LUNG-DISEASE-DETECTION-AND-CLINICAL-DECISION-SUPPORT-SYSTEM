'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';

export interface ClassificationData {
    disease_class: string;
    confidence_score: number;
    probabilities?: Record<string, number> | null;
}

interface ClassificationBannerProps {
    classification: ClassificationData | null | undefined;
}

const CLASS_COLOR: Record<string, string> = {
    Pneumonia: 'bg-red-500',
    Tuberculosis: 'bg-yellow-500',
    'Lung Tumor': 'bg-orange-500',
    Normal: 'bg-green-500',
    Other: 'bg-blue-500',
};

const CLASS_TEXT: Record<string, string> = {
    Pneumonia: 'text-red-300',
    Tuberculosis: 'text-yellow-300',
    'Lung Tumor': 'text-orange-300',
    Normal: 'text-green-300',
    Other: 'text-blue-300',
};

const CLASS_RING: Record<string, string> = {
    Pneumonia: 'ring-red-500/40',
    Tuberculosis: 'ring-yellow-500/40',
    'Lung Tumor': 'ring-orange-500/40',
    Normal: 'ring-green-500/40',
    Other: 'ring-blue-500/40',
};

export function ClassificationBanner({ classification }: ClassificationBannerProps) {
    if (!classification?.disease_class) return null;

    const cls = classification.disease_class;
    const confidence = Math.round((classification.confidence_score || 0) * 100);
    const dotColor = CLASS_COLOR[cls] || CLASS_COLOR.Other;
    const textColor = CLASS_TEXT[cls] || CLASS_TEXT.Other;
    const ring = CLASS_RING[cls] || CLASS_RING.Other;

    const sortedProbs = classification.probabilities
        ? Object.entries(classification.probabilities)
            .sort((a, b) => b[1] - a[1])
            .filter(([k]) => k !== cls)
            .slice(0, 3)
        : [];

    return (
        <div
            className={`flex items-center justify-between gap-4 px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800 ring-1 ring-inset ${ring}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0">
                    Overall classification
                </span>
                <span className={`h-2.5 w-2.5 rounded-full ${dotColor} shrink-0`} />
                <span className={`text-sm font-semibold ${textColor} truncate`}>{cls}</span>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 shrink-0">
                    {confidence}%
                </span>
            </div>

            {sortedProbs.length > 0 && (
                <div className="hidden md:flex items-center gap-3 text-[11px] text-zinc-400">
                    {sortedProbs.map(([name, p]) => {
                        const pct = Math.round(p * 100);
                        return (
                            <div key={name} className="flex items-center gap-1.5">
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${CLASS_COLOR[name] || CLASS_COLOR.Other}`}
                                />
                                <span className="text-zinc-300">{name}</span>
                                <span className="font-mono text-zinc-500">{pct}%</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
