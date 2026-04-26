// ============================================
// Data Context — central state + polling for all data
// ============================================

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Advisor, TrackerRow, FollowUp, Activity, Comment, TeamMember, AppConfig, EnrichedAdvisor } from '../types';
import { fetchAdvisors, fetchTracker, fetchFollowUps, fetchActivityLog, fetchComments, fetchTeam, fetchConfig } from '../services/sheets';
import { ensureBackendSchema } from '../services/provisioner';
import { DEFAULT_CONFIG } from '../config/scoring';
import { useAuth } from '../services/auth';

const POLL_INTERVAL = 30_000; // 30 seconds

interface DataState {
  advisors: Advisor[];
  tracker: TrackerRow[];
  followUps: FollowUp[];
  activities: Activity[];
  comments: Comment[];
  team: TeamMember[];
  config: AppConfig;
  isLoading: boolean;
  lastRefresh: string;
  error: string | null;
}

interface DataContextValue extends DataState {
  enrichedAdvisors: EnrichedAdvisor[];
  refresh: () => Promise<void>;
  setTracker: React.Dispatch<React.SetStateAction<TrackerRow[]>>;
  setFollowUps: React.Dispatch<React.SetStateAction<FollowUp[]>>;
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasAccessToken } = useAuth();

  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [tracker, setTracker] = useState<TrackerRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');
  const [error, setError] = useState<string | null>(null);
  const provisioned = useRef(false);

  const loadAll = useCallback(async (cfg?: AppConfig) => {
    try {
      setError(null);
      const activeConfig = cfg || config;
      const [advs, trk, fups, acts, cmts, tm] = await Promise.all([
        fetchAdvisors(activeConfig),
        fetchTracker(),
        fetchFollowUps(),
        fetchActivityLog(),
        fetchComments(),
        fetchTeam(),
      ]);
      setAdvisors(advs);
      setTracker(trk);
      setFollowUps(fups);
      setActivities(acts);
      setComments(cmts);
      // Use functional setState so we never need `team` in the dep array.
      // Reading `team` from closure was making `loadAll` re-create on every
      // successful poll, which tore down and rebuilt the polling interval and
      // pushed the next tick further out each cycle (drift).
      setTeam(prev => tm.length > 0 ? tm : prev);
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      console.error('Data load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadAll();
  }, [loadAll]);

  // Initial load + provisioning
  useEffect(() => {
    if (!isAuthenticated || !hasAccessToken) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      setIsLoading(true);

      // Auto-provision backend schema
      const backendId = import.meta.env.VITE_BACKEND_SHEET_ID;
      if (backendId && !provisioned.current) {
        try {
          await ensureBackendSchema(backendId);
          provisioned.current = true;
        } catch (e) {
          console.warn('Provisioning failed:', e);
        }
      }

      // Load config first, then all data with that config
      try {
        const cfg = await fetchConfig();
        setConfig(cfg);
        await loadAll(cfg);
      } catch {
        await loadAll();
      }
    };

    init();
  }, [isAuthenticated, hasAccessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling
  useEffect(() => {
    if (!isAuthenticated || !hasAccessToken) return;

    const timer = setInterval(() => {
      loadAll().catch(console.error);
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [isAuthenticated, hasAccessToken, loadAll]);

  // Enrich advisors with tracker, follow-ups, comments, activities
  const enrichedAdvisors: EnrichedAdvisor[] = advisors.map(a => ({
    ...a,
    tracker: tracker.find(t => t.advisorId === a.id),
    followUps: followUps.filter(f => f.advisorId === a.id),
    comments: comments.filter(c => c.advisorId === a.id),
    activities: activities.filter(act => act.advisorId === a.id),
  }));

  return (
    <DataContext.Provider value={{
      advisors,
      tracker,
      followUps,
      activities,
      comments,
      team,
      config,
      isLoading,
      lastRefresh,
      error,
      enrichedAdvisors,
      refresh,
      setTracker,
      setFollowUps,
      setActivities,
      setComments,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
