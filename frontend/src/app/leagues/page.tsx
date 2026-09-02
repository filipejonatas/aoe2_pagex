import { Plus, TicketCheck } from 'lucide-react';
import { LeagueCard } from '@/components/league/league-card';
import { PageContainer } from '@/components/layout/page-container';
import { demoLeagues } from '@/lib/demo-data';

export const metadata = { title: 'Leagues' };

export default function LeaguesPage() {
  const leagues = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? demoLeagues : [];
  return (
    <PageContainer className="page-top">
      <div className="page-title"><div><span className="eyebrow">Your communities</span><h1>My leagues</h1><p>Private and public rankings built around the players you know.</p></div><div className="page-actions"><button className="button button--secondary"><TicketCheck size={16} /> Join with code</button><button className="button button--primary"><Plus size={16} /> Create league</button></div></div>
      {leagues.length ? <div className="league-grid">{leagues.map((league) => <LeagueCard key={league.id} league={league} />)}<button className="new-league-card"><Plus size={20} /><strong>Create a new league</strong><span>Bring your community together.</span></button></div> : <div className="large-empty card"><span className="league-emblem"><Plus size={21} /></span><h2>Your league hall is empty</h2><p>Create a league or join one with an invite code.</p><button className="button button--primary">Create league</button></div>}
    </PageContainer>
  );
}
