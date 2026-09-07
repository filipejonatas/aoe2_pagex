'use client';

import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { demoLeaderboard } from '@/lib/demo-data';
import { Button } from '@/components/ui/button';

type SearchResult = {
  profileId: string;
  nickname: string;
  currentRating: number | null;
  currentGlobalRank: number | null;
};

export function PlayerSearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'results' | 'empty' | 'error'>('idle');
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    if (query.trim().length < 2) return;
    setStatus('loading');
    controller.current?.abort();
    controller.current = new AbortController();
    try {
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        const matches = demoLeaderboard.filter((player) => player.nickname.toLowerCase().includes(query.toLowerCase())).map((player) => ({
          profileId: player.profileId,
          nickname: player.nickname,
          currentRating: player.rating,
          currentGlobalRank: player.globalRank,
        }));
        setResults(matches); setStatus(matches.length ? 'results' : 'empty'); return;
      }
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';
      const response = await fetch(`${baseUrl}/players/search?q=${encodeURIComponent(query)}`, { signal: controller.current.signal });
      if (!response.ok) throw new Error('Search failed');
      const data = (await response.json()) as SearchResult[];
      setResults(data); setStatus(data.length ? 'results' : 'empty');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setStatus('error');
    }
  }

  return (
    <div className={`player-search ${compact ? 'player-search--compact' : ''}`}>
      <form onSubmit={search} className="search-form">
        <Search className="search-form__icon" size={20} />
        <input aria-label="Search player" value={query} onChange={(event) => { setQuery(event.target.value); setStatus('idle'); }} placeholder="Search by player name..." />
        {query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQuery(''); setStatus('idle'); }}><X size={17} /></button>}
        <Button type="submit" disabled={query.trim().length < 2 || status === 'loading'}>{status === 'loading' ? 'Searching...' : 'Search'}</Button>
      </form>
      {status !== 'idle' && status !== 'loading' && (
        <div className="search-results" role="status">
          {status === 'error' && <p className="search-message search-message--error">Player search is temporarily unavailable. Try again shortly.</p>}
          {status === 'empty' && <p className="search-message">No players found for “{query}”.</p>}
          {status === 'results' && results.map((player) => (
            <Link key={player.profileId} href={`/player/${player.profileId}`} className="search-result">
              <span className="player-avatar">{player.nickname.slice(0, 2).toUpperCase()}</span>
              <span><strong>{player.nickname}</strong><small>Profile {player.profileId}</small></span>
              <span className="search-result__meta"><strong>{player.currentRating ?? '—'}</strong><small>{player.currentGlobalRank ? `#${player.currentGlobalRank.toLocaleString()} Global` : 'Unranked'}</small></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
