'use client';

import { Check, Link2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { demoLeaderboard } from '@/lib/demo-data';
import { getCurrentUser, joinLeagueInvite, normalizeInviteCode, withInvite } from '@/lib/invite-flow';

type LinkResult = { profileId: string; nickname: string; country?: string | null; currentRating: number | null; currentGlobalRank: number | null; teamRating?: number | null };

export function LinkPlayer({ inviteCode }: { inviteCode?: string | null }) {
  const router = useRouter();
  const pendingInvite = normalizeInviteCode(inviteCode);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LinkResult[]>([]);
  const [message, setMessage] = useState('');
  const [linked, setLinked] = useState(false);
  const [verifyingSteam, setVerifyingSteam] = useState(false);
  const [joiningLeague, setJoiningLeague] = useState(false);
  const getValidToken = useAuthStore((state) => state.getValidToken);
  const setUser = useAuthStore((state) => state.setUser);

  const completeInvitation = useCallback(async (token: string) => {
    if (!pendingInvite) return false;
    setJoiningLeague(true);
    setMessage('Profile linked. Joining the invited league…');
    try {
      const membership = await joinLeagueInvite(token, pendingInvite);
      router.replace(`/league/${membership.league.slug}?joined=${membership.joined ? '1' : 'existing'}`);
      return true;
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Your profile was linked, but the league could not be joined.');
      setJoiningLeague(false);
      return false;
    }
  }, [pendingInvite, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const steam = params.get('steam');
    if (steam === 'linked') {
      setLinked(true);
      setMessage(pendingInvite ? 'Steam verified. Completing your league invitation…' : 'Steam identity verified and AoE II profile linked successfully.');
      const token = getValidToken();
      if (!token) {
        router.replace(withInvite('/login', pendingInvite));
        return;
      }
      void getCurrentUser(token).then(setUser).catch(() => undefined);
      if (pendingInvite) void completeInvitation(token);
    } else if (steam === 'verified') {
      setMessage('Steam was verified, but the AoE II profile is not in the ranked directory yet. Find the profile below to finish linking.');
    } else if (steam === 'error') {
      setMessage(params.get('reason') === 'already-linked'
        ? 'This Steam identity or AoE profile is already linked to another account.'
        : 'Steam could not verify this sign-in. Please try again.');
    }
  }, [completeInvitation, getValidToken, pendingInvite, router, setUser]);

  async function verifyWithSteam() {
    const token = getValidToken();
    if (!token) { router.push(withInvite('/login', pendingInvite)); return; }
    setMessage('');
    setVerifyingSteam(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';
      const response = await fetch(`${baseUrl}/auth/steam/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pendingInvite ? { inviteCode: pendingInvite } : {}),
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
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') { router.push(withInvite('/leagues', pendingInvite)); return; }
    const token = getValidToken();
    if (!token) { router.push(withInvite('/login', pendingInvite)); return; }
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';
    const response = await fetch(`${baseUrl}/players/link`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ profileId }) });
    if (response.ok) {
      setLinked(true);
      void getCurrentUser(token).then(setUser).catch(() => undefined);
      if (pendingInvite) {
        await completeInvitation(token);
        return;
      }
      router.push('/dashboard');
      return;
    }
    const body = await response.json().catch(() => ({})) as { message?: string | string[] };
    setMessage(Array.isArray(body.message) ? body.message[0] : body.message ?? 'This profile could not be linked.');
  }

  return <div className="link-player card">
    <button className="button button--primary steam-link-button" onClick={verifyWithSteam} disabled={verifyingSteam || linked || joiningLeague}><ShieldCheck size={17} /> {joiningLeague ? 'Joining league…' : verifyingSteam ? 'Opening Steam…' : linked ? 'Steam verified' : 'Verify and link with Steam'}</button>
    <p className="steam-help">Steam confirms ownership. Your password is entered only on the official Steam website and is never shared with AoE League.</p>
    {linked && !pendingInvite && <Link href="/dashboard" className="button button--secondary steam-dashboard-link">Continue to dashboard</Link>}
    {linked && pendingInvite && !joiningLeague && <Link href={withInvite('/leagues', pendingInvite)} className="button button--secondary steam-dashboard-link">Retry league invitation</Link>}
    <div className="form-divider"><span>or find a cached profile</span></div>
    <div className="link-player__search"><input aria-label="AoE nickname" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter your exact nickname" /><button className="button button--primary" onClick={search} disabled={query.trim().length < 2 || joiningLeague}>Find profile</button></div>
    {message && <p className={`form-note ${linked ? 'form-note--success' : ''}`}>{message}</p>}
    {results.map((player) => <div className="link-result" key={player.profileId}><span className="player-avatar">{player.country ?? '—'}</span><span><strong>{player.nickname}</strong><small>{player.currentRating ?? '—'} 1v1 · {player.teamRating ?? '-'} Team · {player.currentGlobalRank && player.currentGlobalRank > 0 ? `#${player.currentGlobalRank.toLocaleString()}` : '-'}</small></span><button className="button button--secondary" onClick={() => link(player.profileId)} disabled={joiningLeague}><Link2 size={15} /> Link verified profile</button></div>)}
    {results.length === 0 && query.length > 1 && !message && <p className="form-note"><Check size={14} /> Search ready</p>}
  </div>;
}
