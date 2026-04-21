// ============================================
// Pipeline Statuses — color tokens + labels
// ============================================

import type { AdvisorStatus } from '../types';

export interface StatusMeta {
  key: AdvisorStatus;
  label: string;
  color: string;       // Tailwind-compatible color class
  bg: string;          // background color
  dot: string;         // dot color for small indicators
}

export const STATUSES: StatusMeta[] = [
  { key: 'new',          label: 'New',             color: 'text-blue-700',    bg: 'bg-blue-50',     dot: '#3B82F6' },
  { key: 'acknowledged', label: 'Acknowledged',    color: 'text-sky-700',     bg: 'bg-sky-50',      dot: '#0EA5E9' },
  { key: 'allocated',    label: 'Allocated',       color: 'text-indigo-700',  bg: 'bg-indigo-50',   dot: '#6366F1' },
  { key: 'intro_sched',  label: 'Intro Scheduled', color: 'text-violet-700',  bg: 'bg-violet-50',   dot: '#8B5CF6' },
  { key: 'intro_done',   label: 'Intro Done',      color: 'text-purple-700',  bg: 'bg-purple-50',   dot: '#A855F7' },
  { key: 'assessment',   label: 'Assessment',      color: 'text-amber-700',   bg: 'bg-amber-50',    dot: '#F59E0B' },
  { key: 'approved',     label: 'Approved',        color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: '#10B981' },
  { key: 'rejected',     label: 'Rejected',        color: 'text-red-700',     bg: 'bg-red-50',      dot: '#EF4444' },
  { key: 'matched',      label: 'Matched',         color: 'text-teal-700',    bg: 'bg-teal-50',     dot: '#14B8A6' },
  { key: 'on_hold',      label: 'On Hold',         color: 'text-gray-600',    bg: 'bg-gray-100',    dot: '#9CA3AF' },
];

export const STATUS_MAP = new Map(STATUSES.map(s => [s.key, s]));

export function getStatusMeta(key: AdvisorStatus): StatusMeta {
  return STATUS_MAP.get(key) || STATUSES[0];
}

export const STATUS_ORDER: AdvisorStatus[] = STATUSES.map(s => s.key);
