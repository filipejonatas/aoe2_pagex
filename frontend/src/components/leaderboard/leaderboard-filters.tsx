'use client';

import { Search, SlidersHorizontal } from 'lucide-react';

export function LeaderboardFilters({ period, onPeriodChange, query, onQueryChange }: { period: string; onPeriodChange: (value: string) => void; query: string; onQueryChange: (value: string) => void }) {
  return (
    <div className="leaderboard-filters">
      <button className="filter-select"><SlidersHorizontal size={15} /><span>1v1 Random Map</span></button>
      <div className="period-tabs" aria-label="Rating period">
        {['Current', '7D', '30D'].map((item) => <button key={item} className={period === item ? 'active' : ''} onClick={() => onPeriodChange(item)}>{item}</button>)}
      </div>
      <label className="table-search"><Search size={16} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search player" aria-label="Filter players" /></label>
    </div>
  );
}
