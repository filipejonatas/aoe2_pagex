import Link from 'next/link';
import { Shield } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return <PageContainer className="auth-page"><div className="auth-card card"><span className="auth-mark"><Shield size={24} /></span><span className="eyebrow">Welcome back</span><h1>Sign in to AoE League</h1><p>Access your leagues and rating history.</p><AuthForm mode="login" /><small>New to AoE League? <Link href="/register">Create an account</Link></small></div></PageContainer>;
}
