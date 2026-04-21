import { useState, useMemo } from 'react';
import { Table, Search, Save, List } from 'lucide-react';
import type { EnrichedAdvisor, AdvisorStatus, TrackerRow } from '../types';
import { STATUS_META } from './PipelineView';
import { Card, Badge, Avatar, PageHeader } from './ui/index';

interface Props {
  advisors: EnrichedAdvisor[];
  onViewAdvisor: (id: string) => void;
  onTrackerUpdate: (advisorId: string, updates: Partial<TrackerRow>) => void;
  teamEmails: string[];
}

export default function TrackerView({ advisors, onViewAdvisor, onTrackerUpdate, teamEmails }: Props) {
  const [search, setSearch] = useState('');
  
  // Track ongoing edits before they are saved
  const [edits, setEdits] = useState<Record<string, Partial<TrackerRow>>>({});
  
  const handleEdit = (advisorId: string, field: keyof TrackerRow, value: any) => {
    setEdits(prev => ({
      ...prev,
      [advisorId]: {
        ...(prev[advisorId] || {}),
        [field]: value
      }
    }));
  };

  const handleSave = (advisorId: string) => {
    const changes = edits[advisorId];
    if (changes && Object.keys(changes).length > 0) {
      onTrackerUpdate(advisorId, changes);
      // Remove from edits after saving
      setEdits(prev => {
        const next = { ...prev };
        delete next[advisorId];
        return next;
      });
    }
  };

  const filtered = useMemo(() => {
    let list = advisors;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => 
        a.name.toLowerCase().includes(q) || 
        a.email.toLowerCase().includes(q)
      );
    }
    // Only show advisors that are moving in the pipeline (e.g., exclude unqualified or maybe just sort by active)
    return list.sort((a, b) => b.stage1.total - a.stage1.total);
  }, [advisors, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Table}
        iconColor="bg-blue-600"
        title="Tracker Grid"
        subtitle="Inline bulk editing for pipeline tracking"
      />

      <Card padding="sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wide">
                <th className="font-semibold p-3 w-64">Advisor</th>
                <th className="font-semibold p-3 w-40">Status</th>
                <th className="font-semibold p-3 w-40">Assignee</th>
                <th className="font-semibold p-3">Ack Sent</th>
                <th className="font-semibold p-3 w-36">Intro Sched.</th>
                <th className="font-semibold p-3 w-36">Assessment</th>
                <th className="font-semibold p-3 w-36">Decision</th>
                <th className="font-semibold p-3 min-w-[200px]">Internal Notes</th>
                <th className="font-semibold p-3 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(adv => {
                const tr = adv.tracker || {} as any;
                const currentEdits = edits[adv.id] || {};
                const hasChanges = Object.keys(currentEdits).length > 0;
                
                // Effective values (edited or original)
                const status = currentEdits.status !== undefined ? currentEdits.status : (tr.status || 'new');
                const assignee = currentEdits.assignee !== undefined ? currentEdits.assignee : (tr.assignee || '');
                const receivedAck = currentEdits.receivedAck !== undefined ? currentEdits.receivedAck : !!tr.receivedAck;
                const introScheduled = currentEdits.introScheduled !== undefined ? currentEdits.introScheduled : (tr.introScheduled || '');
                const assessmentDate = currentEdits.assessmentDate !== undefined ? currentEdits.assessmentDate : (tr.assessmentDate || '');
                const decisionDate = currentEdits.decisionDate !== undefined ? currentEdits.decisionDate : (tr.decisionDate || '');
                const notes = currentEdits.notes !== undefined ? currentEdits.notes : (tr.notes || '');

                return (
                  <tr key={adv.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-3">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewAdvisor(adv.id)}>
                        <Avatar name={adv.name} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate hover:text-indigo-600 transition-colors">{adv.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{adv.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={status}
                        onChange={e => handleEdit(adv.id, 'status', e.target.value)}
                        className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-indigo-500"
                      >
                        {Object.entries(STATUS_META).map(([k, m]) => (
                          <option key={k} value={k}>{m.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={assignee}
                        onChange={e => handleEdit(adv.id, 'assignee', e.target.value)}
                        className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Unassigned</option>
                        {teamEmails.map(email => (
                          <option key={email} value={email}>{email}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox" 
                        checked={receivedAck}
                        onChange={e => handleEdit(adv.id, 'receivedAck', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="date"
                        value={introScheduled}
                        onChange={e => handleEdit(adv.id, 'introScheduled', e.target.value)}
                        className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="date"
                        value={assessmentDate}
                        onChange={e => handleEdit(adv.id, 'assessmentDate', e.target.value)}
                        className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="date"
                        value={decisionDate}
                        onChange={e => handleEdit(adv.id, 'decisionDate', e.target.value)}
                        className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="text"
                        placeholder="Add notes..."
                        value={notes}
                        onChange={e => handleEdit(adv.id, 'notes', e.target.value)}
                        className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleSave(adv.id)}
                        disabled={!hasChanges}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                          hasChanges 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
