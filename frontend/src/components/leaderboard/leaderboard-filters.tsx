'use client';

import { Search, Swords } from 'lucide-react';

export function LeaderboardFilters({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
  return (
    <div className="leaderboard-filters">
      <span className="filter-select"><Swords size={15} /><span>1v1 Random Map</span></span>
      <label className="table-search"><Search size={16} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search player" aria-label="Filter players" /></label>
    </div>
  );
}
