import Link from 'next/link';
import { Shield } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { AuthForm } from '@/components/auth/auth-form';
import { normalizeInviteCode, withInvite } from '@/lib/invite-flow';

export const metadata = { title: 'Create account' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ invite?: string | string[] }> }) {
  const rawInvite = (await searchParams).invite;
  const inviteCode = normalizeInviteCode(Array.isArray(rawInvite) ? rawInvite[0] : rawInvite);
  return <PageContainer className="auth-page"><div className="auth-card card"><span className="auth-mark"><Shield size={24} /></span><span className="eyebrow">{inviteCode ? 'League invitation' : 'Join the community'}</span><h1>Create your account</h1><p>{inviteCode ? 'Create your account, verify with Steam and we will add you to the invited league.' : 'Link your AoE II profile and start competing.'}</p><AuthForm mode="register" inviteCode={inviteCode} /><small>Already have an account? <Link href={withInvite('/login', inviteCode)}>Sign in</Link></small></div></PageContainer>;
}
