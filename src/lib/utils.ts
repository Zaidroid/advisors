import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a Google Forms timestamp to a readable date */
export function fmtDate(ts: string): string {
  if (!ts) return '';
  // Handle "M/D/YYYY HH:MM:SS" format
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(ts);
  if (m) {
    const [, mm, dd, yyyy] = m;
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  try {
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ts; }
}

/** Get initials from a name */
export function initials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Days between two ISO dates */
export function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.floor(ms / 86400000);
}

/** Today as YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parse Google Forms timestamp to ISO */
export function parseGoogleTs(ts: string): string {
  if (!ts) return todayISO();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(ts);
  if (!m) return todayISO();
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** Score to color class */
export function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-500';
}

/** Score to ring stroke color */
export function scoreStroke(score: number): string {
  if (score >= 70) return '#059669';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}
