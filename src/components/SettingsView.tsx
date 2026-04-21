// ============================================
// Settings View — Config, email templates, data sync info
// ============================================

import { useState, useMemo } from 'react';
import {
  Settings, Mail, Database, Users, Shield, Save, ExternalLink,
  CheckCircle2, AlertTriangle, Eye, Edit3, Copy, Globe
} from 'lucide-react';
import type { AppConfig } from '../types';
import { Card, Badge, PageHeader, Tabs, ProgressBar } from './ui/index';
import { cn } from '../lib/utils';

// Default email template
const DEFAULT_ACK_TEMPLATE = `Dear {{name}},

Thank you for your interest in becoming an advisor for the GSG Elevate program. We have received your application and our team is currently reviewing it.

We will get back to you within one week with next steps regarding the advisor matching process.

In the meantime, if you have any questions, feel free to reply to this email.

Best regards,
GSG Elevate Team`;

const DEFAULT_FOLLOWUP_TEMPLATE = `Dear {{name}},

This is a follow-up regarding your application to the GSG Elevate Advisor program. We would love to schedule a brief introductory call to discuss how your expertise in {{category}} can best support our startups.

Would any of these times work for you?
- [Time Option 1]
- [Time Option 2]
- [Time Option 3]

Looking forward to hearing from you.

Best regards,
{{sender_name}}
GSG Elevate Team`;

interface Props {
  config: AppConfig;
  userEmail?: string;
  onSaveTemplate?: (key: string, template: string) => void;
}

