// ============================================
// Detail Modal — Full advisor profile + score breakdown + tracker
// ============================================

import { useState, useCallback } from 'react';
import {
  User, Mail, Phone, Globe, Linkedin, Briefcase, MapPin, Clock,
  Award, Target, Star, ChevronDown, Send, MessageCircle, Calendar,
  CheckCircle2, XCircle, ExternalLink, Brain, Megaphone
} from 'lucide-react';
import type { EnrichedAdvisor, AdvisorStatus, CategoryKey } from '../types';
import { Modal, Card, Badge, ScoreRing, ProgressBar, Avatar } from './ui/index';
import { CATEGORY_META } from '../config/scoring';
import { STATUS_META } from './PipelineView';
import { cn, fmtDate } from '../lib/utils';

interface Props {
  advisor: EnrichedAdvisor | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (advisorId: string, newStatus: AdvisorStatus) => void;
  onAddComment?: (advisorId: string, text: string) => void;
  onAckSent?: (advisorId: string) => void;
  onCategoryOverride?: (advisorId: string, newCategory: CategoryKey, justification: string) => void;
  onTrackerUpdate?: (advisorId: string, updates: Partial<import('../types').TrackerRow>) => void;
  teamEmails?: string[];
  userEmail?: string;
}

export default function DetailModal({ advisor: adv, open, onClose, onStatusChange, onAddComment, onAckSent, onCategoryOverride, onTrackerUpdate, teamEmails = [], userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'scores' | 'tracker' | 'comments'>('profile');
  const [commentText, setCommentText] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  if (!adv) return null;

  const status = adv.tracker?.status || 'new';
  const statusMeta = STATUS_META[status];
  const catMeta = CATEGORY_META[adv.stage2.primary] || CATEGORY_META.CEO;

  const handleSendComment = () => {
    if (commentText.trim() && onAddComment) {
      onAddComment(adv.id, commentText.trim());
      setCommentText('');
    }
  };

  const handleAckEmail = () => {
    const subject = encodeURIComponent('GSG Elevate Advisor Application — Received');
    const body = encodeURIComponent(
      `Dear ${adv.name},\n\nThank you for your interest in becoming an advisor for GSG Elevate. We have received your application and our team is currently reviewing it.\n\nWe will get back to you within one week with next steps.\n\nBest regards,\nGSG Elevate Team`
    );
    window.open(`mailto:${adv.email}?subject=${subject}&body=${body}`, '_blank');
    onAckSent?.(adv.id);
  };

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'scores', label: 'Score Breakdown' },
    { id: 'tracker', label: 'Pipeline' },
    { id: 'comments', label: `Comments (${adv.comments?.length || 0})` },
  ];

  return (
    <Modal open={open} onClose={onClose} size="xl" title={adv.name}>
      {/* Header info */}
      <div className="flex items-start gap-4 mb-5">
        <Avatar name={adv.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={catMeta.color.includes('amber') ? 'warning' : catMeta.color.includes('blue') ? 'info' : catMeta.color.includes('emerald') ? 'success' : catMeta.color.includes('pink') ? 'pink' : 'purple'}>
              {catMeta.label}
            </Badge>
            <Badge variant={statusMeta.variant as any} dot>{statusMeta.label}</Badge>
            {adv.stage1.pass ? (
              <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-0.5" />Qualified</Badge>
            ) : (
              <Badge variant="danger"><XCircle className="w-3 h-3 mr-0.5" />Below Threshold</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
            {adv.position && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{adv.position}</span>}
            {adv.employer && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{adv.employer}</span>}
            {adv.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{adv.country}</span>}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(adv.timestamp)}</span>
          </div>
        </div>
        <ScoreRing value={adv.stage1.total} size={56} stroke={4} />
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Status change */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            Change Status <ChevronDown className="w-3 h-3" />
          </button>
          {showStatusMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px] animate-scale-in">
              {(Object.entries(STATUS_META) as [AdvisorStatus, typeof statusMeta][]).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => { onStatusChange(adv.id, key); setShowStatusMenu(false); }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors',
                    key === status ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-slate-700'
                  )}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleAckEmail}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Mail className="w-3.5 h-3.5" /> Send Acknowledgment
        </button>

        {adv.email && (
          <a
            href={`mailto:${adv.email}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> Email
          </a>
        )}

        {adv.linkedin && adv.linkedin.includes('linkedin') && (
          <a
            href={adv.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Linkedin className="w-3.5 h-3.5" /> LinkedIn
          </a>
        )}

        {adv.whatsapp && (
          <a
            href={`https://wa.me/${adv.whatsapp.replace(/[^\d+]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" /> WhatsApp
          </a>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex bg-slate-100 p-1 rounded-lg mb-5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1',
              activeTab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && <ProfileTab advisor={adv} />}
      {activeTab === 'scores' && <ScoresTab advisor={adv} onCategoryOverride={onCategoryOverride} />}
      {activeTab === 'tracker' && <TrackerTab advisor={adv} onTrackerUpdate={onTrackerUpdate} teamEmails={teamEmails} />}
      {activeTab === 'comments' && (
        <CommentsTab
          advisor={adv}
          commentText={commentText}
          setCommentText={setCommentText}
          onSend={handleSendComment}
          userEmail={userEmail}
        />
      )}
    </Modal>
  );
}

// ─── Profile Tab ─────────────────────────────

function ProfileTab({ advisor: adv }: { advisor: EnrichedAdvisor }) {
  const fields = [
    { label: 'Full Name', value: adv.name, icon: User },
    { label: 'Email', value: adv.email, icon: Mail, link: `mailto:${adv.email}` },
    { label: 'WhatsApp', value: adv.whatsapp, icon: Phone },
    { label: 'Gender', value: adv.gender, icon: User },
    { label: 'Country', value: adv.country, icon: MapPin },
    { label: 'LinkedIn', value: adv.linkedin, icon: Linkedin, link: adv.linkedin?.includes('http') ? adv.linkedin : undefined },
    { label: 'Position', value: adv.position, icon: Briefcase },
    { label: 'Employer', value: adv.employer, icon: Globe },
    { label: 'Years of Experience', value: adv.years, icon: Clock },
    { label: 'Tech Rating', value: adv.techRating ? `${adv.techRating}/5` : 'N/A', icon: Target },
    { label: 'Ecosystem Rating', value: adv.ecoRating ? `${adv.ecoRating}/5` : 'N/A', icon: Globe },
    { label: 'C-Level Experience', value: adv.cLevel, icon: Award },
    { label: 'Paid/Volunteer', value: adv.paidOrVol, icon: Star },
    { label: 'Hourly Rate', value: adv.hourlyRate || 'N/A', icon: Target },
    { label: 'Past GSG Work', value: adv.gsgPast, icon: CheckCircle2 },
    { label: 'Newsletter', value: adv.newsletter, icon: Mail },
  ];

  const textFields = [
    { label: 'Experience Areas', value: adv.expAreas },
    { label: 'Experience Details', value: adv.expDetail },
    { label: 'C-Level Details', value: adv.cLevelDetail },
    { label: 'Non-Technical Subjects', value: adv.nonTechSubjects },
    { label: 'Support In', value: adv.supportIn },
    { label: 'Support Via', value: adv.supportVia },
    { label: 'Tech Specializations', value: adv.techSpecs },
    { label: 'Opportunities', value: adv.opportunities },
    { label: 'Notes', value: adv.notes },
    { label: 'CV Link', value: adv.cvLink },
  ];

  return (
    <div className="space-y-4">
      {/* Key info grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {fields.map(f => (
          f.value ? (
            <div key={f.label} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                <f.icon className="w-3 h-3" />
                {f.label}
              </div>
              {f.link ? (
                <a href={f.link} target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 truncate">
                  {f.value} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ) : (
                <div className="text-xs font-medium text-slate-800 truncate">{f.value}</div>
              )}
            </div>
          ) : null
        ))}
      </div>

      {/* Long text fields */}
      {textFields.filter(f => f.value && f.value.trim().length > 0).map(f => (
        <div key={f.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{f.label}</div>
          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{f.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Scores Tab ──────────────────────────────

function ScoresTab({ advisor: adv, onCategoryOverride }: { advisor: EnrichedAdvisor; onCategoryOverride?: (advisorId: string, newCategory: CategoryKey, justification: string) => void }) {
  const stage1Parts = [
    { key: 'tech_rating', label: 'Tech Rating', max: 15 },
    { key: 'eco_rating', label: 'Ecosystem Rating', max: 10 },
    { key: 'clevel', label: 'C-Level Experience', max: 20 },
    { key: 'years', label: 'Years of Experience', max: 15 },
    { key: 'experience', label: 'Experience Areas', max: 15 },
    { key: 'seniority', label: 'Seniority Level', max: 10 },
    { key: 'linkedin', label: 'LinkedIn Profile', max: 10 },
    { key: 'cv', label: 'CV Provided', max: 5 },
  ] as const;

  const categories: { key: string; field: keyof typeof adv.stage2; label: string; color: string }[] = [
    { key: 'CEO', field: 'ceo', label: 'CEO', color: '#f59e0b' },
    { key: 'CTO', field: 'cto', label: 'CTO', color: '#3b82f6' },
    { key: 'COO', field: 'coo', label: 'COO', color: '#10b981' },
    { key: 'Marketing', field: 'marketing', label: 'Marketing', color: '#ec4899' },
    { key: 'AI', field: 'ai', label: 'AI Specialist', color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-5">
      {/* Stage 1 */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Stage 1 — Qualification</h3>
            <p className="text-xs text-slate-500">Weighted score based on experience signals</p>
          </div>
          <ScoreRing value={adv.stage1.total} size={52} stroke={4} />
        </div>
        <div className="space-y-2">
          {stage1Parts.map(p => {
            const val = adv.stage1.parts[p.key];
            const pct = p.max > 0 ? (val / p.max) * 100 : 0;
            return (
              <div key={p.key} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-32 flex-shrink-0">{p.label}</span>
                <div className="flex-1">
                  <ProgressBar value={pct} color={pct >= 70 ? 'emerald' : pct >= 40 ? 'amber' : 'red'} size="sm" />
                </div>
                <span className="text-xs font-semibold text-slate-700 tabular-nums w-12 text-right">
                  {val}/{p.max}
                </span>
              </div>
            );
          })}
        </div>
        <div className={cn(
          'mt-3 px-3 py-2 rounded-lg text-xs font-semibold text-center',
          adv.stage1.pass ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
        )}>
          {adv.stage1.pass
            ? `✓ Passed — Score: ${adv.stage1.total}/100 (threshold: 50)`
            : `✗ Below threshold — Score: ${adv.stage1.total}/100 (need ≥ 50)`}
        </div>
      </Card>

      {/* Stage 2 */}
      <Card padding="sm">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Stage 2 — Category Fit</h3>
          <p className="text-xs text-slate-500">Best match across all 5 advisor categories</p>
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap py-3">
          {categories.map(cat => (
            <div key={cat.key} className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors',
              adv.stage2.primary === cat.key
                ? 'border-indigo-300 bg-indigo-50/50'
                : 'border-transparent'
            )}>
              <ScoreRing
                value={adv.stage2[cat.field] as number}
                size={48}
                stroke={3.5}
                color={cat.color}
              />
              <span className={cn(
                'text-[10px] font-bold',
                adv.stage2.primary === cat.key ? 'text-indigo-700' : 'text-slate-500'
              )}>
                {cat.label}
              </span>
              {adv.stage2.primary === cat.key && (
                <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">PRIMARY</span>
              )}
            </div>
          ))}
        </div>

        {/* Category scoring breakdown */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-700 mb-2">Category Score Factors</h4>
          <div className="grid grid-cols-1 gap-2">
            {categories.map(cat => {
              const score = adv.stage2[cat.field] as number;
              return (
                <div key={cat.key} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-20 flex-shrink-0">{cat.label}</span>
                  <div className="flex-1"><ProgressBar value={score} color={score >= 60 ? 'emerald' : score >= 30 ? 'amber' : 'red'} size="sm" /></div>
                  <span className="text-[10px] font-bold text-slate-700 w-8 text-right">{score}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Scores are calculated from keyword matching in experience areas, position titles, tech specializations, and background details.
          </p>
        </div>
      </Card>

      {/* Manual Category Override */}
      <CategoryOverride 
        advisorId={adv.id} 
        currentCategory={adv.stage2.primary as CategoryKey} 
        onOverride={onCategoryOverride} 
      />
    </div>
  );
}

// ─── Tracker Tab ─────────────────────────────

function TrackerTab({ advisor: adv, onTrackerUpdate, teamEmails }: { advisor: EnrichedAdvisor; onTrackerUpdate?: Props['onTrackerUpdate']; teamEmails: string[] }) {
  const tr = adv.tracker;
  const activities = adv.activities || [];

  const handleEdit = (field: string, value: any) => {
    if (onTrackerUpdate) {
      onTrackerUpdate(adv.id, { [field]: value });
    }
  };

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Pipeline Status</h3>
        <div className="grid grid-cols-2 gap-3">
          <InfoBlock label="Status" value={STATUS_META[tr?.status || 'new'].label} />
          
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Assignee</div>
            <select
              value={tr?.assignee || ''}
              onChange={e => handleEdit('assignee', e.target.value)}
              className="w-full text-xs py-1 px-2 bg-white border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Unassigned</option>
              {teamEmails.map(email => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Ack Sent</div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
              <input 
                type="checkbox" 
                checked={!!tr?.receivedAck}
                onChange={e => handleEdit('receivedAck', e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              {tr?.receivedAck ? 'Yes' : 'No'}
            </label>
          </div>

          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Intro Scheduled</div>
            <input 
              type="date"
              value={tr?.introScheduled || ''}
              onChange={e => handleEdit('introScheduled', e.target.value)}
              className="w-full text-xs py-1 px-2 bg-white border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Assessment Date</div>
            <input 
              type="date"
              value={tr?.assessmentDate || ''}
              onChange={e => handleEdit('assessmentDate', e.target.value)}
              className="w-full text-xs py-1 px-2 bg-white border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Decision Date</div>
            <input 
              type="date"
              value={tr?.decisionDate || ''}
              onChange={e => handleEdit('decisionDate', e.target.value)}
              className="w-full text-xs py-1 px-2 bg-white border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <InfoBlock label="Last Updated" value={tr?.updatedAt ? new Date(tr.updatedAt).toLocaleString() : 'N/A'} />
          <InfoBlock label="Updated By" value={tr?.updatedBy || 'N/A'} />
        </div>
        
        <div className="mt-3 bg-amber-50 rounded-lg p-2.5 border border-amber-100">
          <div className="text-[10px] font-semibold text-amber-600 mb-1">INTERNAL NOTES</div>
          <textarea
            value={tr?.notes || ''}
            onChange={e => handleEdit('notes', e.target.value)}
            placeholder="Add internal tracker notes..."
            rows={2}
            className="w-full text-xs py-1.5 px-2 bg-white/50 border border-amber-200 rounded text-amber-900 focus:ring-1 focus:ring-amber-500 placeholder:text-amber-300"
          />
        </div>
      </Card>

      {/* Activity History */}
      <Card padding="sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Activity History</h3>
        {activities.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-4">No activity recorded yet</div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {activities.slice(0, 20).map((act, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-slate-900 font-medium">{act.action}</span>
                  {act.field && <span className="text-slate-500"> · {act.field}: {act.oldValue} → {act.newValue}</span>}
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {act.userEmail} · {act.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Follow-ups */}
      {adv.followUps && adv.followUps.length > 0 && (
        <Card padding="sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Follow-ups</h3>
          <div className="space-y-2">
            {adv.followUps.map(fu => (
              <div key={fu.id} className={cn(
                'flex items-center gap-3 p-2 rounded-lg border',
                fu.status === 'done' ? 'bg-emerald-50 border-emerald-100' :
                new Date(fu.dueDate) < new Date() ? 'bg-red-50 border-red-100' :
                'bg-slate-50 border-slate-100'
              )}>
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-900">{fu.type} — {fu.notes}</div>
                  <div className="text-[10px] text-slate-500">Due: {fu.dueDate} · {fu.assignee}</div>
                </div>
                <Badge variant={fu.status === 'done' ? 'success' : 'warning'}>{fu.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="text-xs font-medium text-slate-800 mt-0.5">{value}</div>
    </div>
  );
}

// ─── Comments Tab ────────────────────────────

function CommentsTab({ advisor: adv, commentText, setCommentText, onSend, userEmail }: {
  advisor: EnrichedAdvisor; commentText: string; setCommentText: (v: string) => void; onSend: () => void; userEmail?: string;
}) {
  const comments = adv.comments || [];

  return (
    <div className="space-y-4">
      {/* New comment */}
      <div className="flex items-start gap-3">
        <Avatar name={userEmail || 'User'} size="sm" />
        <div className="flex-1">
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={onSend}
              disabled={!commentText.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Send className="w-3 h-3" /> Post Comment
            </button>
          </div>
        </div>
      </div>

      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">
          <MessageCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
          No comments yet. Be the first to add one!
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-3">
              <Avatar name={c.userEmail} size="sm" />
              <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">{c.userEmail}</span>
                  <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                </div>
                <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component: Category Override ─────────────────────────────

function CategoryOverride({ 
  advisorId, 
  currentCategory, 
  onOverride 
}: { 
  advisorId: string; 
  currentCategory: CategoryKey; 
  onOverride?: (advisorId: string, newCategory: CategoryKey, justification: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>(currentCategory);
  const [justification, setJustification] = useState('');

  if (!onOverride) return null;

  const categories = Object.entries(CATEGORY_META).map(([key, meta]) => ({
    key: key as CategoryKey,
    label: meta.label,
  }));

  const handleSave = () => {
    if (selectedCategory !== currentCategory && justification.trim()) {
      onOverride(advisorId, selectedCategory, justification.trim());
      setIsOpen(false);
      setJustification('');
    }
  };

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Manual Category Override</h3>
          <p className="text-xs text-slate-500">Override the system-assigned primary category</p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
        >
          {isOpen ? 'Cancel' : 'Edit Override'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">New Category</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as CategoryKey)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
            >
              {categories.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Justification (Required)</label>
            <input
              type="text"
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="Why are you overriding the system score?"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
            />
          </div>
          <div className="flex justify-end pt-2">
             <button
                onClick={handleSave}
                disabled={selectedCategory === currentCategory || !justification.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
               Save Override
             </button>
          </div>
        </div>
      )}
    </Card>
  );
}
