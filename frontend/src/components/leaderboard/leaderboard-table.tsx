'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { LeaderboardPlayer } from '@/types';
import { EmptyState } from '@/components/ui/empty-state';
import { LeaderboardFilters } from './leaderboard-filters';
import { RankBadge } from './rank-badge';

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="delta delta--neutral">—</span>;
  return <span className={`delta ${value > 0 ? 'delta--up' : value < 0 ? 'delta--down' : 'delta--neutral'}`}>{value > 0 ? '+' : ''}{value}</span>;
}

export function LeaderboardTable({ players, showFilters = true, ladderLabel }: { players: LeaderboardPlayer[]; showFilters?: boolean; ladderLabel?: string }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => players.filter((player) => player.nickname.toLowerCase().includes(query.toLowerCase())), [players, query]);

  return (
    <div className="leaderboard-shell">
      {showFilters && <LeaderboardFilters query={query} onQueryChange={setQuery} ladderLabel={ladderLabel} />}
      {filtered.length === 0 ? <EmptyState title={query ? 'No matching players.' : undefined} body={query ? 'Try another nickname.' : undefined} /> : (
        <div className="table-wrap">
          <table className="leaderboard-table">
            <thead><tr><th>#</th><th>Player</th><th>Rating</th><th>Peak</th><th>Global rank</th><th>7D</th><th>30D</th><th aria-label="Details" /></tr></thead>
            <tbody>{filtered.map((player) => (
              <tr key={player.profileId}>
                <td><RankBadge position={player.position} /></td>
                <td><Link href={`/player/${player.profileId}`} className="player-cell"><span className="country-flag">{player.country ?? '—'}</span><span><strong>{player.nickname}</strong><small>{player.platformName}</small></span></Link></td>
                <td className={player.position === 1 ? 'rating rating--top' : 'rating'}>{player.rating?.toLocaleString() ?? '—'}</td>
                <td className="secondary-stat">{player.peakRating?.toLocaleString() ?? '—'}</td>
                <td className="secondary-stat">{player.globalRank && player.globalRank > 0 ? `#${player.globalRank.toLocaleString()}` : '-'}</td>
                <td><Delta value={player.delta7d} /></td>
                <td className="month-delta"><Delta value={player.delta30d} /></td>
                <td><Link className="row-link" href={`/player/${player.profileId}`} aria-label={`View ${player.nickname}`}><ChevronRight size={17} /></Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
