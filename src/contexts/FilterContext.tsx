// ============================================
// Filter Context — advisor-specific filtering
// ============================================

import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { EnrichedAdvisor, AdvisorStatus } from '../types';

interface FilterState {
  searchQuery: string;
  selectedCategory: string;      // 'All' | 'CEO' | 'CTO' | 'COO' | 'Unqualified'
  selectedStatus: string;        // 'All' | AdvisorStatus
  selectedAssignee: string;      // 'All' | email
  selectedStage1: string;        // 'All' | 'pass' | 'fail'
  scoreRange: [number, number];  // [min, max]
  selectedCountry: string;
  selectedGender: string;
}

interface FilterContextValue extends FilterState {
  setSearchQuery: (v: string) => void;
  setSelectedCategory: (v: string) => void;
  setSelectedStatus: (v: string) => void;
  setSelectedAssignee: (v: string) => void;
  setSelectedStage1: (v: string) => void;
  setScoreRange: (v: [number, number]) => void;
  setSelectedCountry: (v: string) => void;
  setSelectedGender: (v: string) => void;
  clearFilters: () => void;
  activeFiltersCount: number;
  applyFilters: (advisors: EnrichedAdvisor[]) => EnrichedAdvisor[];
}

const DEFAULT: FilterState = {
  searchQuery: '',
  selectedCategory: 'All',
  selectedStatus: 'All',
  selectedAssignee: 'All',
  selectedStage1: 'All',
  scoreRange: [0, 100],
  selectedCountry: 'All',
  selectedGender: 'All',
};

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FilterState>(DEFAULT);

  const set = <K extends keyof FilterState>(key: K) =>
    (value: FilterState[K]) => setState(prev => ({ ...prev, [key]: value }));

  const clearFilters = useCallback(() => setState(DEFAULT), []);

  const activeFiltersCount = useMemo(() =>
    (state.searchQuery ? 1 : 0) +
    (state.selectedCategory !== 'All' ? 1 : 0) +
    (state.selectedStatus !== 'All' ? 1 : 0) +
    (state.selectedAssignee !== 'All' ? 1 : 0) +
    (state.selectedStage1 !== 'All' ? 1 : 0) +
    (state.scoreRange[0] > 0 || state.scoreRange[1] < 100 ? 1 : 0) +
    (state.selectedCountry !== 'All' ? 1 : 0) +
    (state.selectedGender !== 'All' ? 1 : 0),
    [state]
  );

  const applyFilters = useCallback((advisors: EnrichedAdvisor[]): EnrichedAdvisor[] => {
    return advisors.filter(a => {
      // Search
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const match = [a.name, a.email, a.country, a.position, a.employer]
          .some(f => (f || '').toLowerCase().includes(q));
        if (!match) return false;
      }

      // Category
      if (state.selectedCategory !== 'All') {
        if (state.selectedCategory === 'Unqualified') {
          if (a.stage1.pass) return false;
        } else {
          if (a.stage2.primary !== state.selectedCategory) return false;
        }
      }

      // Status
      if (state.selectedStatus !== 'All') {
        const status = a.tracker?.status || 'new';
        if (status !== state.selectedStatus) return false;
      }

      // Assignee
      if (state.selectedAssignee !== 'All') {
        if ((a.tracker?.assignee || '') !== state.selectedAssignee) return false;
      }

      // Stage 1 pass/fail
      if (state.selectedStage1 === 'pass' && !a.stage1.pass) return false;
      if (state.selectedStage1 === 'fail' && a.stage1.pass) return false;

      // Score range
      if (a.stage1.total < state.scoreRange[0] || a.stage1.total > state.scoreRange[1]) return false;

      // Country
      if (state.selectedCountry !== 'All' && a.country !== state.selectedCountry) return false;

      // Gender
      if (state.selectedGender !== 'All' && a.gender !== state.selectedGender) return false;

      return true;
    });
  }, [state]);

  return (
    <FilterContext.Provider value={{
      ...state,
      setSearchQuery: set('searchQuery'),
      setSelectedCategory: set('selectedCategory'),
      setSelectedStatus: set('selectedStatus'),
      setSelectedAssignee: set('selectedAssignee'),
      setSelectedStage1: set('selectedStage1'),
      setScoreRange: set('scoreRange'),
      setSelectedCountry: set('selectedCountry'),
      setSelectedGender: set('selectedGender'),
      clearFilters,
      activeFiltersCount,
      applyFilters,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used inside FilterProvider');
  return ctx;
}
