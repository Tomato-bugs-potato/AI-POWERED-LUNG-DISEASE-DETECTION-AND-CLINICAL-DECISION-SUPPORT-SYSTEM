// Shared date-range types and filtering utilities for dashboards.
//
// Dashboards use a single Range selector (Today / Week / Month / All)
// that filters every chart and stat card to the same window.

export type Range = 'today' | 'week' | 'month' | 'all';

export const RANGE_OPTIONS: { value: Range; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'Last 30 days' },
    { value: 'all', label: 'All time' },
];

// Returns the inclusive lower bound of a range (or null for "all").
export function rangeStart(range: Range, now = new Date()): Date | null {
    if (range === 'all') return null;
    const d = new Date(now);
    if (range === 'today') {
        d.setHours(0, 0, 0, 0);
        return d;
    }
    const days = range === 'week' ? 7 : 30;
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Predicate: is `iso` within the range?
export function withinRange(iso: string | undefined | null, range: Range, now = new Date()): boolean {
    if (!iso) return false;
    const start = rangeStart(range, now);
    if (start === null) return true;
    const t = new Date(iso).getTime();
    if (isNaN(t)) return false;
    return t >= start.getTime();
}

// Produce N daily buckets (oldest -> newest) for an area / bar chart.
// Each bucket has `{ day: 'MMM d', date: Date, count: 0 }`. Callers fill counts.
export function dailyBuckets(days: number, now = new Date()): { day: string; date: Date; count: number }[] {
    const out: { day: string; date: Date; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        out.push({
            day: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            date: d,
            count: 0,
        });
    }
    return out;
}

// Increment the bucket containing `iso`. No-op if outside the window.
export function bumpBucket(
    buckets: { date: Date; count: number }[],
    iso: string | undefined | null,
): void {
    if (!iso) return;
    const t = new Date(iso).getTime();
    if (isNaN(t)) return;
    for (let i = 0; i < buckets.length; i++) {
        const start = buckets[i].date.getTime();
        const end = i + 1 < buckets.length ? buckets[i + 1].date.getTime() : Infinity;
        if (t >= start && t < end) {
            buckets[i].count++;
            return;
        }
    }
}
