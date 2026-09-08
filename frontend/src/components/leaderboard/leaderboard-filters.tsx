'use client';

import { Search, Swords } from 'lucide-react';

export function LeaderboardFilters({ query, onQueryChange, ladderLabel = '1v1 Random Map' }: { query: string; onQueryChange: (value: string) => void; ladderLabel?: string }) {
  return (
    <div className="leaderboard-filters">
      <span className="filter-select"><Swords size={15} /><span>{ladderLabel}</span></span>
      <label className="table-search"><Search size={16} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search player" aria-label="Filter players" /></label>
    </div>
  );
}
