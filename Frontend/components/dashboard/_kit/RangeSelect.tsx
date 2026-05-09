'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Range, RANGE_OPTIONS } from './range';

export function RangeSelect({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
    return (
        <Select value={value} onValueChange={(v) => onChange(v as Range)}>
            <SelectTrigger className="w-40 bg-card border-border">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
