import { PageContainer } from '@/components/layout/page-container';
import { LeaguesManager } from '@/components/league/leagues-manager';

export const metadata = { title: 'Leagues' };

export default function LeaguesPage() {
  return (
    <PageContainer className="page-top">
      <LeaguesManager />
    </PageContainer>
  );
}