export default function SettingsView({ config, userEmail, onSaveTemplate }: Props) {
  const [tab, setTab] = useState<'general' | 'email' | 'data' | 'scoring'>('general');
  const [ackTemplate, setAckTemplate] = useState(DEFAULT_ACK_TEMPLATE);
  const [followUpTemplate, setFollowUpTemplate] = useState(DEFAULT_FOLLOWUP_TEMPLATE);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('John Doe');
  const [copyFeedback, setCopyFeedback] = useState('');

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'email', label: 'Email Templates' },
    { id: 'data', label: 'Data & Sync' },
    { id: 'scoring', label: 'Scoring Config' },
  ];

  const backendSheetId = import.meta.env.VITE_BACKEND_SHEET_ID;
  const responsesSheetId = import.meta.env.VITE_RESPONSES_SHEET_ID;

  const resolveTemplate = (template: string) => {
    return template
      .replace(/\{\{name\}\}/g, previewName)
      .replace(/\{\{category\}\}/g, 'CTO')
      .replace(/\{\{sender_name\}\}/g, userEmail?.split('@')[0] || 'Team Member');
  };

  const handleCopyTemplate = (template: string, label: string) => {
    const resolved = resolveTemplate(template);
    navigator.clipboard.writeText(resolved);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  const handleUseTemplate = (template: string, email: string, name: string) => {
    const resolved = template
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{category\}\}/g, 'Advisor')
      .replace(/\{\{sender_name\}\}/g, userEmail?.split('@')[0] || 'Team');
    const subject = template === ackTemplate
      ? 'GSG Elevate — Application Received'
      : 'GSG Elevate — Follow-up';
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(resolved)}`, '_blank');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Settings}
        iconColor="bg-slate-700"
        title="Settings"
        subtitle="Manage configuration, email templates, and data connections"
      />

      <Tabs tabs={tabs} activeTab={tab} onChange={(id) => setTab(id as any)} size="md" />

      {/* General */}
      {tab === 'general' && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Application Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingRow label="Filter Year" value={String(config.filter_year || 2026)} description="Only show advisor applications from this year onward" />
              <SettingRow label="Stage 1 Threshold" value={`${config.stage1_threshold}/100`} description="Minimum score to qualify for Stage 2" />
              <SettingRow label="Stale Days" value={`${config.stale_days} days`} description="Mark advisors as stale after this many days without action" />
              <SettingRow label="Domain Allowlist" value={config.domain_allowlist} description="Only users with this email domain can access the tool" />
              <SettingRow label="Schema Version" value={`v${config.schema_version}`} description="Backend sheet schema version" />
              <SettingRow label="Category Tiebreaker" value={config.category_tiebreaker} description="How to break ties when advisor fits multiple categories equally" />
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Team Members</h3>
            <p className="text-xs text-slate-500 mb-3">
              Team members are managed in the <strong>Team</strong> tab of the backend Google Sheet.
            </p>
            {config.team_emails.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {config.team_emails.map(email => (
                  <Badge key={email} variant="primary">{email}</Badge>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400">No team emails configured in Config tab</div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Current User</h3>
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">{userEmail || 'Unknown'}</span>
              </div>
              <p className="text-xs text-indigo-600 mt-1">All actions (status changes, comments, follow-ups) are tracked under this user.</p>
            </div>
          </Card>
        </div>
      )}

      {/* Email Templates */}
      {tab === 'email' && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-indigo-600 to-indigo-700 border-0">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-white" />
              <div>
                <p className="text-white font-semibold text-sm">Email Template System</p>
                <p className="text-indigo-200 text-xs mt-0.5">
                  Customize templates with variables: <code className="bg-white/20 px-1 rounded">{'{{name}}'}</code>, <code className="bg-white/20 px-1 rounded">{'{{category}}'}</code>, <code className="bg-white/20 px-1 rounded">{'{{sender_name}}'}</code>
                </p>
              </div>
            </div>
          </Card>

          {/* Acknowledgment Template */}
          <TemplateCard
            title="Application Acknowledgment"
            description="Sent to new applicants to confirm receipt. Use the 'Send Acknowledgment' button in the advisor detail modal."
            template={ackTemplate}
            isEditing={editingTemplate === 'ack'}
            onEdit={() => setEditingTemplate(editingTemplate === 'ack' ? null : 'ack')}
            onChange={setAckTemplate}
            onCopy={() => handleCopyTemplate(ackTemplate, 'ack')}
            copyFeedback={copyFeedback === 'ack'}
            previewName={previewName}
            setPreviewName={setPreviewName}
            resolveTemplate={resolveTemplate}
          />

          {/* Follow-up Template */}
          <TemplateCard
            title="Intro Call Follow-up"
            description="Sent when scheduling introductory calls with qualified advisors."
            template={followUpTemplate}
            isEditing={editingTemplate === 'followup'}
            onEdit={() => setEditingTemplate(editingTemplate === 'followup' ? null : 'followup')}
            onChange={setFollowUpTemplate}
            onCopy={() => handleCopyTemplate(followUpTemplate, 'followup')}
            copyFeedback={copyFeedback === 'followup'}
            previewName={previewName}
            setPreviewName={setPreviewName}
            resolveTemplate={resolveTemplate}
          />

          {/* How to use */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">How Email Integration Works</h3>
            <div className="space-y-2">
              {[
                { step: '1', title: 'Open Advisor Profile', desc: 'Click any advisor card to open their detail modal' },
                { step: '2', title: 'Click "Send Acknowledgment"', desc: 'Opens your email client with the pre-filled template' },
                { step: '3', title: 'Personalize & Send', desc: 'Review, adjust as needed, and send via your email' },
                { step: '4', title: 'Tracked Automatically', desc: 'The system logs the action in the activity feed under your name' },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                    <div className="text-[10px] text-slate-500">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Data & Sync */}
      {tab === 'data' && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Data Architecture</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Responses Sheet */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Responses Sheet</span>
                  <Badge variant="info">READ ONLY</Badge>
                </div>
                <p className="text-xs text-blue-700 mb-2">Raw advisor applications from Google Forms</p>
                <div className="bg-white/70 rounded-lg p-2 text-[10px] font-mono text-blue-800 break-all">
                  {responsesSheetId || 'Not configured'}
                </div>
                {responsesSheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${responsesSheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 mt-2 text-[10px] font-medium text-blue-600 hover:text-blue-800"
                  >
                    Open in Google Sheets <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Backend Sheet */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900">Backend Sheet</span>
                  <Badge variant="success">READ/WRITE</Badge>
                </div>
                <p className="text-xs text-emerald-700 mb-2">All pipeline data, comments, follow-ups, activity</p>
                <div className="bg-white/70 rounded-lg p-2 text-[10px] font-mono text-emerald-800 break-all">
                  {backendSheetId || 'Not configured'}
                </div>
                {backendSheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${backendSheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 mt-2 text-[10px] font-medium text-emerald-600 hover:text-emerald-800"
                  >
                    Open in Google Sheets <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Backend Sheet Tabs</h3>
            <p className="text-xs text-slate-500 mb-3">All data is persisted in these tabs within the backend Google Sheet:</p>
            <div className="space-y-2">
              {[
                { tab: 'Tracker', desc: 'Pipeline status, assignee, dates for each advisor', cols: 'advisorId, status, assignee, receivedAck, introScheduled, assessmentDate, decisionDate, notes, lastAction, updatedBy, updatedAt' },
                { tab: 'FollowUps', desc: 'Scheduled follow-up tasks with due dates', cols: 'id, advisorId, dueDate, type, assignee, status, notes, createdBy, createdAt, completedAt' },
                { tab: 'ActivityLog', desc: 'Every action taken by team members', cols: 'timestamp, userEmail, advisorId, action, field, oldValue, newValue, details' },
                { tab: 'Comments', desc: 'Discussion threads per advisor', cols: 'id, advisorId, parentId, userEmail, createdAt, body, resolved' },
                { tab: 'Team', desc: 'Authorized team members', cols: 'email, name, role, active' },
                { tab: 'Config', desc: 'Key-value settings', cols: 'key, value' },
              ].map(item => (
                <div key={item.tab} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-slate-900">{item.tab}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{item.desc}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">{item.cols}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Sync Status</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-slate-700">Auto-refresh every 30 seconds</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-slate-700">All status changes write immediately to Google Sheets</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-slate-700">Comments, follow-ups, and activities persist in real-time</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-slate-700">Multiple team members see the same data within 30 seconds</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Scoring Config */}
      {tab === 'scoring' && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Stage 1 Weights</h3>
            <p className="text-xs text-slate-500 mb-3">Must sum to 100. Edit in the Config tab of the backend sheet.</p>
            <div className="space-y-2">
              {Object.entries(config.stage1_weights).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-28 capitalize">{key.replace(/_/g, ' ')}</span>
                  <div className="flex-1"><ProgressBar value={val} color="indigo" size="sm" /></div>
                  <span className="text-xs font-semibold text-slate-700 w-8 text-right">{val}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Category Configurations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {([
                { key: 'CEO', config: config.category_ceo, color: 'amber' },
                { key: 'CTO', config: config.category_cto, color: 'blue' },
                { key: 'COO', config: config.category_coo, color: 'emerald' },
                { key: 'Marketing', config: config.category_marketing, color: 'pink' },
                { key: 'AI', config: config.category_ai, color: 'purple' },
              ] as const).map(cat => (
                <div key={cat.key} className={`bg-${cat.color}-50 rounded-xl p-3 border border-${cat.color}-100`}>
                  <div className="text-sm font-semibold text-slate-900 mb-2">{cat.key}</div>
                  <div className="text-[10px] text-slate-500 mb-1">Keywords ({cat.config.keywords.length})</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {cat.config.keywords.slice(0, 6).map(kw => (
                      <span key={kw} className="px-1.5 py-0.5 bg-white/70 rounded text-[9px] text-slate-600">{kw}</span>
                    ))}
                    {cat.config.keywords.length > 6 && (
                      <span className="px-1.5 py-0.5 text-[9px] text-slate-400">+{cat.config.keywords.length - 6} more</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Title boost: {cat.config.titleBoost} · Tech bias: {cat.config.techRatingBias || 'none'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Seniority Tiers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {config.seniority_tiers.map(tier => (
                <div key={tier.keyword} className="bg-slate-50 rounded-lg p-2 border border-slate-100 text-center">
                  <div className="text-xs font-medium text-slate-900 capitalize">{tier.keyword}</div>
                  <div className="text-[10px] text-slate-500">{(tier.score * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Setting Row ─────────────────────────────

function SettingRow({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{value}</span>
      </div>
      <p className="text-[10px] text-slate-400">{description}</p>
    </div>
  );
}

// ─── Template Card ───────────────────────────

function TemplateCard({ title, description, template, isEditing, onEdit, onChange, onCopy, copyFeedback, previewName, setPreviewName, resolveTemplate }: {
  title: string; description: string; template: string; isEditing: boolean;
  onEdit: () => void; onChange: (v: string) => void; onCopy: () => void;
  copyFeedback: boolean; previewName: string; setPreviewName: (v: string) => void;
  resolveTemplate: (t: string) => string;
}) {
  return (
    <Card padding="none">
      <div className="px-5 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onCopy} className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors',
              copyFeedback ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}>
              {copyFeedback ? <><CheckCircle2 className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
            <button onClick={onEdit} className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors',
              isEditing ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}>
              {isEditing ? <><Eye className="w-3 h-3" /> Preview</> : <><Edit3 className="w-3 h-3" /> Edit</>}
            </button>
          </div>
        </div>
      </div>
      <div className="p-5">
        {isEditing ? (
          <textarea
            value={template}
            onChange={e => onChange(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y"
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-slate-400">Preview for:</span>
              <input
                type="text"
                value={previewName}
                onChange={e => setPreviewName(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {resolveTemplate(template)}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
