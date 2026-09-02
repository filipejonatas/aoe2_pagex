import { ArrowRight, Swords, TrendingUp, Trophy } from 'lucide-react';
import Link from 'next/link';
import { LeagueCard } from '@/components/league/league-card';
import { PageContainer } from '@/components/layout/page-container';
import { RatingCard } from '@/components/player/rating-card';
import { demoLeagues, demoPlayer } from '@/lib/demo-data';

export const metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  return <PageContainer className="page-top"><div className="page-title"><div><span className="eyebrow">Player dashboard</span><h1>Welcome back, {demo ? demoPlayer.nickname : 'commander'}</h1><p>Your competitive snapshot across every community.</p></div><Link className="button button--secondary" href="/players">Search players</Link></div>{demo ? <><div className="rating-grid rating-grid--dashboard"><RatingCard label="Current ELO" value={demoPlayer.currentRating.toLocaleString()} detail={<span className="positive">+42 in 7 days</span>} icon={<Swords size={17} />} /><RatingCard label="Global rank" value={`#${demoPlayer.globalRank.toLocaleString()}`} detail="Top 4% worldwide" icon={<Trophy size={17} />} /><RatingCard label="30D change" value={`+${demoPlayer.delta30d}`} detail="Moving up" icon={<TrendingUp size={17} />} /></div><section className="content-section"><div className="section-heading"><div><span className="eyebrow">Your communities</span><h2>League standings</h2></div><Link href="/leagues" className="text-link">View all <ArrowRight size={15} /></Link></div><div className="league-grid">{demoLeagues.map((league) => <LeagueCard key={league.id} league={league} />)}</div></section></> : <div className="large-empty card"><span className="league-emblem"><Swords size={20} /></span><h2>Link your player profile</h2><p>Connect your AoE II account to unlock ratings and leagues.</p><Link href="/onboarding/aoe" className="button button--primary">Link AoE profile</Link></div>}</PageContainer>;
}
