import { useState, useMemo } from 'react';
import { Activity, Search, Filter } from 'lucide-react';

interface Props {
  activities: any[];
  advisors: any[];
  teamMembers?: { email: string; name: string }[];
  onViewAdvisor: (id: string) => void;
}

export default function ActivityView({ activities, advisors, teamMembers = [], onViewAdvisor }: Props) {
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterAdvisor, setFilterAdvisor] = useState<string>('');

  const getAdvisorName = (id: string) => advisors.find((a: any) => a.id === id)?.name || id;

  const filteredActivities = useMemo(() => {
    let list = activities;
    
    if (filterUser !== 'all') {
      list = list.filter(a => a.userEmail === filterUser);
    }

    if (filterAdvisor.trim()) {
      const q = filterAdvisor.toLowerCase();
      list = list.filter(a => {
        const advName = getAdvisorName(a.advisorId).toLowerCase();
        return advName.includes(q) || a.advisorId.toLowerCase().includes(q);
      });
    }

    return list;
  }, [activities, filterUser, filterAdvisor, advisors]);

  // Extract unique users from activities if teamMembers is empty or incomplete
  const uniqueUsers = useMemo(() => {
    const users = new Set(activities.map(a => a.userEmail));
    teamMembers.forEach(t => users.add(t.email));
    return Array.from(users).filter(Boolean);
  }, [activities, teamMembers]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-600 text-white">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Activity Log</h1>
            <p className="text-xs text-slate-500">{activities.length} actions recorded</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer appearance-none min-w-[200px]"
          >
            <option value="all">All Team Members</option>
            {uniqueUsers.map(email => (
              <option key={email} value={email}>{email}</option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by advisor name..."
            value={filterAdvisor}
            onChange={(e) => setFilterAdvisor(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors"
          />
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <div className="text-sm font-medium text-slate-500">No activity matches your filters</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActivities.slice(0, 100).map((act, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
              <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs">
                  <span className="font-medium text-slate-900">{act.userEmail}</span>
                  <span className="text-slate-500"> {act.action} </span>
                  {act.field && (
                    <span className="text-slate-500">
                      {act.field}:{' '}
                      {act.oldValue && <><span className="text-red-500 line-through">{act.oldValue}</span> → </>}
                      <span className="text-emerald-600 font-medium">{act.newValue || '(empty)'}</span>
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  <span
                    className="text-indigo-600 cursor-pointer hover:underline font-medium"
                    onClick={() => onViewAdvisor(act.advisorId)}
                  >
                    {getAdvisorName(act.advisorId)}
                  </span>
                  <span className="ml-2">{act.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredActivities.length > 100 && (
            <div className="text-center py-3 text-xs text-slate-400">
              Showing most recent 100 of {filteredActivities.length} activities
            </div>
          )}
        </div>
      )}
    </div>
  );
}
