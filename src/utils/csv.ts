// ============================================
// CSV Export Utility
// ============================================

import type { EnrichedAdvisor } from '../types';
import { getStatusMeta } from '../config/statuses';
import { fmtDate } from './date';

/** Generate CSV string from enriched advisors */
export function generateCSV(advisors: EnrichedAdvisor[]): string {
  const headers = [
    'Name', 'Email', 'Country', 'Gender', 'Position', 'Employer',
    'Years', 'LinkedIn', 'Tech Rating', 'Eco Rating', 'C-Level',
    'Stage 1 Score', 'Stage 1 Pass', 'Primary Category',
    'CEO Score', 'CTO Score', 'COO Score',
    'Status', 'Assignee', 'Notes',
    'Received Ack', 'Last Updated', 'Updated By',
  ];

  const rows = advisors.map(a => [
    esc(a.name),
    esc(a.email),
    esc(a.country),
    esc(a.gender),
    esc(a.position),
    esc(a.employer),
    esc(a.years),
    esc(a.linkedin),
    a.techRating,
    a.ecoRating,
    a.cLevel,
    a.stage1.total.toString(),
    a.stage1.pass ? 'Yes' : 'No',
    a.stage2.primary,
    a.stage2.ceo.toString(),
    a.stage2.cto.toString(),
    a.stage2.coo.toString(),
    a.tracker ? getStatusMeta(a.tracker.status).label : 'New',
    a.tracker?.assignee || '',
    esc(a.tracker?.notes || ''),
    a.tracker?.receivedAck ? 'Yes' : 'No',
    a.tracker?.updatedAt ? fmtDate(a.tracker.updatedAt) : '',
    a.tracker?.updatedBy || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/** Trigger a CSV download in the browser */
export function downloadCSV(advisors: EnrichedAdvisor[], filename = 'advisors-export.csv') {
  const csv = generateCSV(advisors);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function esc(val: string): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
