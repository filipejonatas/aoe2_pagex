'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type SessionUser } from '@/store/auth-store';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';
      const response = await fetch(`${baseUrl}/auth/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string | string[] };
        throw new Error(Array.isArray(body.message) ? body.message[0] : body.message ?? 'Could not sign in');
      }
      const body = await response.json() as { accessToken: string; user: SessionUser };
      if (!setSession(body.accessToken, body.user)) throw new Error('The server returned an invalid session.');
      router.push(mode === 'register' ? '/onboarding/aoe' : '/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit}>
      {mode === 'register' && <label>Username<input name="username" type="text" minLength={3} required placeholder="Your username" /></label>}
      <label>Email<input name="email" type="email" required placeholder="you@example.com" /></label>
      <label>Password<input name="password" type="password" minLength={mode === 'register' ? 8 : undefined} required placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button--primary" type="submit" disabled={loading}>{loading ? 'Please wait...' : mode === 'register' ? 'Create account' : 'Sign in'}</button>
    </form>
  );
}
