import Link from 'next/link';
import { Shield } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { AuthForm } from '@/components/auth/auth-form';
import { normalizeInviteCode, withInvite } from '@/lib/invite-flow';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invite?: string | string[] }> }) {
  const rawInvite = (await searchParams).invite;
  const inviteCode = normalizeInviteCode(Array.isArray(rawInvite) ? rawInvite[0] : rawInvite);
  return <PageContainer className="auth-page"><div className="auth-card card"><span className="auth-mark"><Shield size={24} /></span><span className="eyebrow">{inviteCode ? 'League invitation' : 'Welcome back'}</span><h1>Sign in to AoE League</h1><p>{inviteCode ? 'Sign in, connect your Steam identity and join the invited league.' : 'Access your leagues and rating history.'}</p><AuthForm mode="login" inviteCode={inviteCode} /><small>New to AoE League? <Link href={withInvite('/register', inviteCode)}>Create an account</Link></small></div></PageContainer>;
}
