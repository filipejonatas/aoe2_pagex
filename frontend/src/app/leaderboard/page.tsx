import { Clock3 } from 'lucide-react';
import { CommunityLeaderboard } from '@/components/leaderboard/community-leaderboard';
import { PageContainer } from '@/components/layout/page-container';

export const metadata = { title: 'Brazil & Global Rankings' };

export default function LeaderboardPage() {
  return <PageContainer className="page-top">
    <div className="page-title">
      <div><span className="eyebrow">Official competitive ladder</span><h1>Brazil &amp; Global Rankings</h1><p>Top AoE II players by current official rating, with Brazil selected by default.</p></div>
      <span className="sync-status"><Clock3 size={15} /> Cached official ratings</span>
    </div>
    <CommunityLeaderboard />
  </PageContainer>;
}
