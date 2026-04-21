// ============================================
// Kanban Board — Drag-and-drop pipeline columns
// ============================================

import { useState, useRef, useCallback } from 'react';
import type { EnrichedAdvisor, AdvisorStatus } from '../types';
import { cn } from '../lib/utils';
import { ScoreRing, Avatar, Badge } from './ui/index';
import { STATUS_META } from './PipelineView';
import { CATEGORY_META } from '../config/scoring';
import { GripVertical, ChevronRight } from 'lucide-react';

const KANBAN_COLUMNS: AdvisorStatus[] = [
  'new', 'acknowledged', 'allocated', 'intro_sched',
  'intro_done', 'assessment', 'approved', 'matched', 'on_hold', 'rejected',
];

interface Props {
  advisors: EnrichedAdvisor[];
  onViewAdvisor: (id: string) => void;
  onStatusChange: (advisorId: string, newStatus: AdvisorStatus) => void;
}

export default function KanbanBoard({ advisors, onViewAdvisor, onStatusChange }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<AdvisorStatus | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, advisorId: string) => {
    setDraggedId(advisorId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', advisorId);
    // Add dragging class
    (e.target as HTMLElement).classList.add('dragging');
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedId(null);
    setDropTarget(null);
    (e.target as HTMLElement).classList.remove('dragging');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: AdvisorStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: AdvisorStatus) => {
    e.preventDefault();
    const advisorId = e.dataTransfer.getData('text/plain');
    setDraggedId(null);
    setDropTarget(null);

    if (advisorId) {
      const adv = advisors.find(a => a.id === advisorId);
      const currentStatus = adv?.tracker?.status || 'new';
      if (currentStatus !== newStatus) {
        onStatusChange(advisorId, newStatus);
      }
    }
  }, [advisors, onStatusChange]);

  // Group advisors by status
  const columns = KANBAN_COLUMNS.map(status => ({
    status,
    meta: STATUS_META[status],
    items: advisors.filter(a => (a.tracker?.status || 'new') === status),
  }));

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {columns.map(col => (
          <div
            key={col.status}
            className={cn(
              'w-[260px] flex-shrink-0 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col max-h-[70vh]',
              dropTarget === col.status && 'drag-over border-indigo-300 bg-indigo-50/50',
            )}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            {/* Column header */}
            <div className="px-3 py-2.5 border-b border-slate-200/60 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">{col.meta.label}</span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  col.items.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
                )}>
                  {col.items.length}
                </span>
              </div>
            </div>

            {/* Column body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {col.items.length === 0 ? (
                <div className="text-center py-6 text-[10px] text-slate-400">
                  Drop advisors here
                </div>
              ) : (
                col.items.map(adv => {
                  const catMeta = CATEGORY_META[adv.stage2.primary] || CATEGORY_META.CEO;
                  return (
                    <div
                      key={adv.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, adv.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'bg-white rounded-lg border border-slate-200/80 p-2.5 cursor-grab active:cursor-grabbing',
                        'hover:shadow-md hover:border-slate-300 transition-all duration-150',
                        draggedId === adv.id && 'opacity-40'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0" onClick={() => onViewAdvisor(adv.id)}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-slate-900 truncate">{adv.name}</span>
                            <ScoreRing value={adv.stage1.total} size={28} stroke={2.5} />
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {adv.position || 'No title'}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Badge variant={catMeta.color.includes('amber') ? 'warning' : catMeta.color.includes('blue') ? 'info' : catMeta.color.includes('emerald') ? 'success' : catMeta.color.includes('pink') ? 'pink' : 'purple'}>
                              {catMeta.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
