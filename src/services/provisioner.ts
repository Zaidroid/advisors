// ============================================
// Backend Sheet Auto-Provisioner
// Creates missing tabs with headers on first run
// ============================================

import { DEFAULT_CONFIG } from '../config/scoring';
import { AUTHORIZED_USERS } from '../config/team';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCHEMA_VERSION = 1;

interface SheetMeta {
  properties: { title: string; sheetId: number };
}

const TAB_SCHEMAS: Record<string, string[]> = {
  Config: ['key', 'value'],
  Tracker: ['advisorId', 'status', 'assignee', 'receivedAck', 'introScheduled', 'assessmentDate', 'decisionDate', 'notes', 'lastAction', 'updatedBy', 'updatedAt'],
  FollowUps: ['id', 'advisorId', 'dueDate', 'type', 'assignee', 'status', 'notes', 'createdBy', 'createdAt', 'completedAt'],
  ActivityLog: ['timestamp', 'userEmail', 'advisorId', 'action', 'field', 'oldValue', 'newValue', 'details'],
  Comments: ['id', 'advisorId', 'parentId', 'userEmail', 'createdAt', 'body', 'resolved'],
  Team: ['email', 'name', 'role', 'active'],
};

function getToken(): string {
  return localStorage.getItem('google_access_token') || '';
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Provisioner ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Ensure the backend sheet has all required tabs with correct headers.
 * Creates missing tabs, seeds defaults. Never destructive.
 */
export async function ensureBackendSchema(sheetId: string): Promise<void> {
  if (!sheetId || !getToken()) return;

  console.log('🔧 Checking backend schema...');

  // 1. Fetch existing sheet metadata
  const meta = await apiRequest<{ sheets: SheetMeta[] }>(
    `${SHEETS_API}/${sheetId}?fields=sheets.properties`
  );
  const existingTabs = new Set(meta.sheets.map(s => s.properties.title));

  // 2. Create missing tabs
  const missingTabs = Object.keys(TAB_SCHEMAS).filter(t => !existingTabs.has(t));

  if (missingTabs.length > 0) {
    console.log('📋 Creating tabs:', missingTabs.join(', '));
    const requests = missingTabs.map(title => ({
      addSheet: { properties: { title } },
    }));

    await apiRequest(`${SHEETS_API}/${sheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    // 3. Write header rows for new tabs
    for (const tab of missingTabs) {
      const headers = TAB_SCHEMAS[tab];
      await apiRequest(
        `${SHEETS_API}/${sheetId}/values/'${tab}'!A1:${colLetter(headers.length)}1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({ values: [headers] }),
        }
      );
    }
  }

  // 4. Seed Config defaults if Config tab is newly created
  if (missingTabs.includes('Config')) {
    console.log('🌱 Seeding Config defaults...');
    const configRows = [
      ['responsesSheetId', import.meta.env.VITE_RESPONSES_SHEET_ID || ''],
      ['responsesTabName', DEFAULT_CONFIG.responsesTabName],
      ['stale_days', String(DEFAULT_CONFIG.stale_days)],
      ['stage1_threshold', String(DEFAULT_CONFIG.stage1_threshold)],
      ['stage1_weights', JSON.stringify(DEFAULT_CONFIG.stage1_weights)],
      ['years_multipliers', JSON.stringify(DEFAULT_CONFIG.years_multipliers)],
      ['seniority_tiers', JSON.stringify(DEFAULT_CONFIG.seniority_tiers)],
      ['category_ceo', JSON.stringify(DEFAULT_CONFIG.category_ceo)],
      ['category_cto', JSON.stringify(DEFAULT_CONFIG.category_cto)],
      ['category_coo', JSON.stringify(DEFAULT_CONFIG.category_coo)],
      ['category_tiebreaker', DEFAULT_CONFIG.category_tiebreaker],
      ['team_emails', JSON.stringify(AUTHORIZED_USERS.map(u => u.email))],
      ['domain_allowlist', DEFAULT_CONFIG.domain_allowlist],
      ['schema_version', String(SCHEMA_VERSION)],
    ];

    await apiRequest(
      `${SHEETS_API}/${sheetId}/values/'Config'!A2:B${configRows.length + 1}?valueInputOption=USER_ENTERED`,
      { method: 'PUT', body: JSON.stringify({ values: configRows }) }
    );
  }

  // 5. Seed Team if newly created
  if (missingTabs.includes('Team')) {
    console.log('🌱 Seeding Team roster...');
    const teamRows = AUTHORIZED_USERS.map(u => [u.email, u.name, u.role, 'TRUE']);
    await apiRequest(
      `${SHEETS_API}/${sheetId}/values/'Team'!A2:D${teamRows.length + 1}?valueInputOption=USER_ENTERED`,
      { method: 'PUT', body: JSON.stringify({ values: teamRows }) }
    );
  }

  // 6. Format header rows (bold + gray background)
  try {
    const freshMeta = await apiRequest<{ sheets: SheetMeta[] }>(
      `${SHEETS_API}/${sheetId}?fields=sheets.properties`
    );
    const formatRequests = freshMeta.sheets
      .filter(s => Object.keys(TAB_SCHEMAS).includes(s.properties.title))
      .map(s => ({
        repeatCell: {
          range: {
            sheetId: s.properties.sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              textFormat: { bold: true },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      }));

    if (formatRequests.length > 0) {
      await apiRequest(`${SHEETS_API}/${sheetId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests: formatRequests }),
      });
    }
  } catch (e) {
    console.warn('Header formatting failed (non-critical):', e);
  }

  console.log('✅ Backend schema ready');
}

function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}
