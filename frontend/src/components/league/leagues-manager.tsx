'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Plus, TicketCheck, X } from 'lucide-react';
import Link from 'next/link';
import { LeagueCard } from '@/components/league/league-card';
import { demoLeagues } from '@/lib/demo-data';
import type { LeagueSummary } from '@/types';

type Action = 'create' | 'join' | null;

type ApiLeague = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  inviteCode?: string;
  _count?: { members: number };
};

type ApiError = { message?: string | string[] };

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';

function messageFrom(body: ApiError, fallback: string) {
  return Array.isArray(body.message) ? body.message[0] : body.message ?? fallback;
}

function toSummary(league: ApiLeague): LeagueSummary {
  return {
    id: league.id,
    slug: league.slug,
    name: league.name,
    description: league.description ?? 'Community league',
    memberCount: league._count?.members ?? 1,
    position: null,
    rating: null,
  };
}

export function LeaguesManager() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [action, setAction] = useState<Action>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ text: string; href?: string } | null>(null);
  const [authenticated, setAuthenticated] = useState(true);

  const loadLeagues = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      setLeagues(demoLeagues);
      setLoading(false);
      return [] as ApiLeague[];
    }

    const token = localStorage.getItem('aoe-league-token');
    if (!token) {
      setAuthenticated(false);
      setLoading(false);
      return [] as ApiLeague[];
    }

    try {
      const response = await fetch(`${baseUrl}/leagues`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (response.status === 401) {
        localStorage.removeItem('aoe-league-token');
        setAuthenticated(false);
        return [] as ApiLeague[];
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as ApiError;
        throw new Error(messageFrom(body, 'Could not load your leagues.'));
      }
      const body = await response.json() as ApiLeague[];
      setAuthenticated(true);
      setLeagues(body.map(toSummary));
      return body;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your leagues.');
      return [] as ApiLeague[];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadLeagues(); }, [loadLeagues]);

  function openAction(next: Exclude<Action, null>) {
    setAction(next);
    setError('');
    setNotice(null);
  }

  async function createLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice(null);
    const token = localStorage.getItem('aoe-league-token');
    if (!token) { setAuthenticated(false); return; }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch(`${baseUrl}/leagues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.get('name'),
          description: form.get('description') || undefined,
          visibility: form.get('visibility'),
        }),
      });
      const body = await response.json().catch(() => ({})) as ApiLeague & ApiError;
      if (response.status === 401) {
        localStorage.removeItem('aoe-league-token');
        setAuthenticated(false);
        throw new Error('Your session expired. Sign in again.');
      }
      if (!response.ok) throw new Error(messageFrom(body, 'Could not create the league.'));
      await loadLeagues();
      setAction(null);
      setNotice({ text: `League created. Invite code: ${body.inviteCode ?? 'unavailable'}`, href: `/league/${body.slug}` });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the league.');
    } finally { setSubmitting(false); }
  }

  async function joinLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice(null);
    const token = localStorage.getItem('aoe-league-token');
    if (!token) { setAuthenticated(false); return; }

    const form = new FormData(event.currentTarget);
    const leagueId = String(form.get('leagueId') ?? '').trim();
    const inviteCode = String(form.get('inviteCode') ?? '').trim();
    setSubmitting(true);
    try {
      const response = await fetch(`${baseUrl}/leagues/${encodeURIComponent(leagueId)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode }),
      });
      const body = await response.json().catch(() => ({})) as ApiError;
      if (response.status === 401) {
        localStorage.removeItem('aoe-league-token');
        setAuthenticated(false);
        throw new Error('Your session expired. Sign in again.');
      }
      if (!response.ok) throw new Error(messageFrom(body, 'Could not join the league.'));
      const updated = await loadLeagues();
      const joined = updated.find((league) => league.id === leagueId);
      setAction(null);
      setNotice({ text: 'You joined the league successfully.', href: joined ? `/league/${joined.slug}` : undefined });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not join the league.');
    } finally { setSubmitting(false); }
  }

  return (
    <>
      <div className="page-title">
        <div><span className="eyebrow">Your communities</span><h1>My leagues</h1><p>Private and public rankings built around the players you know.</p></div>
        <div className="page-actions">
          <button className="button button--secondary" onClick={() => openAction('join')}><TicketCheck size={16} /> Join with code</button>
          <button className="button button--primary" onClick={() => openAction('create')}><Plus size={16} /> Create league</button>
        </div>
      </div>

      {!authenticated && <div className="league-feedback card"><p>Sign in and link your AoE profile before creating or joining a league.</p><Link href="/login" className="button button--primary">Sign in</Link></div>}

      {action && authenticated && (
        <section className="league-action-panel card" aria-labelledby={`${action}-league-title`}>
          <div className="league-action-panel__heading">
            <div><span className="eyebrow">{action === 'create' ? 'New community' : 'Invitation'}</span><h2 id={`${action}-league-title`}>{action === 'create' ? 'Create a league' : 'Join a league'}</h2></div>
            <button className="icon-button" type="button" aria-label="Close form" onClick={() => setAction(null)}><X size={18} /></button>
          </div>
          {action === 'create' ? (
            <form className="league-action-form" onSubmit={createLeague}>
              <label>League name<input name="name" minLength={3} maxLength={80} required placeholder="Liga dos Amigos" /></label>
              <label className="league-action-form__wide">Description<textarea name="description" maxLength={280} rows={3} placeholder="What brings this community together?" /></label>
              <label>Visibility<select name="visibility" defaultValue="PRIVATE"><option value="PRIVATE">Private</option><option value="PUBLIC">Public</option></select></label>
              <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create league'}</button>
            </form>
          ) : (
            <form className="league-action-form" onSubmit={joinLeague}>
              <p className="form-help">The current API requires both values from the league owner.</p>
              <label>League ID<input name="leagueId" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
              <label>Invite code<input name="inviteCode" minLength={6} required autoCapitalize="characters" placeholder="Invitation code" /></label>
              <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Joining...' : 'Join league'}</button>
            </form>
          )}
        </section>
      )}

      {error && <p className="league-alert league-alert--error" role="alert">{error}</p>}
      {notice && <div className="league-alert league-alert--success" role="status"><CheckCircle2 size={17} /><span>{notice.text}</span>{notice.href && <Link href={notice.href}>View league</Link>}</div>}

      {loading ? <div className="large-empty card"><p>Loading your leagues...</p></div> : leagues.length ? (
        <div className="league-grid">{leagues.map((league) => <LeagueCard key={league.id} league={league} />)}<button className="new-league-card" onClick={() => openAction('create')}><Plus size={20} /><strong>Create a new league</strong><span>Bring your community together.</span></button></div>
      ) : (
        <div className="large-empty card"><span className="league-emblem"><Plus size={21} /></span><h2>Your league hall is empty</h2><p>Create a league or join one with an invite code.</p><button className="button button--primary" onClick={() => openAction('create')}>Create league</button></div>
      )}
    </>
  );
}
