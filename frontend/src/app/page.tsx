import { ArrowRight, BarChart3, Swords, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { LeagueCard } from '@/components/league/league-card';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import { PageContainer } from '@/components/layout/page-container';
import { PlayerSearch } from '@/components/player/player-search';
import { demoLeaderboard, demoLeagues } from '@/lib/demo-data';

const demo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function Home() {
  const players = demo ? demoLeaderboard.slice(0, 5) : [];
  const leagues = demo ? demoLeagues.slice(0, 2) : [];
  return (
    <PageContainer>
      {demo && <div className="demo-banner">Preview mode <span>Showing sample data for visual review</span></div>}
      <section className="home-hero">
        <div className="hero-kicker"><Swords size={15} /> Ranked by real AoE II rating</div>
        <h1>Age of Empires II<br /><em>Community Rankings</em></h1>
        <p>Compare your ELO, join community leagues and follow every step of your progress.</p>
        <PlayerSearch />
        <div className="hero-meta"><span><span className="status-dot" /> Official rating data</span><span>1v1 Random Map</span><span>Updated hourly</span></div>
      </section>

      <section className="stats-strip" aria-label="Platform overview">
        <div><Users size={19} /><span><strong>2,481</strong> tracked players</span></div>
        <div><Swords size={19} /><span><strong>86</strong> active leagues</span></div>
        <div><BarChart3 size={19} /><span><strong>12,840</strong> rating updates this week</span></div>
      </section>

      <section className="content-section">
        <div className="section-heading"><div><span className="eyebrow">Your communities</span><h2>My leagues</h2></div><Link href="/leagues" className="text-link">View all <ArrowRight size={15} /></Link></div>
        {leagues.length ? <div className="league-grid league-grid--home">{leagues.map((league) => <LeagueCard key={league.id} league={league} />)}</div> : <div className="compact-empty card"><span>You have not joined a league yet.</span><Link href="/leagues" className="text-link">Explore leagues <ArrowRight size={15} /></Link></div>}
      </section>

      <section className="content-section">
        <div className="section-heading"><div><span className="eyebrow">1v1 Random Map</span><h2>Community leaderboard</h2></div><Link href="/leaderboard" className="text-link">Full ranking <ArrowRight size={15} /></Link></div>
        <LeaderboardTable players={players} showFilters={false} />
      </section>

      <section className="activity-section card">
        <div><span className="activity-icon"><TrendingUp size={21} /></span><div><span className="eyebrow">Recent activity</span><h2>Rating changes, without the noise.</h2><p>Your history starts when your AoE profile is linked.</p></div></div>
        <Link href="/register" className="button button--secondary">Create account</Link>
      </section>
    </PageContainer>
  );
}
