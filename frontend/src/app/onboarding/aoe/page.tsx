import { ShieldCheck } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { LinkPlayer } from '@/components/player/link-player';

export const metadata = { title: 'Link AoE profile' };

export default function OnboardingPage() {
  return <PageContainer className="narrow-page page-top"><div className="center-title"><span className="round-icon"><ShieldCheck size={22} /></span><span className="eyebrow">Step 1 of 1</span><h1>Link your AoE II profile</h1><p>Your official 1v1 rating will become the source of truth in every league.</p></div><LinkPlayer /></PageContainer>;
}
