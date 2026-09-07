import { Clock3 } from 'lucide-react';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import { PageContainer } from '@/components/layout/page-container';
import { getLeaderboard } from '@/lib/api';
import { demoLeaderboard } from '@/lib/demo-data';

export default async function LeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const remote = await getLeaderboard(slug);
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const league = remote?.league ?? (isDemo ? { name: 'Liga Vale do Paraíba', description: 'Community league · 1v1 Random Map' } : { name: slug.replaceAll('-', ' '), description: 'Community league · 1v1 Random Map' });
  const players = remote?.leaderboard ?? (isDemo ? demoLeaderboard : []);
  return <PageContainer className="page-top"><div className="league-header"><div><span className="eyebrow">Community league</span><h1>{league.name}</h1><p>{league.description}</p><div className="league-meta"><span>{players.length} players</span><span>1v1 Random Map</span><span><Clock3 size={14} /> Synced data</span></div></div></div><LeaderboardTable players={players} /></PageContainer>;
}
