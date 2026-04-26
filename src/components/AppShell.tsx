// ============================================
// AppShell — Main layout with header, nav, and content
// Matches selection-tool design system
// ============================================

import { useState, useCallback, useMemo } from 'react';
import {
  TrendingUp, Users, Calendar, Activity, Settings, LogOut,
  RefreshCw, Clock, AlertTriangle, Table
} from 'lucide-react';
import type { ViewName, AdvisorStatus } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../services/auth';
import { updateTrackerStatus, addComment, addFollowUp, completeFollowUp, logActivity } from '../services/sheets';
import { cn } from '../lib/utils';
import { downloadCSV } from '../utils/csv';
import { Avatar } from './ui/index';

import DashboardView from './DashboardView';
import PipelineView from './PipelineView';
import TrackerView from './TrackerView';
import FollowUpsView from './FollowUpsView';
import ActivityView from './ActivityView';
import DetailModal from './DetailModal';
import SettingsView from './SettingsView';

const NAV_TABS: { id: ViewName; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'pipeline', label: 'Pipeline', icon: Users },
  { id: 'tracker', label: 'Tracker', icon: Table },
  { id: 'followups', label: 'Follow-Ups', icon: Calendar },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'config', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<ViewName>('dashboard');
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    enrichedAdvisors, followUps, activities, config, team,
    isLoading, lastRefresh, error,
    refresh, setTracker, setFollowUps, setActivities, setComments,
  } = useData();

  // After every write, force a fresh fetch from the sheet so the server's
  // authoritative row always wins over the optimistic local state. Without
  // this, an optimistic update can shadow a value that another user (or the
  // same user editing the sheet directly) just wrote, until the next 30-second
  // poll lands.
  const writeAndSync = useCallback(async (work: () => Promise<void>) => {
    try {
      await work();
    } catch (err) {
      console.error('Write failed:', err);
    } finally {
      // Re-fetch even on failure so the optimistic state is rolled back to
      // whatever the server actually has.
      refresh().catch(console.error);
    }
  }, [refresh]);

  const { user, signOut } = useAuth();

  // How many seconds since last refresh
  const lastSyncAgo = useMemo(() => {
    if (!lastRefresh) return '';
    const sec = Math.floor((Date.now() - new Date(lastRefresh).getTime()) / 1000);
    if (sec < 60) return `${sec}s ago`;
    return `${Math.floor(sec / 60)}m ago`;
  }, [lastRefresh]);

  // Overdue count for badge
  const overdueCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return followUps.filter(f => f.status !== 'done' && f.dueDate < today).length;
  }, [followUps]);

  const selectedAdvisor = useMemo(
    () => enrichedAdvisors.find(a => a.id === selectedAdvisorId) || null,
    [enrichedAdvisors, selectedAdvisorId]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  // ─── Handlers that write to Google Sheets ───

  const handleStatusChange = useCallback(async (advisorId: string, newStatus: AdvisorStatus) => {
    await writeAndSync(async () => {
      const adv = enrichedAdvisors.find(a => a.id === advisorId);
      const oldStatus = adv?.tracker?.status || 'new';

      await updateTrackerStatus(advisorId, newStatus, user?.email || '');
      await logActivity(user?.email || '', advisorId, 'status_change', 'status', oldStatus, newStatus, '');

      // Optimistic update
      setTracker(prev => {
        const existing = prev.find(t => t.advisorId === advisorId);
        if (existing) {
          return prev.map(t => t.advisorId === advisorId
            ? { ...t, status: newStatus, updatedBy: user?.email || '', updatedAt: new Date().toISOString() }
            : t
          );
        }
        return [...prev, {
          advisorId,
          status: newStatus,
          assignee: '',
          receivedAck: false,
          introScheduled: '',
          assessmentDate: '',
          decisionDate: '',
          notes: '',
          lastAction: 'status_change',
          updatedBy: user?.email || '',
          updatedAt: new Date().toISOString(),
        }];
      });

      setActivities(prev => [{
        timestamp: new Date().toISOString(),
        userEmail: user?.email || '',
        advisorId,
        action: 'status_change',
        field: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
        details: '',
      }, ...prev]);
    });
  }, [enrichedAdvisors, user, setTracker, setActivities, writeAndSync]);

  const handleTrackerUpdate = useCallback(async (advisorId: string, updates: Partial<any>) => {
    await writeAndSync(async () => {
      const adv = enrichedAdvisors.find(a => a.id === advisorId);
      const existingTracker = adv?.tracker || {} as any;

      // Note: we need updateTrackerFields imported from sheets.ts but we can just map it here via existing tracker structure for optimistic update
      // and call upsertTracker. Actually, we imported updateTrackerStatus. We need to import updateTrackerFields.
      // Wait, let's just make sure we dynamically import it or destructure it from sheets since we might have not imported it at the top of AppShell.
      // Actually, we imported updateTrackerStatus, addComment, addFollowUp, completeFollowUp, logActivity from '../services/sheets'.
      // We will add updateTrackerFields to the imports.
      const { updateTrackerFields } = await import('../services/sheets');
      await updateTrackerFields(advisorId, updates, user?.email || '');

      const newActivities: any[] = [];
      for (const key of Object.keys(updates)) {
        const oldVal = existingTracker[key];
        const newVal = (updates as any)[key];
        if (oldVal !== newVal) {
          await logActivity(user?.email || '', advisorId, 'tracker_update', key, String(oldVal || ''), String(newVal || ''), '');
          newActivities.push({
            timestamp: new Date().toISOString(),
            userEmail: user?.email || '',
            advisorId,
            action: 'tracker_update',
            field: key,
            oldValue: String(oldVal || ''),
            newValue: String(newVal || ''),
            details: '',
          });
        }
      }

      setTracker(prev => {
        const existing = prev.find(t => t.advisorId === advisorId);
        if (existing) {
          return prev.map(t => t.advisorId === advisorId
            ? { ...t, ...updates, updatedBy: user?.email || '', updatedAt: new Date().toISOString() }
            : t
          );
        }
        return [...prev, {
          advisorId,
          status: 'new',
          assignee: '',
          receivedAck: false,
          introScheduled: '',
          assessmentDate: '',
          decisionDate: '',
          notes: '',
          ...updates,
          lastAction: 'tracker_update',
          updatedBy: user?.email || '',
          updatedAt: new Date().toISOString(),
        }];
      });

      setActivities(prev => [...newActivities.reverse(), ...prev]);
    });
  }, [enrichedAdvisors, user, setTracker, setActivities, writeAndSync]);

  const handleAddComment = useCallback(async (advisorId: string, text: string) => {
    await writeAndSync(async () => {
      const id = `cmt_${Date.now()}`;
      await addComment(advisorId, id, user?.email || '', text);

      setComments(prev => [...prev, {
        id,
        advisorId,
        parentId: '',
        userEmail: user?.email || '',
        createdAt: new Date().toISOString(),
        body: text,
        resolved: false,
      }]);
    });
  }, [user, setComments, writeAndSync]);

  const handleCreateFollowUp = useCallback(async (fu: any) => {
    await writeAndSync(async () => {
      const id = `fu_${Date.now()}`;
      await addFollowUp({ ...fu, id });

      setFollowUps(prev => [...prev, { ...fu, id, completedAt: '' }]);
    });
  }, [setFollowUps, writeAndSync]);

  const handleCompleteFollowUp = useCallback(async (id: string) => {
    await writeAndSync(async () => {
      await completeFollowUp(id);

      setFollowUps(prev => prev.map(f => f.id === id
        ? { ...f, status: 'done' as const, completedAt: new Date().toISOString() }
        : f
      ));
    });
  }, [setFollowUps, writeAndSync]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header — matches selection-tool */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-4">
              <img src="/elevate-logo.png" alt="Elevate Logo" className="h-24 w-auto object-contain -my-6"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div>
                <h1 className="text-sm font-bold text-slate-900">Advisor Pipeline</h1>
                <p className="text-xs text-slate-500">
                  {enrichedAdvisors.length > 0 ? `${enrichedAdvisors.length} advisors loaded` : 'Loading...'}
                  {lastSyncAgo && (
                    <span className="ml-2 text-emerald-600">
                      <Clock className="w-3 h-3 inline mr-0.5" />Synced {lastSyncAgo}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
              {/* Nav tabs */}
              <div className="flex bg-slate-100 p-1 rounded-lg min-w-0">
                {NAV_TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap relative',
                      activeTab === t.id
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                    {t.id === 'followups' && overdueCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {overdueCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500 disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
              </button>

              {/* Export CSV */}
              <button
                onClick={() => downloadCSV(enrichedAdvisors)}
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
              >
                Export CSV
              </button>

              {/* User avatar */}
              {user && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <Avatar name={user.name || user.email} size="sm" picture={user.picture} />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-900">{user.name}</span>
                    <span className="text-[10px] text-slate-500">{user.email}</span>
                  </div>
                  <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && enrichedAdvisors.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-indigo-400 mx-auto mb-3 animate-spin" />
              <div className="text-sm font-medium text-slate-600">Loading advisor data...</div>
              <div className="text-xs text-slate-400 mt-1">Fetching from Google Sheets</div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                advisors={enrichedAdvisors}
                onViewAdvisor={(id) => setSelectedAdvisorId(id)}
              />
            )}

            {activeTab === 'pipeline' && (
              <PipelineView
                advisors={enrichedAdvisors}
                onViewAdvisor={(id) => setSelectedAdvisorId(id)}
                onStatusChange={handleStatusChange}
              />
            )}

            {activeTab === 'tracker' && (
              <TrackerView
                advisors={enrichedAdvisors}
                onViewAdvisor={(id) => setSelectedAdvisorId(id)}
                onTrackerUpdate={handleTrackerUpdate}
                teamEmails={team.map(t => t.email)}
              />
            )}

            {activeTab === 'followups' && (
              <FollowUpsView
                followUps={followUps}
                advisors={enrichedAdvisors}
                onCreateFollowUp={handleCreateFollowUp}
                onCompleteFollowUp={handleCompleteFollowUp}
                onViewAdvisor={(id) => setSelectedAdvisorId(id)}
                userEmail={user?.email}
              />
            )}

            {activeTab === 'activity' && (
              <ActivityView 
                activities={activities} 
                advisors={enrichedAdvisors} 
                teamMembers={team}
                onViewAdvisor={(id) => setSelectedAdvisorId(id)} 
              />
            )}

            {activeTab === 'config' && (
              <SettingsView config={config} userEmail={user?.email} />
            )}
          </>
        )}
      </main>

      {/* Detail modal */}
      <DetailModal
        advisor={selectedAdvisor}
        open={!!selectedAdvisorId}
        onClose={() => setSelectedAdvisorId(null)}
        onStatusChange={handleStatusChange}
        onTrackerUpdate={handleTrackerUpdate}
        teamEmails={team.map(t => t.email)}
        onAddComment={handleAddComment}
        onAckSent={async (advisorId: string) => {
          try {
            await handleTrackerUpdate(advisorId, { receivedAck: true });
          } catch {}
        }}
        userEmail={user?.email}
      />
    </div>
  );
}


