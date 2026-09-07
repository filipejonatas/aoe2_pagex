import { ArrowUpRight, Shield } from 'lucide-react';
import Link from 'next/link';
import type { LeagueSummary } from '@/types';
import { Card } from '@/components/ui/card';

export function LeagueCard({ league }: { league: LeagueSummary }) {
  return (
    <Card className="league-card">
      <div className="league-card__top"><span className="league-emblem"><Shield size={19} /></span><span className="member-count">{league.memberCount} players</span></div>
      <h3>{league.name}</h3><p>{league.description}</p>
      <div className="league-card__stats"><div><span>Your position</span><strong>{league.position ? `#${league.position}` : '—'}</strong></div><div><span>Your rating</span><strong>{league.rating ?? '—'}</strong></div></div>
      <Link href={`/league/${league.slug}`} className="league-card__link">View league <ArrowUpRight size={16} /></Link>
    </Card>
  );
}
