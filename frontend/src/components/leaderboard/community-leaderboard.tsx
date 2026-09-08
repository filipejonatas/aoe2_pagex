'use client';

import { ChevronLeft, ChevronRight, Globe2, Search, Swords, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getCommunityLeaderboard, type CommunityLeaderboardResponse } from '@/lib/api';
import { LeaderboardTable } from './leaderboard-table';

const PAGE_SIZE = 50;

type Ladder = 3 | 4;
type Scope = 'country' | 'global';

export function CommunityLeaderboard() {
  const [ladder, setLadder] = useState<Ladder>(3);
  const [scope, setScope] = useState<Scope>('country');
  const [country, setCountry] = useState('BR');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [data, setData] = useState<CommunityLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const cursor = cursorStack.at(-1) ?? null;
  const selectedCountry = scope === 'country' ? country : undefined;
  const countryOptions = useMemo(
    () => Array.from(new Set([country, ...(data?.countries ?? [])])).filter(Boolean).sort(),
    [country, data?.countries],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storedLadder = window.localStorage.getItem('communityLeaderboard.ladder');
    const storedScope = window.localStorage.getItem('communityLeaderboard.scope');
    const storedCountry = window.localStorage.getItem('communityLeaderboard.country');
    const ladderParam = params.get('ladder') ?? storedLadder;
    const scopeParam = params.get('scope') ?? storedScope;
    const countryParam = (params.get('country') ?? storedCountry ?? 'BR').toUpperCase();

    setLadder(ladderParam === 'team' || ladderParam === '4' ? 4 : 3);
    setScope(scopeParam === 'global' ? 'global' : 'country');
    setCountry(/^[A-Z]{2}$/.test(countryParam) ? countryParam : 'BR');
    setReady(true);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const normalized = searchInput.trim();
      setSearch(normalized.length >= 2 ? normalized : '');
      setCursorStack([null]);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true);
    setData(null);
    setError(false);

    void getCommunityLeaderboard({
      leaderboardId: ladder,
      country: selectedCountry,
      search: search || undefined,
      cursor,
      limit: PAGE_SIZE,
    }).then((response) => {
      if (!active) return;
      if (!response) {
        setError(true);
      } else {
        setData(response);
      }
      setLoading(false);
    });

    const params = new URLSearchParams();
    params.set('ladder', ladder === 3 ? '1v1' : 'team');
    params.set('scope', scope);
    if (scope === 'country') params.set('country', country);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
    window.localStorage.setItem('communityLeaderboard.ladder', String(ladder));
    window.localStorage.setItem('communityLeaderboard.scope', scope);
    window.localStorage.setItem('communityLeaderboard.country', country);

    return () => { active = false; };
  }, [country, cursor, ladder, ready, scope, search, selectedCountry]);

  function changeLadder(next: Ladder) {
    setLadder(next);
    setCursorStack([null]);
  }

  function changeScope(next: Scope) {
    setScope(next);
    setCursorStack([null]);
  }

  const rangeStart = data?.players.length ? data.startPosition : 0;
  const rangeEnd = data?.players.length ? data.startPosition + data.players.length - 1 : 0;

  return <>
    <section className="community-controls card" aria-label="Leaderboard filters">
      <div className="ladder-switch" aria-label="Game mode">
        <button type="button" aria-pressed={ladder === 3} className={ladder === 3 ? 'active' : ''} onClick={() => changeLadder(3)}><Swords size={15} /> 1v1 Random Map</button>
        <button type="button" aria-pressed={ladder === 4} className={ladder === 4 ? 'active' : ''} onClick={() => changeLadder(4)}><Users size={15} /> Team Random Map</button>
      </div>

      <div className="scope-switch" aria-label="Ranking scope">
        <button type="button" aria-pressed={scope === 'country'} className={scope === 'country' ? 'active' : ''} onClick={() => changeScope('country')}>Country</button>
        <button type="button" aria-pressed={scope === 'global'} className={scope === 'global' ? 'active' : ''} onClick={() => changeScope('global')}><Globe2 size={14} /> Global</button>
      </div>

      {scope === 'country' && <label className="country-picker">
        <span>Country</span>
        <select value={country} onChange={(event) => { setCountry(event.target.value); setCursorStack([null]); }} aria-label="Country">
          {countryOptions.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
      </label>}

      <label className="table-search community-search">
        <Search size={15} />
        <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search player" aria-label="Search player" />
      </label>
    </section>

    <section className="top-players-section">
      <div className="section-heading"><div><span className="eyebrow">Current leaders</span><h2>Top 3 {scope === 'country' ? country : 'worldwide'}</h2></div></div>
      <div className="top-player-grid">
        {(data?.top ?? []).map((player) => <Link key={player.profileId} href={`/player/${player.profileId}`} className={`top-player-card top-player-card--${player.position}`}>
          <span className="top-player-card__rank">#{player.position}</span>
          <span className="country-flag">{player.country ?? '-'}</span>
          <strong>{player.nickname}</strong>
          <span>{player.rating?.toLocaleString() ?? '-'} Elo</span>
        </Link>)}
        {!loading && !error && data?.top.length === 0 && <p className="leaderboard-message">No rated players found for this filter.</p>}
      </div>
    </section>

    {error ? <div className="league-alert league-alert--error">The leaderboard could not be loaded. Please try again.</div> : <div className={loading ? 'community-results community-results--loading' : 'community-results'}>
      {loading && !data
        ? <div className="leaderboard-shell leaderboard-loading">Loading official ratings…</div>
        : <LeaderboardTable players={data?.players ?? []} showFilters={false} recordMode showPosition={!search} />}
      <nav className="leaderboard-pagination" aria-label="Leaderboard pages">
        <button type="button" className="button button--secondary" disabled={cursorStack.length === 1 || loading} onClick={() => setCursorStack((current) => current.slice(0, -1))}><ChevronLeft size={16} /> Previous</button>
        <span>{rangeStart && rangeEnd ? `Players ${rangeStart}–${rangeEnd}` : loading ? 'Loading players…' : 'No players'}</span>
        <button type="button" className="button button--secondary" disabled={!data?.hasNext || !data.nextCursor || loading} onClick={() => { if (data?.nextCursor) setCursorStack((current) => [...current, data.nextCursor]); }}>Next <ChevronRight size={16} /></button>
      </nav>
    </div>}
  </>;
}
