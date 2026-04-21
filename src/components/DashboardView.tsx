// ============================================
// Dashboard View — KPIs + Charts
// Matches selection-tool design system
// ============================================

import { useMemo } from 'react';
import {
  Users, Award, TrendingUp, Globe2, Briefcase, Target, Star,
  Brain, Megaphone, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import type { EnrichedAdvisor, CategoryKey } from '../types';
import { Card, PageHeader, StatCard, ScoreRing, Badge, ProgressBar } from './ui/index';
import { CATEGORY_META } from '../config/scoring';

const CAT_COLORS: Record<string, string> = {
  CEO: '#f59e0b',
  CTO: '#3b82f6',
  COO: '#10b981',
  Marketing: '#ec4899',
  AI: '#8b5cf6',
};

const SCORE_FILL = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981'];

interface Props {
  advisors: EnrichedAdvisor[];
  onViewAdvisor?: (id: string) => void;
}

export default function DashboardView({ advisors, onViewAdvisor }: Props) {
  const qualified = useMemo(() => advisors.filter(a => a.stage1.pass), [advisors]);
  const total = advisors.length;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { CEO: 0, CTO: 0, COO: 0, Marketing: 0, AI: 0 };
    qualified.forEach(a => { if (a.stage2.primary && a.stage2.primary !== 'Unqualified') counts[a.stage2.primary] = (counts[a.stage2.primary] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name, value, color: CAT_COLORS[name] || '#64748b',
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
    }));
  }, [qualified, total]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const ranges = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '20-40', min: 20, max: 40, count: 0 },
      { range: '40-60', min: 40, max: 60, count: 0 },
      { range: '60-80', min: 60, max: 80, count: 0 },
      { range: '80-100', min: 80, max: 101, count: 0 },
    ];
    advisors.forEach(a => {
      const r = ranges.find(r => a.stage1.total >= r.min && a.stage1.total < r.max) || ranges[ranges.length - 1];
      r.count++;
    });
    return ranges;
  }, [advisors]);

  // Country distribution
  const countryData = useMemo(() => {
    const m: Record<string, number> = {};
    advisors.forEach(a => {
      const c = a.country?.trim() || 'Unknown';
      // Clean up long addresses to just country/city
      const short = c.length > 25 ? c.split(',').pop()?.trim() || c.substring(0, 20) : c;
      m[short] = (m[short] || 0) + 1;
    });
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [advisors]);

  // Status distribution
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    advisors.forEach(a => {
      const status = a.tracker?.status || 'new';
      m[status] = (m[status] || 0) + 1;
    });
    return m;
  }, [advisors]);

  // Compensation type
  const compData = useMemo(() => {
    let paid = 0, vol = 0, either = 0;
    advisors.forEach(a => {
      const p = (a.paidOrVol || '').toLowerCase();
      if (p.includes('paid') && !p.includes('volunteer')) paid++;
      else if (p.includes('volunteer')) vol++;
      else either++;
    });
    return [
      { name: 'Paid', value: paid, color: '#4f46e5' },
      { name: 'Volunteer', value: vol, color: '#10b981' },
      { name: 'Either/Unspecified', value: either, color: '#94a3b8' },
    ];
  }, [advisors]);

  // Top scored advisors
  const topAdvisors = useMemo(() =>
    [...advisors].sort((a, b) => b.stage1.total - a.stage1.total).slice(0, 6),
  [advisors]);

  const avgScore = total > 0
    ? (advisors.reduce((s, a) => s + a.stage1.total, 0) / total).toFixed(0)
    : '0';

  const GEO_COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f97316'];

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-4">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">No 2026 advisors found</h3>
        <p className="text-xs text-slate-500">No form responses found for 2026. Check that the responses sheet has recent data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={TrendingUp}
        iconColor="bg-indigo-600"
        title="Advisor Pipeline Dashboard"
        subtitle={`${total} advisors from 2026 · ${qualified.length} qualified (${total > 0 ? ((qualified.length / total) * 100).toFixed(0) : 0}%)`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
        <StatCard label="Total Advisors" value={total} icon={Users} color="blue"
          trend={`${Object.keys(statusCounts).length} status groups`} />
        <StatCard label="Qualified" value={qualified.length} icon={Award} color="emerald"
          trend={`${total > 0 ? ((qualified.length / total) * 100).toFixed(0) : 0}% pass rate`} />
        <StatCard label="CEO Fit" value={categoryCounts.find(c => c.name === 'CEO')?.value || 0} icon={Briefcase} color="amber"
          trend="Strategy & leadership" />
        <StatCard label="CTO Fit" value={categoryCounts.find(c => c.name === 'CTO')?.value || 0} icon={Target} color="blue"
          trend="Technical expertise" />
        <StatCard label="Marketing" value={categoryCounts.find(c => c.name === 'Marketing')?.value || 0} icon={Megaphone} color="pink"
          trend="Branding & growth" />
        <StatCard label="AI Specialist" value={categoryCounts.find(c => c.name === 'AI')?.value || 0} icon={Brain} color="purple"
          trend="ML & data science" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Distribution */}
        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg"><Star className="w-3.5 h-3.5 text-indigo-600" /></div>
              <div>
                <span className="text-sm font-semibold text-slate-900">Category Distribution</span>
                <span className="block text-xs text-slate-500">{qualified.length} qualified advisors across 5 categories</span>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryCounts.filter(c => c.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={88} paddingAngle={3} dataKey="value">
                    {categoryCounts.filter(c => c.value > 0).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 24px rgb(0 0 0 / 0.12)', fontSize: '12px' }}
                    formatter={(v: any, _n: any, p: any) => [`${v} advisors (${p.payload.percentage}%)`, p.payload.name]} />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Score Distribution */}
        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg"><TrendingUp className="w-3.5 h-3.5 text-indigo-600" /></div>
              <div>
                <span className="text-sm font-semibold text-slate-900">Score Distribution</span>
                <span className="block text-xs text-slate-500">{total} advisors · Avg score: {avgScore}</span>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9', radius: 4 }}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 24px rgb(0 0 0 / 0.12)', fontSize: '12px' }}
                    formatter={(v: any) => [`${v} advisors`, 'Count']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((_, i) => <Cell key={i} fill={SCORE_FILL[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Geographic */}
        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg"><Globe2 className="w-3.5 h-3.5 text-indigo-600" /></div>
              <div>
                <span className="text-sm font-semibold text-slate-900">Geographic Distribution</span>
                <span className="block text-xs text-slate-500">Top {countryData.length} locations</span>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 24px rgb(0 0 0 / 0.12)', fontSize: '12px' }} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Compensation */}
        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg"><Briefcase className="w-3.5 h-3.5 text-indigo-600" /></div>
              <div>
                <span className="text-sm font-semibold text-slate-900">Compensation Preference</span>
                <span className="block text-xs text-slate-500">Paid vs. volunteering breakdown</span>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={compData} cx="50%" cy="50%" innerRadius={50} outerRadius={88} paddingAngle={3} dataKey="value">
                    {compData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 24px rgb(0 0 0 / 0.12)', fontSize: '12px' }}
                    formatter={(v: any, _n: any, p: any) => [`${v} advisors`, p.payload.name]} />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Advisors */}
      <Card padding="none">
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 rounded-lg"><Award className="w-3.5 h-3.5 text-amber-600" /></div>
            <div>
              <span className="text-sm font-semibold text-slate-900">Top Scoring Advisors</span>
              <span className="block text-xs text-slate-500">Highest Stage 1 qualification scores</span>
            </div>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {topAdvisors.map((adv, i) => {
            const meta = CATEGORY_META[adv.stage2.primary] || CATEGORY_META.CEO;
            return (
              <div
                key={adv.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onViewAdvisor?.(adv.id)}
              >
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {i + 1}
                </span>
                <ScoreRing value={adv.stage1.total} size={36} stroke={3} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{adv.name}</div>
                  <div className="text-xs text-slate-500 truncate">{adv.position} {adv.employer ? `· ${adv.employer}` : ''}</div>
                </div>
                <Badge variant={meta.color.includes('amber') ? 'warning' : meta.color.includes('blue') ? 'info' : meta.color.includes('emerald') ? 'success' : meta.color.includes('pink') ? 'pink' : 'purple'}>
                  {meta.label}
                </Badge>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
