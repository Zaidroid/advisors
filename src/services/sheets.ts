// ============================================
// Google Sheets API Service — Read/Write Operations
// ============================================

import type { Advisor, TrackerRow, FollowUp, Activity, Comment, TeamMember, AppConfig, AdvisorStatus } from '../types';
import { scoreAdvisor } from '../utils/scoring';
import { makeAdvisorId, nowISO } from '../utils/date';
import { DEFAULT_CONFIG } from '../config/scoring';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

// ─── Session Events ──────────────────────────────────
export const sessionEvents = new EventTarget();

// ─── Token / Request Helpers ─────────────────────────

function getAccessToken(silent = false): string | null {
  const token = localStorage.getItem('google_access_token');
  const expiry = localStorage.getItem('token_expiry');
  if (!token || !expiry || Date.now() >= parseInt(expiry)) {
    if (!silent) sessionEvents.dispatchEvent(new Event('session-expired'));
    return null;
  }
  return token;
}

async function sheetsRequest<T>(
  url: string,
  options: RequestInit = {},
  retries = 2
): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error('No valid access token');

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401) {
    sessionEvents.dispatchEvent(new Event('session-expired'));
    throw new Error('Session expired');
  }

  if (res.status === 429 && retries > 0) {
    const delay = Math.pow(2, 3 - retries) * 1000;
    await new Promise(r => setTimeout(r, delay));
    return sheetsRequest<T>(url, options, retries - 1);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API ${res.status}: ${body}`);
  }

  return res.json();
}

function rangeUrl(sheetId: string, range: string): string {
  return `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(range)}`;
}

// ─── API Status ──────────────────────────────────────

export function getApiStatus() {
  const token = getAccessToken(true); // silent — don't dispatch events
  return {
    connected: !!token,
    authenticated: !!token,
  };
}

// ─── READ: Responses Sheet ───────────────────────────

export async function fetchAdvisors(config: AppConfig = DEFAULT_CONFIG): Promise<Advisor[]> {
  const sheetId = import.meta.env.VITE_RESPONSES_SHEET_ID || config.responsesSheetId;
  if (!sheetId) return [];

  const tabName = config.responsesTabName || 'Form Responses 1';
  const url = rangeUrl(sheetId, `'${tabName}'!A:AC`) + '?valueRenderOption=FORMATTED_VALUE';

  const data = await sheetsRequest<{ values?: (string | number)[][] }>(url);
  if (!data.values || data.values.length < 2) {
    console.warn('📊 No data in responses sheet. Tab:', tabName, 'Values:', data.values?.length || 0);
    return [];
  }

  const [headers, ...rows] = data.values;
  console.log('📊 Responses sheet loaded:', rows.length, 'rows,', headers.length, 'columns');

  // Safe string getter — handles numbers, nulls, undefined
  const str = (val: unknown): string => (val == null ? '' : String(val));

  // Parse year from Google Forms timestamp like "6/3/2024 15:35:20" or "1/15/2026 10:01:00"
  const parseYear = (ts: string): number => {
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(ts);
    return m ? parseInt(m[3], 10) : 0;
  };

  const filterYear = config.filter_year || 2026;

  return rows
    .filter(row => {
      if (row.length < 6) return false;
      const ts = str(row[0]).trim();
      if (!ts) return false;
      const year = parseYear(ts);
      return year >= filterYear;
    })
    .map(row => {
      const raw: Partial<Advisor> = {
        timestamp: str(row[0]),
        name: str(row[2]),
        gender: str(row[3]),
        country: str(row[4]),
        email: str(row[5]),
        whatsapp: str(row[6]),
        linkedin: str(row[7]),
        techRating: str(row[8]),
        ecoRating: str(row[9]),
        expAreas: str(row[10]),
        expDetail: str(row[11]),
        cLevel: str(row[12]),
        cLevelDetail: str(row[13]),
        position: str(row[14]),
        employer: str(row[15]),
        years: str(row[16]),
        nonTechSubjects: str(row[17]),
        gsgPast: str(row[18]),
        paidOrVol: str(row[19]),
        hourlyRate: str(row[20]),
        cvLink: str(row[21]),
        notes: str(row[22]),
        heardFrom: str(row[23]),
        opportunities: str(row[24]),
        supportIn: str(row[25]),
        supportVia: str(row[26]),
        techSpecs: str(row[27]),
        newsletter: str(row[28]),
      };

      const id = makeAdvisorId(raw.timestamp!, raw.email!);
      const { stage1, stage2 } = scoreAdvisor(raw, config);

      return {
        ...raw,
        id,
        stage1,
        stage2,
      } as Advisor;
    });
}

// ─── READ: Backend Tabs ──────────────────────────────

export async function fetchTracker(): Promise<TrackerRow[]> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return [];
  try {
    const data = await sheetsRequest<{ values?: string[][] }>(
      rangeUrl(sheetId, 'Tracker!A2:K')
    );
    return (data.values || []).map(row => ({
      advisorId: row[0] || '',
      status: (row[1] || 'new') as AdvisorStatus,
      assignee: row[2] || '',
      receivedAck: row[3] === 'TRUE' || row[3] === 'true',
      introScheduled: row[4] || '',
      assessmentDate: row[5] || '',
      decisionDate: row[6] || '',
      notes: row[7] || '',
      lastAction: row[8] || '',
      updatedBy: row[9] || '',
      updatedAt: row[10] || '',
    }));
  } catch { return []; }
}

export async function fetchFollowUps(): Promise<FollowUp[]> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return [];
  try {
    const data = await sheetsRequest<{ values?: string[][] }>(
      rangeUrl(sheetId, 'FollowUps!A2:J')
    );
    return (data.values || []).map(row => ({
      id: row[0] || '',
      advisorId: row[1] || '',
      dueDate: row[2] || '',
      type: row[3] || '',
      assignee: row[4] || '',
      status: (row[5] || 'open') as 'open' | 'done' | 'snoozed',
      notes: row[6] || '',
      createdBy: row[7] || '',
      createdAt: row[8] || '',
      completedAt: row[9] || '',
    }));
  } catch { return []; }
}

export async function fetchActivityLog(): Promise<Activity[]> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return [];
  try {
    const data = await sheetsRequest<{ values?: string[][] }>(
      rangeUrl(sheetId, 'ActivityLog!A2:H')
    );
    return (data.values || []).map(row => ({
      timestamp: row[0] || '',
      userEmail: row[1] || '',
      advisorId: row[2] || '',
      action: row[3] || '',
      field: row[4] || '',
      oldValue: row[5] || '',
      newValue: row[6] || '',
      details: row[7] || '',
    })).reverse(); // newest first
  } catch { return []; }
}

export async function fetchComments(): Promise<Comment[]> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return [];
  try {
    const data = await sheetsRequest<{ values?: string[][] }>(
      rangeUrl(sheetId, 'Comments!A2:G')
    );
    return (data.values || []).map(row => ({
      id: row[0] || '',
      advisorId: row[1] || '',
      parentId: row[2] || '',
      userEmail: row[3] || '',
      createdAt: row[4] || '',
      body: row[5] || '',
      resolved: row[6] === 'TRUE' || row[6] === 'true',
    }));
  } catch { return []; }
}

export async function fetchTeam(): Promise<TeamMember[]> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return [];
  try {
    const data = await sheetsRequest<{ values?: string[][] }>(
      rangeUrl(sheetId, 'Team!A2:D')
    );
    return (data.values || []).map(row => ({
      email: row[0] || '',
      name: row[1] || '',
      role: (row[2] || 'user') as 'admin' | 'user',
      active: row[3] !== 'FALSE' && row[3] !== 'false',
    }));
  } catch { return []; }
}

export async function fetchConfig(): Promise<AppConfig> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return DEFAULT_CONFIG;
  try {
    const data = await sheetsRequest<{ values?: string[][] }>(
      rangeUrl(sheetId, 'Config!A2:B')
    );
    const config = { ...DEFAULT_CONFIG };
    for (const row of data.values || []) {
      const key = row[0];
      const val = row[1];
      if (!key || !val) continue;
      try {
        switch (key) {
          case 'responsesSheetId': config.responsesSheetId = val; break;
          case 'responsesTabName': config.responsesTabName = val; break;
          case 'stale_days': config.stale_days = parseInt(val); break;
          case 'stage1_threshold': config.stage1_threshold = parseInt(val); break;
          case 'stage1_weights': config.stage1_weights = JSON.parse(val); break;
          case 'years_multipliers': config.years_multipliers = JSON.parse(val); break;
          case 'seniority_tiers': config.seniority_tiers = JSON.parse(val); break;
          case 'category_ceo': config.category_ceo = JSON.parse(val); break;
          case 'category_cto': config.category_cto = JSON.parse(val); break;
          case 'category_coo': config.category_coo = JSON.parse(val); break;
          case 'category_marketing': config.category_marketing = JSON.parse(val); break;
          case 'category_ai': config.category_ai = JSON.parse(val); break;
          case 'category_tiebreaker': config.category_tiebreaker = val; break;
          case 'team_emails': config.team_emails = JSON.parse(val); break;
          case 'domain_allowlist': config.domain_allowlist = val; break;
          case 'schema_version': config.schema_version = parseInt(val); break;
          case 'filter_year': config.filter_year = parseInt(val); break;
        }
      } catch { /* skip invalid JSON */ }
    }
    return config;
  } catch { return DEFAULT_CONFIG; }
}

// ─── WRITE: Tracker (upsert) ─────────────────────────

export async function upsertTracker(
  tracker: TrackerRow,
  existing: TrackerRow[]
): Promise<void> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) throw new Error('No backend sheet configured');

  const rowIdx = existing.findIndex(t => t.advisorId === tracker.advisorId);
  const values = [[
    tracker.advisorId,
    tracker.status,
    tracker.assignee,
    tracker.receivedAck ? 'TRUE' : 'FALSE',
    tracker.introScheduled,
    tracker.assessmentDate,
    tracker.decisionDate,
    tracker.notes,
    tracker.lastAction,
    tracker.updatedBy,
    tracker.updatedAt,
  ]];

  if (rowIdx >= 0) {
    // Update existing row (row index + 2 for header)
    const range = `Tracker!A${rowIdx + 2}:K${rowIdx + 2}`;
    await sheetsRequest(
      rangeUrl(sheetId, range) + '?valueInputOption=USER_ENTERED',
      { method: 'PUT', body: JSON.stringify({ values }) }
    );
  } else {
    // Append new row
    await sheetsRequest(
      rangeUrl(sheetId, 'Tracker!A:K') + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
      { method: 'POST', body: JSON.stringify({ values }) }
    );
  }
}

// ─── WRITE: ActivityLog (append) ─────────────────────

export async function appendActivity(activity: Activity): Promise<void> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return;

  await sheetsRequest(
    rangeUrl(sheetId, 'ActivityLog!A:H') + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
    {
      method: 'POST',
      body: JSON.stringify({
        values: [[
          activity.timestamp,
          activity.userEmail,
          activity.advisorId,
          activity.action,
          activity.field,
          activity.oldValue,
          activity.newValue,
          activity.details,
        ]],
      }),
    }
  );
}

// ─── WRITE: FollowUps ────────────────────────────────

export async function appendFollowUp(followUp: FollowUp): Promise<void> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return;

  await sheetsRequest(
    rangeUrl(sheetId, 'FollowUps!A:J') + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
    {
      method: 'POST',
      body: JSON.stringify({
        values: [[
          followUp.id,
          followUp.advisorId,
          followUp.dueDate,
          followUp.type,
          followUp.assignee,
          followUp.status,
          followUp.notes,
          followUp.createdBy,
          followUp.createdAt,
          followUp.completedAt,
        ]],
      }),
    }
  );
}

export async function updateFollowUpStatus(
  followUpId: string,
  newStatus: 'done' | 'snoozed',
  allFollowUps: FollowUp[]
): Promise<void> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return;

  const idx = allFollowUps.findIndex(f => f.id === followUpId);
  if (idx < 0) return;

  const completedAt = newStatus === 'done' ? nowISO() : '';
  const range = `FollowUps!F${idx + 2}:J${idx + 2}`;
  await sheetsRequest(
    rangeUrl(sheetId, range) + '?valueInputOption=USER_ENTERED',
    {
      method: 'PUT',
      body: JSON.stringify({
        values: [[newStatus, allFollowUps[idx].notes, allFollowUps[idx].createdBy, allFollowUps[idx].createdAt, completedAt]],
      }),
    }
  );
}

// ─── WRITE: Comments ─────────────────────────────────

export async function appendComment(comment: Comment): Promise<void> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return;

  await sheetsRequest(
    rangeUrl(sheetId, 'Comments!A:G') + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
    {
      method: 'POST',
      body: JSON.stringify({
        values: [[
          comment.id,
          comment.advisorId,
          comment.parentId,
          comment.userEmail,
          comment.createdAt,
          comment.body,
          comment.resolved ? 'TRUE' : 'FALSE',
        ]],
      }),
    }
  );
}

// ─── WRITE: Config ───────────────────────────────────

export async function updateConfigValue(key: string, value: string): Promise<void> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return;

  // Read current config to find row
  const data = await sheetsRequest<{ values?: string[][] }>(
    rangeUrl(sheetId, 'Config!A:B')
  );
  const rows = data.values || [];
  const idx = rows.findIndex(r => r[0] === key);

  if (idx >= 0) {
    await sheetsRequest(
      rangeUrl(sheetId, `Config!B${idx + 1}`) + '?valueInputOption=USER_ENTERED',
      { method: 'PUT', body: JSON.stringify({ values: [[value]] }) }
    );
  } else {
    await sheetsRequest(
      rangeUrl(sheetId, 'Config!A:B') + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
      { method: 'POST', body: JSON.stringify({ values: [[key, value]] }) }
    );
  }
}

// ─── Convenience write helpers (used by AppShell) ────

/** Update tracker status + create row if needed */
export async function updateTrackerStatus(
  advisorId: string,
  newStatus: AdvisorStatus,
  userEmail: string
): Promise<void> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return;

  // Read current tracker to find existing row
  const existing = await fetchTracker();
  const tracker: TrackerRow = {
    ...(existing.find(t => t.advisorId === advisorId) || {
      advisorId,
      assignee: '',
      receivedAck: false,
      introScheduled: '',
      assessmentDate: '',
      decisionDate: '',
      notes: '',
    }),
    advisorId,
    status: newStatus,
    lastAction: 'status_change',
    updatedBy: userEmail,
    updatedAt: nowISO(),
  };

  await upsertTracker(tracker, existing);
}

/** Update multiple tracker fields */
export async function updateTrackerFields(
  advisorId: string,
  updates: Partial<TrackerRow>,
  userEmail: string
): Promise<void> {
  const sheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  if (!sheetId) return;

  const existing = await fetchTracker();
  const existingRow = existing.find(t => t.advisorId === advisorId) || {
    advisorId,
    status: 'new' as AdvisorStatus,
    assignee: '',
    receivedAck: false,
    introScheduled: '',
    assessmentDate: '',
    decisionDate: '',
    notes: '',
    lastAction: '',
    updatedBy: '',
    updatedAt: '',
  };

  const tracker: TrackerRow = {
    ...existingRow,
    ...updates,
    lastAction: 'tracker_update',
    updatedBy: userEmail,
    updatedAt: nowISO(),
  };

  await upsertTracker(tracker, existing);
}

/** Log an activity */
export async function logActivity(
  userEmail: string,
  advisorId: string,
  action: string,
  field: string,
  oldValue: string,
  newValue: string,
  details: string
): Promise<void> {
  await appendActivity({
    timestamp: nowISO(),
    userEmail,
    advisorId,
    action,
    field,
    oldValue,
    newValue,
    details,
  });
}

/** Add a comment */
export async function addComment(
  advisorId: string,
  id: string,
  userEmail: string,
  body: string
): Promise<void> {
  await appendComment({
    id,
    advisorId,
    parentId: '',
    userEmail,
    createdAt: nowISO(),
    body,
    resolved: false,
  });
}

/** Add a follow-up */
export async function addFollowUp(fu: FollowUp): Promise<void> {
  await appendFollowUp(fu);
}

/** Complete a follow-up */
export async function completeFollowUp(followUpId: string): Promise<void> {
  const allFollowUps = await fetchFollowUps();
  await updateFollowUpStatus(followUpId, 'done', allFollowUps);
}
