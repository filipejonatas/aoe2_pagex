import { Clock3 } from 'lucide-react';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import { PageContainer } from '@/components/layout/page-container';
import { demoLeaderboard } from '@/lib/demo-data';

export const metadata = { title: 'Leaderboard' };

export default function LeaderboardPage() {
  const players = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? demoLeaderboard : [];
  return <PageContainer className="page-top"><div className="page-title"><div><span className="eyebrow">Competitive ladder</span><h1>Community leaderboard</h1><p>The strongest players across public AoE League communities.</p></div><span className="sync-status"><Clock3 size={15} /> Cached official ratings</span></div><LeaderboardTable players={players} /></PageContainer>;
}
