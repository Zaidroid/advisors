// ============================================
// Pipeline View — Grid of advisor cards + Kanban toggle
// ============================================

import { useState, useMemo } from 'react';
import {
  Search, Filter, LayoutGrid, Columns3, Users, ChevronDown,
  Mail, MapPin, Briefcase, Clock
} from 'lucide-react';
import type { EnrichedAdvisor, AdvisorStatus, CategoryKey } from '../types';
import { Card, Badge, ScoreRing, Avatar, Tabs, PageHeader, EmptyState } from './ui/index';
import { CATEGORY_META } from '../config/scoring';
import { cn } from '../lib/utils';
import { fmtDate } from '../lib/utils';
import KanbanBoard from './KanbanBoard';

// ─── Status config ───────────────────────────

export const STATUS_META: Record<AdvisorStatus, { label: string; variant: string; order: number }> = {
  new:          { label: 'New',            variant: 'default',  order: 0 },
  acknowledged: { label: 'Acknowledged',   variant: 'info',     order: 1 },
  allocated:    { label: 'Allocated',      variant: 'primary',  order: 2 },
  intro_sched:  { label: 'Intro Scheduled', variant: 'warning', order: 3 },
  intro_done:   { label: 'Intro Done',     variant: 'success',  order: 4 },
  assessment:   { label: 'Assessment',     variant: 'purple',   order: 5 },
  approved:     { label: 'Approved',       variant: 'success',  order: 6 },
  rejected:     { label: 'Rejected',       variant: 'danger',   order: 7 },
  matched:      { label: 'Matched',        variant: 'primary',  order: 8 },
  on_hold:      { label: 'On Hold',        variant: 'warning',  order: 9 },
};

interface Props {
  advisors: EnrichedAdvisor[];
  onViewAdvisor: (id: string) => void;
  onStatusChange: (advisorId: string, newStatus: AdvisorStatus) => void;
}

export default function PipelineView({ advisors, onViewAdvisor, onStatusChange }: Props) {
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'name'>('score');

  // Filter & sort
  const filtered = useMemo(() => {
    let list = advisors;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.position.toLowerCase().includes(q) ||
        a.employer.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      list = list.filter(a => a.stage2.primary === filterCategory);
    }

    // Status filter
    if (filterStatus !== 'all') {
      list = list.filter(a => (a.tracker?.status || 'new') === filterStatus);
    }

    // Sort
    if (sortBy === 'score') list = [...list].sort((a, b) => b.stage1.total - a.stage1.total);
    else if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'date') list = [...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return list;
  }, [advisors, search, filterCategory, filterStatus, sortBy]);

  const viewTabs = [
    { id: 'grid', label: 'Grid' },
    { id: 'kanban', label: 'Kanban' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        iconColor="bg-indigo-600"
        title="Advisor Pipeline"
        subtitle={`${filtered.length} of ${advisors.length} advisors`}
        actions={
          <Tabs tabs={viewTabs} activeTab={viewMode} onChange={(id) => setViewMode(id as any)} />
        }
      />

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, position, country..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-colors"
            />
          </div>

          {/* Category */}
          <div className="relative">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Status */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="score">Sort by Score</option>
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No advisors match your filters"
          description="Try adjusting the search or filter criteria."
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {filtered.map(adv => (
            <AdvisorCard key={adv.id} advisor={adv} onClick={() => onViewAdvisor(adv.id)} />
          ))}
        </div>
      ) : (
        <KanbanBoard
          advisors={filtered}
          onViewAdvisor={onViewAdvisor}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
}

// ─── Advisor Card ────────────────────────────

function AdvisorCard({ advisor: adv, onClick }: { advisor: EnrichedAdvisor; onClick: () => void }) {
  const catMeta = CATEGORY_META[adv.stage2.primary] || CATEGORY_META.CEO;
  const status = adv.tracker?.status || 'new';
  const statusMeta = STATUS_META[status];

  return (
    <Card hover className="group" onClick={onClick} padding="sm">
      <div className="flex items-start gap-3 p-1">
        {/* Avatar */}
        <Avatar name={adv.name} size="md" />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{adv.name}</h3>
            <ScoreRing value={adv.stage1.total} size={38} stroke={3} />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <Briefcase className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{adv.position || 'N/A'}{adv.employer ? ` · ${adv.employer}` : ''}</span>
          </div>

          {adv.country && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{adv.country}</span>
            </div>
          )}

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge variant={catMeta.color.includes('amber') ? 'warning' : catMeta.color.includes('blue') ? 'info' : catMeta.color.includes('emerald') ? 'success' : catMeta.color.includes('pink') ? 'pink' : 'purple'}>
              {catMeta.label}
            </Badge>
            <Badge variant={statusMeta.variant as any} dot>
              {statusMeta.label}
            </Badge>
            {adv.stage1.pass && (
              <Badge variant="success">Qualified</Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="w-3 h-3" />
              {fmtDate(adv.timestamp)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Mail className="w-3 h-3" />
              {adv.email.split('@')[0]}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
