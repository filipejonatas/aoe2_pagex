'use client';

import { Copy, LockKeyhole, Swords, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import { PageContainer } from '@/components/layout/page-container';
import { getLeaderboard, type LeagueLeaderboardResponse } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

type Ladder = 3 | 4;

export function LeaguePageContent({ slug }: { slug: string }) {
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [data, setData] = useState<LeagueLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
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
  }, [getValidToken, hydrated, ladder, slug]);

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
          {data.league.isOwner && data.league.inviteCode && <button className="button button--secondary" type="button" onClick={copyInvite}><Copy size={16} /> {copied ? 'Invite copied' : 'Copy invite link'}</button>}
          <div className="ladder-switch" aria-label="Leaderboard mode">
            <button type="button" className={activeLadder === 3 ? 'active' : ''} onClick={() => setLadder(3)}><Swords size={15} /> 1v1</button>
            <button type="button" className={activeLadder === 4 ? 'active' : ''} onClick={() => setLadder(4)}><Users size={15} /> Team Game</button>
          </div>
        </div>
      </div>
      {error && <p className="league-alert league-alert--error" role="alert">{error}</p>}
      <LeaderboardTable players={data.leaderboard} ladderLabel={ladderLabel} />
    </PageContainer>
  );
}
