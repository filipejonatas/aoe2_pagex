'use client';

import { Search, ShieldCheck, Swords, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { RatingCard } from '@/components/player/rating-card';
import { useAuthStore, type SessionUser } from '@/store/auth-store';

export function DashboardContent() {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const getValidToken = useAuthStore((state) => state.getValidToken);
  const logout = useAuthStore((state) => state.logout);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!hydrated) return;
    const token = getValidToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';
    fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (response.status === 401) {
          logout();
          router.replace('/login');
          return null;
        }
        if (!response.ok) throw new Error('Could not load account');
        return response.json() as Promise<SessionUser>;
      })
      .then((body) => {
        if (body) {
          setUser(body);
          setStatus('ready');
        }
      })
      .catch(() => setStatus('error'));
  }, [getValidToken, hydrated, logout, router, setUser]);

  if (status === 'loading') {
    return <PageContainer className="page-top"><div className="large-empty card"><h2>Loading your profile...</h2><p>Checking your Steam identity and AoE II data.</p></div></PageContainer>;
  }
  if (status === 'error' || !user) {
    return <PageContainer className="page-top"><div className="large-empty card"><h2>Profile unavailable</h2><p>We could not load your account right now.</p><button className="button button--primary" onClick={() => window.location.reload()}>Try again</button></div></PageContainer>;
  }

  const player = user.aoePlayer;
  return <PageContainer className="page-top">
    <div className="page-title"><div><span className="eyebrow">Player dashboard</span><h1>Welcome back, {player?.nickname ?? user.username}</h1><p>Your competitive snapshot across every community.</p></div><Link className="button button--secondary" href="/players"><Search size={16} /> Search players</Link></div>
    {player ? <>
      <div className="rating-grid rating-grid--dashboard">
        <RatingCard label="Current ELO" value={player.currentRating?.toLocaleString() ?? 'Unranked'} detail="1v1 Random Map" icon={<Swords size={17} />} />
        <RatingCard label="Team ELO" value={player.teamRating?.toLocaleString() ?? '-'} detail={player.teamGlobalRank ? `#${player.teamGlobalRank.toLocaleString()} worldwide` : 'Team Random Map'} icon={<Users size={17} />} />
        <RatingCard label="Global rank" value={player.currentGlobalRank && player.currentGlobalRank > 0 ? `#${player.currentGlobalRank.toLocaleString()}` : '-'} detail={player.country ? player.country.toUpperCase() : 'Worldwide'} icon={<Trophy size={17} />} />
        <RatingCard label="Record" value={`${player.wins ?? 0}–${player.losses ?? 0}`} detail={`${player.games ?? 0} rated games`} icon={<Users size={17} />} />
      </div>
      <section className="content-section"><div className="section-heading"><div><span className="eyebrow">Verified profile</span><h2>{player.nickname}</h2></div><Link href={`/player/${player.profileId}`} className="button button--primary">View full profile</Link></div></section>
    </> : <div className="large-empty card"><span className="league-emblem"><ShieldCheck size={20} /></span><h2>{user.steamVerifiedAt ? 'Steam verified — finish linking' : 'Link your player profile'}</h2><p>{user.steamVerifiedAt ? 'Your Steam identity is safe. Resolve and attach your AoE II profile to continue.' : 'Connect your Steam account to unlock ratings and leagues.'}</p><Link href="/onboarding/aoe" className="button button--primary">{user.steamVerifiedAt ? 'Resolve AoE profile' : 'Verify with Steam'}</Link></div>}
  </PageContainer>;
}
