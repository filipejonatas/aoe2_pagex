'use client';

import { ExternalLink, Search, UserPlus, X } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';

type SearchResult = {
  profileId: string;
  steamId: string | null;
  nickname: string;
  country: string | null;
  currentRating: number | null;
  teamRating: number | null;
};

type Props = {
  leagueId: string;
  memberProfileIds: string[];
  onClose: () => void;
  onPlayerAdded: () => void;
};

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';

function responseMessage(body: { message?: string | string[] }, fallback: string) {
  return Array.isArray(body.message) ? body.message[0] : body.message ?? fallback;
}

export function LeaguePlayerManager({ leagueId, memberProfileIds, onClose, onPlayerAdded }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'searching' | 'results' | 'empty'>('idle');
  const [message, setMessage] = useState('');
  const [addingProfileId, setAddingProfileId] = useState<string | null>(null);
  const searchController = useRef<AbortController | null>(null);
  const getValidToken = useAuthStore((state) => state.getValidToken);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identifier = query.trim();
    if (identifier.length < 2) return;
    searchController.current?.abort();
    searchController.current = new AbortController();
    setStatus('searching');
    setMessage('');
    try {
      const response = await fetch(`${baseUrl}/players/search?q=${encodeURIComponent(identifier)}`, {
        signal: searchController.current.signal,
      });
      if (!response.ok) throw new Error('Player search is temporarily unavailable.');
      const players = await response.json() as SearchResult[];
      setResults(players);
      setStatus(players.length ? 'results' : 'empty');
    } catch (cause) {
      if ((cause as Error).name === 'AbortError') return;
      setResults([]);
      setStatus('idle');
      setMessage(cause instanceof Error ? cause.message : 'Player search is temporarily unavailable.');
    }
  }

  async function addPlayer(player: SearchResult) {
    const token = getValidToken();
    if (!token) {
      setMessage('Your session expired. Sign in again.');
      return;
    }
    setAddingProfileId(player.profileId);
    setMessage('');
    try {
      const response = await fetch(`${baseUrl}/leagues/${leagueId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profileId: player.profileId }),
      });
      const body = await response.json().catch(() => ({})) as { added?: boolean; message?: string | string[] };
      if (!response.ok) throw new Error(responseMessage(body, 'Could not add this player.'));
      setMessage(body.added === false ? `${player.nickname} is already in this league.` : `${player.nickname} was added to the league.`);
      onPlayerAdded();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not add this player.');
    } finally {
      setAddingProfileId(null);
    }
  }

  return (
    <section className="league-player-manager card" aria-labelledby="add-player-title">
      <div className="league-action-panel__heading">
        <div><span className="eyebrow">League roster</span><h2 id="add-player-title">Add player</h2></div>
        <button className="icon-button" type="button" aria-label="Close player search" onClick={onClose}><X size={18} /></button>
      </div>
      <p className="form-help">Search by nickname, AoE Profile ID or 17-digit SteamID. Check the Steam profile before adding the player.</p>
      <form className="league-player-search" onSubmit={search}>
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} required aria-label="Player nickname, AoE Profile ID or SteamID" placeholder="Nickname, AoE ID or SteamID" />
        <button className="button button--primary" type="submit" disabled={status === 'searching'}>{status === 'searching' ? 'Searching...' : 'Search'}</button>
      </form>
      {message && <p className="form-note" role="status">{message}</p>}
      {status === 'empty' && <p className="form-note">No player found. Check the nickname or ID and try again.</p>}
      {status === 'results' && <div className="league-player-results">{results.map((player) => {
        const isMember = memberProfileIds.includes(player.profileId);
        return <div className="league-player-result" key={player.profileId}>
          <span className="player-avatar">{player.country ?? '--'}</span>
          <span className="league-player-result__identity"><strong>{player.nickname}</strong><small>AoE profile {player.profileId} · {player.currentRating ?? '-'} 1v1 · {player.teamRating ?? '-'} Team</small></span>
          <span className="league-player-result__actions">
            {player.steamId ? <a className="button button--secondary" href={`https://steamcommunity.com/profiles/${player.steamId}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> View on Steam</a> : <span className="steam-unavailable">Steam profile unavailable</span>}
            <button className="button button--primary" type="button" disabled={isMember || addingProfileId !== null} onClick={() => void addPlayer(player)}><UserPlus size={15} /> {isMember ? 'Already added' : addingProfileId === player.profileId ? 'Adding...' : 'Add to league'}</button>
          </span>
        </div>;
      })}</div>}
    </section>
  );
}
