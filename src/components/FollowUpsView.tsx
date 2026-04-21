// ============================================
// Follow-Ups View — Manage advisor follow-up tasks
// ============================================

import { useState, useMemo } from 'react';
import {
  Calendar, Clock, CheckCircle2, AlertTriangle, Plus,
  Filter, User, Mail, Phone, Video
} from 'lucide-react';
import type { FollowUp, EnrichedAdvisor } from '../types';
import { Card, Badge, PageHeader, Tabs, EmptyState, Avatar } from './ui/index';
import { cn, todayISO } from '../lib/utils';

const FOLLOW_UP_TYPES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'meeting', label: 'Meeting', icon: Video },
  { value: 'other', label: 'Other', icon: Calendar },
];

interface Props {
  followUps: FollowUp[];
  advisors: EnrichedAdvisor[];
  onCreateFollowUp: (fu: Partial<FollowUp>) => void;
  onCompleteFollowUp: (id: string) => void;
  onViewAdvisor: (id: string) => void;
  userEmail?: string;
}

export default function FollowUpsView({ followUps, advisors, onCreateFollowUp, onCompleteFollowUp, onViewAdvisor, userEmail }: Props) {
  const [tab, setTab] = useState<'overdue' | 'today' | 'upcoming' | 'done'>('overdue');
  const [showCreate, setShowCreate] = useState(false);
  const [newFu, setNewFu] = useState({ advisorId: '', type: 'email', dueDate: '', notes: '' });

  const today = todayISO();

  const groups = useMemo(() => {
    const overdue: FollowUp[] = [];
    const todayList: FollowUp[] = [];
    const upcoming: FollowUp[] = [];
    const done: FollowUp[] = [];

    followUps.forEach(fu => {
      if (fu.status === 'done') { done.push(fu); return; }
      if (fu.dueDate < today) overdue.push(fu);
      else if (fu.dueDate === today) todayList.push(fu);
      else upcoming.push(fu);
    });

    return { overdue, today: todayList, upcoming, done };
  }, [followUps, today]);

  const tabs = [
    { id: 'overdue', label: 'Overdue', count: groups.overdue.length },
    { id: 'today', label: 'Due Today', count: groups.today.length },
    { id: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
    { id: 'done', label: 'Completed', count: groups.done.length },
  ];

  const activeList =
    tab === 'overdue' ? groups.overdue :
    tab === 'today' ? groups.today :
    tab === 'upcoming' ? groups.upcoming :
    groups.done;

  const getAdvisorName = (id: string) => advisors.find(a => a.id === id)?.name || 'Unknown';

  const handleCreate = () => {
    if (!newFu.advisorId || !newFu.dueDate) return;
    onCreateFollowUp({
      advisorId: newFu.advisorId,
      type: newFu.type,
      dueDate: newFu.dueDate,
      notes: newFu.notes,
      assignee: userEmail || '',
      status: 'open',
      createdBy: userEmail || '',
      createdAt: new Date().toISOString(),
    });
    setNewFu({ advisorId: '', type: 'email', dueDate: '', notes: '' });
    setShowCreate(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Calendar}
        iconColor="bg-amber-600"
        title="Follow-Ups"
        subtitle={`${groups.overdue.length} overdue · ${groups.today.length} due today · ${groups.upcoming.length} upcoming`}
        actions={
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Follow-Up
          </button>
        }
      />

      {/* Overdue alert */}
      {groups.overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-red-800">
              {groups.overdue.length} overdue follow-up{groups.overdue.length > 1 ? 's' : ''}
            </div>
            <div className="text-xs text-red-600">These tasks need immediate attention</div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <Card className="animate-slide-up">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Create Follow-Up</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Advisor</label>
              <select
                value={newFu.advisorId}
                onChange={e => setNewFu({ ...newFu, advisorId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">Select advisor...</option>
                {advisors.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={newFu.type}
                onChange={e => setNewFu({ ...newFu, type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {FOLLOW_UP_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
              <input
                type="date"
                value={newFu.dueDate}
                onChange={e => setNewFu({ ...newFu, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <input
                type="text"
                value={newFu.notes}
                onChange={e => setNewFu({ ...newFu, notes: e.target.value })}
                placeholder="Quick note..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!newFu.advisorId || !newFu.dueDate}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Create
            </button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={tab} onChange={(id) => setTab(id as any)} size="md" />

      {/* List */}
      {activeList.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-6 h-6" />}
          title={tab === 'done' ? 'No completed follow-ups' : 'All clear!'}
          description={tab === 'done' ? 'Completed follow-ups will appear here.' : 'No follow-ups in this category.'}
        />
      ) : (
        <div className="space-y-2 stagger-children">
          {activeList.map(fu => {
            const TypeIcon = FOLLOW_UP_TYPES.find(t => t.value === fu.type)?.icon || Calendar;
            const isOverdue = fu.status !== 'done' && fu.dueDate < today;
            return (
              <Card key={fu.id} hover padding="sm">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-xl',
                    isOverdue ? 'bg-red-50' : fu.status === 'done' ? 'bg-emerald-50' : 'bg-indigo-50'
                  )}>
                    <TypeIcon className={cn(
                      'w-4 h-4',
                      isOverdue ? 'text-red-500' : fu.status === 'done' ? 'text-emerald-500' : 'text-indigo-500'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer truncate"
                        onClick={() => onViewAdvisor(fu.advisorId)}
                      >
                        {getAdvisorName(fu.advisorId)}
                      </span>
                      <Badge variant={isOverdue ? 'danger' : fu.status === 'done' ? 'success' : 'info'}>
                        {fu.type}
                      </Badge>
                    </div>
                    {fu.notes && <div className="text-xs text-slate-500 mt-0.5 truncate">{fu.notes}</div>}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {fu.dueDate}</span>
                      {fu.assignee && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {fu.assignee}</span>}
                    </div>
                  </div>
                  {fu.status !== 'done' && (
                    <button
                      onClick={() => onCompleteFollowUp(fu.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-semibold hover:bg-emerald-100 transition-colors flex-shrink-0"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
