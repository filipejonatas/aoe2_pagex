import {
  ArrowRight,
  BarChart3,
  Clock3,
  Globe2,
  ShieldCheck,
  Swords,
  Trophy,
  UserRoundSearch,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import { PageContainer } from '@/components/layout/page-container';
import { PlayerSearch } from '@/components/player/player-search';
import { getCommunityLeaderboard } from '@/lib/api';

export const metadata = { title: 'Community Rankings' };

function formatUpdate(value?: string | null) {
  if (!value) return 'Awaiting the next official sync';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Official cache available';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(date);
}

export default async function Home() {
  const [brazil, global] = await Promise.all([
    getCommunityLeaderboard({ leaderboardId: 3, country: 'BR', limit: 10 }),
    getCommunityLeaderboard({ leaderboardId: 3, limit: 10 }),
  ]);
  const brazilLeaders = brazil?.top ?? [];
  const globalPlayers = global?.players.slice(0, 5) ?? [];
  const globalLeader = global?.top[0] ?? globalPlayers[0];
  const brazilLeader = brazilLeaders[0];
  const updatedAt = global?.updatedAt ?? brazil?.updatedAt;

  return (
    <PageContainer className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <div className="hero-kicker"><Swords size={15} /> The AoE II ladder, closer to home</div>
          <h1>Know your rank.<br /><em>Build your league.</em></h1>
          <p>Find any player, compare official ratings and create a private leaderboard for your own Age of Empires II community.</p>
          <PlayerSearch />
          <div className="hero-meta">
            <span><span className="status-dot" /> Official ladder data</span>
            <span><Clock3 size={13} /> {formatUpdate(updatedAt)}</span>
          </div>
        </div>

        <aside className="live-ladder card" aria-labelledby="live-ladder-title">
          <div className="live-ladder__heading">
            <div><span className="eyebrow">Current official ladder</span><h2 id="live-ladder-title">Brazil top 3</h2></div>
            <span className="live-badge"><span className="status-dot" /> Synced</span>
          </div>
          {brazilLeaders.length ? (
            <div className="live-ladder__players">
              {brazilLeaders.map((player) => (
                <Link href={`/player/${player.profileId}`} className="live-player" key={player.profileId}>
                  <span className={`live-player__rank live-player__rank--${player.position}`}>#{player.position}</span>
                  <span className="country-flag">{player.country ?? 'BR'}</span>
                  <span className="live-player__name"><strong>{player.nickname}</strong><small>Global #{player.globalRank?.toLocaleString() ?? '—'}</small></span>
                  <strong className="live-player__rating">{player.rating?.toLocaleString() ?? '—'} <small>Elo</small></strong>
                </Link>
              ))}
            </div>
          ) : <p className="live-ladder__empty">Official rankings are temporarily unavailable.</p>}
          <Link href="/leaderboard?ladder=1v1&scope=country&country=BR" className="live-ladder__link">Explore Brazil ranking <ArrowRight size={15} /></Link>
        </aside>
      </section>

      <section className="home-facts" aria-label="Current ladder highlights">
        <div><Trophy size={19} /><span><small>Brazil #1</small><strong>{brazilLeader ? `${brazilLeader.nickname} · ${brazilLeader.rating?.toLocaleString() ?? '—'} Elo` : 'Sync unavailable'}</strong></span></div>
        <div><Globe2 size={19} /><span><small>World #1</small><strong>{globalLeader ? `${globalLeader.nickname} · ${globalLeader.rating?.toLocaleString() ?? '—'} Elo` : 'Sync unavailable'}</strong></span></div>
        <div><BarChart3 size={19} /><span><small>Ranking coverage</small><strong>{global?.countries.length ? `${global.countries.length} countries in the current cache` : 'Official 1v1 ladder'}</strong></span></div>
      </section>

      <section className="home-ranking content-section">
        <div className="section-heading">
          <div><span className="eyebrow">Official 1v1 Random Map</span><h2>Leading the world right now</h2></div>
          <Link href="/leaderboard?ladder=1v1&scope=global" className="text-link">Full ranking <ArrowRight size={15} /></Link>
        </div>
        {globalPlayers.length ? <LeaderboardTable players={globalPlayers} showFilters={false} recordMode /> : (
          <div className="home-data-error card"><Globe2 size={22} /><div><strong>The official ranking is reconnecting.</strong><span>Player search and the full leaderboard remain available to retry.</span></div></div>
        )}
      </section>

      <section className="home-paths content-section">
        <div className="section-heading"><div><span className="eyebrow">Start here</span><h2>Turn ratings into a community</h2></div></div>
        <div className="home-path-grid">
          <Link href="/players" className="home-path-card card">
            <span className="home-path-card__icon"><UserRoundSearch size={21} /></span>
            <span className="home-path-card__number">01</span>
            <h3>Find your profile</h3>
            <p>Search by nickname and open your official 1v1 and team rating record.</p>
            <span className="text-link">Search players <ArrowRight size={15} /></span>
          </Link>
          <Link href="/leaderboard" className="home-path-card card">
            <span className="home-path-card__icon"><ShieldCheck size={21} /></span>
            <span className="home-path-card__number">02</span>
            <h3>Read the ladder</h3>
            <p>Compare Brazilian and global players across both competitive modes.</p>
            <span className="text-link">Open ranking <ArrowRight size={15} /></span>
          </Link>
          <Link href="/leagues" className="home-path-card card">
            <span className="home-path-card__icon"><Users size={21} /></span>
            <span className="home-path-card__number">03</span>
            <h3>Create your league</h3>
            <p>Bring friends together with an invite and get a ranking made for your group.</p>
            <span className="text-link">Manage leagues <ArrowRight size={15} /></span>
          </Link>
        </div>
      </section>

      <section className="home-cta card">
        <div><span className="eyebrow">Your profile, your history</span><h2>Link your AoE II account and make every match count.</h2><p>Keep your current rating, personal records and league positions in one place.</p></div>
        <div className="home-cta__actions"><Link href="/register" className="button button--primary">Create free account <ArrowRight size={15} /></Link><Link href="/login" className="button button--ghost">Sign in</Link></div>
      </section>
    </PageContainer>
  );
}
