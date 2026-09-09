'use client';

import { Copy, LockKeyhole, Swords, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import { LeaguePlayerManager } from '@/components/league/league-player-manager';
import { PageContainer } from '@/components/layout/page-container';
import { getLeaderboard, type LeagueLeaderboardResponse } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { LeaderboardPlayer } from '@/types';

type Ladder = 3 | 4;

export function LeaguePageContent({ slug }: { slug: string }) {
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [data, setData] = useState<LeagueLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPlayerManager, setShowPlayerManager] = useState(false);
  const [removingProfileId, setRemovingProfileId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const hydrated = useAuthStore((state) => state.hydrated);
  const getValidToken = useAuthStore((state) => state.getValidToken);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    setLoading(true);
    setError('');
    const token = getValidToken();
    void getLeaderboard(slug, ladder ?? undefined, token).then((result) => {
      if (!active) return;
      if (!result) {
        setData(null);
        setError('This league is private, unavailable, or you are not a member.');
        return;
      }
      setData(result);
      setLadder(result.league.leaderboardId);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [getValidToken, hydrated, ladder, revision, slug]);

  async function copyInvite() {
    if (!data?.league.inviteCode) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/leagues?invite=${encodeURIComponent(data.league.inviteCode)}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not copy the invite link. Please try again.');
    }
  }

  async function removePlayer(player: LeaderboardPlayer) {
    if (!data || !window.confirm(`Remove ${player.nickname} from ${data.league.name}?`)) return;
    const token = getValidToken();
    if (!token) { setError('Your session expired. Sign in again.'); return; }
    setRemovingProfileId(player.profileId);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'}/leagues/${data.league.id}/members/${player.profileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({})) as { message?: string | string[] };
      if (!response.ok) {
        const detail = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(detail ?? 'Could not remove this player.');
      }
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove this player.');
    } finally {
      setRemovingProfileId(null);
    }
  }

  if (!hydrated || loading) {
    return <PageContainer className="page-top"><div className="large-empty card"><p>Loading league...</p></div></PageContainer>;
  }
  if (!data) {
    return <PageContainer className="page-top"><div className="large-empty card"><LockKeyhole size={24} /><h2>League unavailable</h2><p>{error}</p></div></PageContainer>;
  }

  const activeLadder = data.league.leaderboardId;
  const ladderLabel = activeLadder === 4 ? 'Team Random Map' : '1v1 Random Map';
  return (
    <PageContainer className="page-top">
      <div className="league-header">
        <div>
          <span className="eyebrow">Community league</span>
          <h1>{data.league.name}</h1>
          <p>{data.league.description || 'Community leaderboard'}</p>
          <div className="league-meta"><span>{data.leaderboard.length} players</span><span>{ladderLabel}</span><span>{data.league.visibility === 'PRIVATE' ? 'Private league' : 'Public league'}</span></div>
        </div>
        <div className="league-header__actions">
          {data.league.isOwner && <button className="button button--primary" type="button" onClick={() => setShowPlayerManager((visible) => !visible)}><UserPlus size={16} /> Add player</button>}
          {data.league.isOwner && data.league.inviteCode && <button className="button button--secondary" type="button" onClick={copyInvite}><Copy size={16} /> {copied ? 'Invite copied' : 'Copy invite link'}</button>}
          <div className="ladder-switch" aria-label="Leaderboard mode">
            <button type="button" className={activeLadder === 3 ? 'active' : ''} onClick={() => setLadder(3)}><Swords size={15} /> 1v1</button>
            <button type="button" className={activeLadder === 4 ? 'active' : ''} onClick={() => setLadder(4)}><Users size={15} /> Team Game</button>
          </div>
        </div>
      </div>
      {data.league.isOwner && showPlayerManager && <LeaguePlayerManager leagueId={data.league.id} memberProfileIds={data.leaderboard.map((player) => player.profileId)} onClose={() => setShowPlayerManager(false)} onPlayerAdded={() => setRevision((value) => value + 1)} />}
      {error && <p className="league-alert league-alert--error" role="alert">{error}</p>}
      <LeaderboardTable players={data.leaderboard} ladderLabel={ladderLabel} onRemovePlayer={data.league.isOwner ? (player) => void removePlayer(player) : undefined} removingProfileId={removingProfileId} />
    </PageContainer>
  );
}
