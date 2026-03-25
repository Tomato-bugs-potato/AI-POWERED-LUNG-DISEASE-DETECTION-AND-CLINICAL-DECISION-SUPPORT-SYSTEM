import { format } from 'date-fns';

/**
 * Format a date string with timezone awareness (NFR-29).
 * Uses the browser's locale and timezone for display.
 */
export function formatDateLocale(
  dateInput: string | Date,
  formatStr: string = 'MMM d, yyyy \u2022 h:mm a'
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Invalid date';

  // Use Intl.DateTimeFormat for timezone-aware display
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

/**
 * Format a date for display with just the date portion.
 */
export function formatDateOnly(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Get the user's current timezone name.
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
