'use client';

import { Check, Link2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoLeaderboard } from '@/lib/demo-data';

type LinkResult = { profileId: string; nickname: string; country?: string | null; rating: number | null; globalRank?: number | null; rank?: number | null };

export function LinkPlayer() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LinkResult[]>([]);
  const [message, setMessage] = useState('');

  async function search() {
    setMessage('');
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      setResults(demoLeaderboard.filter((player) => player.nickname.toLowerCase().includes(query.toLowerCase())));
      return;
    }
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';
      const response = await fetch(`${baseUrl}/players/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error();
      setResults(await response.json() as LinkResult[]);
    } catch { setMessage('Player search is temporarily unavailable.'); }
  }

  async function link(profileId: string) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') { router.push('/dashboard'); return; }
    const token = localStorage.getItem('aoe-league-token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';
    const response = await fetch(`${baseUrl}/players/link`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ profileId }) });
    if (response.ok) router.push('/dashboard'); else setMessage('This profile could not be linked. It may already belong to another account.');
  }

  return <div className="link-player card"><div className="link-player__search"><input aria-label="AoE nickname" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter your exact nickname" /><button className="button button--primary" onClick={search} disabled={query.trim().length < 2}>Find profile</button></div>{message && <p className="form-note">{message}</p>}{results.map((player) => <div className="link-result" key={player.profileId}><span className="player-avatar">{player.country ?? '—'}</span><span><strong>{player.nickname}</strong><small>{player.rating ?? '—'} ELO · #{(player.globalRank ?? player.rank)?.toLocaleString() ?? '—'}</small></span><button className="button button--secondary" onClick={() => link(player.profileId)}><Link2 size={15} /> Link</button></div>)}{results.length === 0 && query.length > 1 && !message && <p className="form-note"><Check size={14} /> Search ready</p>}</div>;
}
