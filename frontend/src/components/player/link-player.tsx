'use client';

import { Check, Link2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoLeaderboard } from '@/lib/demo-data';

type LinkResult = { profileId: string; nickname: string; country?: string | null; currentRating: number | null; currentGlobalRank: number | null };

export function LinkPlayer() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LinkResult[]>([]);
  const [message, setMessage] = useState('');
  const [linked, setLinked] = useState(false);
  const [verifyingSteam, setVerifyingSteam] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const steam = params.get('steam');
    if (steam === 'linked') {
      setLinked(true);
      setMessage('Steam identity verified and AoE II profile linked successfully.');
    } else if (steam === 'verified') {
      setMessage('Steam identity verified, but this profile is not in the ranked player directory yet. Try again after the backfill advances.');
    } else if (steam === 'error') {
      setMessage(params.get('reason') === 'already-linked'
        ? 'This Steam identity or AoE profile is already linked to another account.'
        : 'Steam could not verify this sign-in. Please try again.');
    }
  }, []);

  async function verifyWithSteam() {
    const token = localStorage.getItem('aoe-league-token');
    if (!token) { router.push('/login'); return; }
    setMessage('');
    setVerifyingSteam(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';
      const response = await fetch(`${baseUrl}/auth/steam/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({})) as { url?: string; message?: string | string[] };
      if (!response.ok || !body.url) {
        const detail = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(detail ?? 'Could not start Steam verification.');
      }
      window.location.assign(body.url);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not start Steam verification.');
      setVerifyingSteam(false);
    }
  }

  async function search() {
    setMessage('');
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      setResults(demoLeaderboard.filter((player) => player.nickname.toLowerCase().includes(query.toLowerCase())).map((player) => ({
        profileId: player.profileId,
        nickname: player.nickname,
        country: player.country,
        currentRating: player.rating,
        currentGlobalRank: player.globalRank,
      })));
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
    if (response.ok) { router.push('/dashboard'); return; }
    const body = await response.json().catch(() => ({})) as { message?: string | string[] };
    setMessage(Array.isArray(body.message) ? body.message[0] : body.message ?? 'This profile could not be linked.');
  }

  return <div className="link-player card">
    <button className="button button--primary steam-link-button" onClick={verifyWithSteam} disabled={verifyingSteam || linked}><ShieldCheck size={17} /> {verifyingSteam ? 'Opening Steam...' : linked ? 'Steam verified' : 'Verify and link with Steam'}</button>
    <p className="steam-help">Steam confirms ownership. Your password is entered only on the official Steam website and is never shared with AoE League.</p>
    {linked && <Link href="/dashboard" className="button button--secondary steam-dashboard-link">Continue to dashboard</Link>}
    <div className="form-divider"><span>or find a cached profile</span></div>
    <div className="link-player__search"><input aria-label="AoE nickname" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter your exact nickname" /><button className="button button--primary" onClick={search} disabled={query.trim().length < 2}>Find profile</button></div>
    {message && <p className={`form-note ${linked ? 'form-note--success' : ''}`}>{message}</p>}
    {results.map((player) => <div className="link-result" key={player.profileId}><span className="player-avatar">{player.country ?? '—'}</span><span><strong>{player.nickname}</strong><small>{player.currentRating ?? '—'} ELO · #{player.currentGlobalRank?.toLocaleString() ?? '—'}</small></span><button className="button button--secondary" onClick={() => link(player.profileId)}><Link2 size={15} /> Link verified profile</button></div>)}
    {results.length === 0 && query.length > 1 && !message && <p className="form-note"><Check size={14} /> Search ready</p>}
  </div>;
}
