import { LeaguePageContent } from '@/components/league/league-page-content';

export default async function LeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LeaguePageContent slug={slug} />;
}
