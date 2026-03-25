'use client';

import * as React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface ConfidenceSliderProps {
    value: number;
    onChange: (value: number) => void;
    visibleCount: number;
    totalCount: number;
}

export function ConfidenceSlider({ value, onChange, visibleCount, totalCount }: ConfidenceSliderProps) {
    return (
        <div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-zinc-900 border-border">
            <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">Confidence Threshold</h3>
                <span className="text-xs font-mono bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 py-0.5 px-2 rounded-full">
                    {value}%
                </span>
            </div>

            <Slider
                value={[value]}
                min={0}
                max={100}
                step={1}
                onValueChange={(vals) => onChange(vals[0])}
                className="py-2"
            />

            {/* FR-15: Preset buttons for quick threshold selection */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onChange(0)}
                    className="h-7 text-xs px-3"
                >
                    Show All
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onChange(80)}
                    className="h-7 text-xs px-3"
                >
                    High Only
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onChange(50)}
                    className="h-7 text-xs px-3"
                >
                    Default
                </Button>
            </div>

            <div className="flex justify-between items-center top-border pt-2 border-t border-border/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Showing <strong className="text-gray-900 dark:text-gray-200">{visibleCount}</strong> of {totalCount} detections
                </p>
                <Button
                    variant="link"
                    size="sm"
                    onClick={() => onChange(50)}
                    className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                    Reset to 50%
                </Button>
            </div>
        </div>
    );
}
