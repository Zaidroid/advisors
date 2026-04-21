// ============================================
// Date Helpers
// ============================================

/** Get today as ISO date string (YYYY-MM-DD) */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Days between two ISO date strings */
export function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.floor((db.getTime() - da.getTime()) / 86_400_000);
}

/** Format a date string for display */
export function fmtDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Parse Google Sheets timestamp format (e.g. "6/3/2024 15:35:20") into ISO string */
export function parseGoogleTs(ts: string): string {
  if (!ts) return '';
  try {
    // Google Sheets format: M/D/YYYY H:M:S
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d.toISOString();
    // Try parsing manually
    const parts = ts.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+):?(\d+)?/);
    if (parts) {
      const [, m, day, y, h, min, s = '0'] = parts;
      return new Date(+y, +m - 1, +day, +h, +min, +s).toISOString();
    }
    return ts;
  } catch {
    return ts;
  }
}

/** Generate a compound ID from timestamp + email (advisor unique key) */
export function makeAdvisorId(timestamp: string, email: string): string {
  const ts = parseGoogleTs(timestamp);
  const clean = (email || '').toLowerCase().trim();
  // Simple hash-like ID
  const hash = `${ts}_${clean}`.replace(/[^a-z0-9@._-]/gi, '').slice(0, 80);
  return `adv_${simpleHash(hash)}`;
}

/** Simple string hash for deterministic IDs */
function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h = ((h << 5) - h) + ch;
    h |= 0;
  }
  return Math.abs(h).toString(36).padStart(6, '0');
}

/** Relative time label */
export function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(dateStr);
}

/** Current ISO timestamp */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Generate a unique ID (for follow-ups, comments) */
export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
