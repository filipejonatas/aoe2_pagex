import { ArrowRight, Copy, Shield, Swords, Users } from 'lucide-react';
import Link from 'next/link';
import type { LeagueSummary } from '@/types';
import { Card } from '@/components/ui/card';

export function LeagueCard({ league, onCopyInvite }: { league: LeagueSummary; onCopyInvite?: (league: LeagueSummary) => void }) {
  const leagueHref = `/league/${league.slug}${league.leaderboardId === 4 ? '?ladder=4' : ''}`;
  return (
    <Card className="league-card">
      <div className="league-card__top"><span className="league-emblem"><Shield size={19} /></span><span className="member-count">{league.memberCount} players</span></div>
      <h3>{league.name}</h3><p>{league.description}</p>
      <div className="league-card__stats"><div><span>Your position</span><strong>{league.position ? `#${league.position}` : '—'}</strong></div><div><span>Your rating</span><strong>{league.rating ?? '—'}</strong></div></div>
      <div className="league-card__mode">{league.leaderboardId === 4 ? <Users size={14} /> : <Swords size={14} />} {league.leaderboardId === 4 ? 'Team Random Map' : '1v1 Random Map'}</div>
      <div className="league-card__actions">
        {league.isOwner && league.inviteCode && onCopyInvite && <button type="button" className="button button--secondary" onClick={() => onCopyInvite(league)}><Copy size={15} /> Copy invite</button>}
        <Link href={leagueHref} className="button button--primary league-card__link">Open leaderboard <ArrowRight size={16} /></Link>
      </div>
    </Card>
  );
}
