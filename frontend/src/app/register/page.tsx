import Link from 'next/link';
import { Shield } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata = { title: 'Create account' };

export default function RegisterPage() {
  return <PageContainer className="auth-page"><div className="auth-card card"><span className="auth-mark"><Shield size={24} /></span><span className="eyebrow">Join the community</span><h1>Create your account</h1><p>Link your AoE II profile and start competing.</p><AuthForm mode="register" /><small>Already have an account? <Link href="/login">Sign in</Link></small></div></PageContainer>;
}
