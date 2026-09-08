import { ShieldCheck } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { LinkPlayer } from '@/components/player/link-player';
import { normalizeInviteCode } from '@/lib/invite-flow';

export const metadata = { title: 'Link AoE profile' };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ invite?: string | string[] }> }) {
  const rawInvite = (await searchParams).invite;
  const inviteCode = normalizeInviteCode(Array.isArray(rawInvite) ? rawInvite[0] : rawInvite);
  return <PageContainer className="narrow-page page-top"><div className="center-title"><span className="round-icon"><ShieldCheck size={22} /></span><span className="eyebrow">{inviteCode ? 'League invitation · Step 2 of 2' : 'Step 1 of 1'}</span><h1>Link your AoE II profile</h1><p>{inviteCode ? 'Verify the Steam account that owns your AoE II profile. We will join the league automatically.' : 'Your official 1v1 rating will become the source of truth in every league.'}</p></div><LinkPlayer inviteCode={inviteCode} /></PageContainer>;
}
