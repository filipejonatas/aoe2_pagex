import { Crown, Flag, Swords, Target, TrendingUp, Trophy } from 'lucide-react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { RatingCard } from '@/components/player/rating-card';
import { RatingChart } from '@/components/player/rating-chart';
import { demoLeagues, demoPlayer } from '@/lib/demo-data';
import { getPlayer, getRatingHistory } from '@/lib/api';

export default async function PlayerPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const [remote, remoteHistory] = isDemo ? [null, []] : await Promise.all([getPlayer(profileId), getRatingHistory(profileId)]);
  if (!isDemo && !remote) {
    return <PageContainer className="page-top"><div className="large-empty card"><span className="league-emblem"><Swords size={20} /></span><h2>Player not found</h2><p>This profile has not been linked to AoE League yet.</p><Link href="/players" className="button button--primary">Search players</Link></div></PageContainer>;
  }
  const player = isDemo ? { ...demoPlayer, profileId } : {
    profileId: remote!.profileId,
    nickname: remote!.nickname,
    country: remote!.country ?? '—',
    currentRating: remote!.currentRating ?? 0,
    peakRating: remote!.peakRating ?? remote!.currentRating ?? 0,
    globalRank: remote!.currentGlobalRank ?? 0,
    delta30d: remoteHistory.length > 1 && remote!.currentRating !== null && remoteHistory[0].rating !== null ? remote!.currentRating - remoteHistory[0].rating! : 0,
    wins: remote!.wins ?? 0,
    losses: remote!.losses ?? 0,
    history: remoteHistory.filter((item) => item.rating !== null).map((item) => ({ label: new Date(item.recordedAt).toLocaleDateString('en', { day: '2-digit', month: 'short' }), rating: item.rating! })),
  };
  const memberships = isDemo ? demoLeagues.slice(0, 2).map((league) => ({ ...league })) : remote!.leagueMemberships.map((membership, index) => ({ id: membership.league.id, slug: membership.league.slug, name: membership.league.name, memberCount: 0, position: index + 1 }));
  const games = player.wins + player.losses;
  const winRate = games ? Math.round((player.wins / games) * 100) : 0;
  return (
    <PageContainer className="page-top">
      <div className="player-header"><span className="player-avatar player-avatar--large">BR</span><div><div className="player-name"><h1>{player.nickname}</h1><span className="online-badge">Active</span></div><p><Flag size={14} /> Brazil <span>•</span> AoE profile {player.profileId}</p></div><button className="button button--secondary">Open AoE profile</button></div>
      <div className="rating-grid">
        <RatingCard label="Current ELO" value={player.currentRating.toLocaleString()} detail={<span className="positive">+42 in 7 days</span>} icon={<Swords size={17} />} />
        <RatingCard label="Peak ELO" value={player.peakRating.toLocaleString()} detail="Personal record" icon={<Crown size={17} />} />
        <RatingCard label="Global rank" value={`#${player.globalRank.toLocaleString()}`} detail="Top 4% worldwide" icon={<Trophy size={17} />} />
        <RatingCard label="30D change" value={`+${player.delta30d}`} detail="4.1% improvement" icon={<TrendingUp size={17} />} />
      </div>
      <div className="profile-grid">{player.history.length > 1 ? <RatingChart points={player.history} /> : <div className="chart-card card"><div className="section-heading"><div><span className="eyebrow">Performance</span><h2>Rating history</h2></div></div><div className="chart-empty">History will appear after the next rating updates.</div></div>}<aside className="record-card card"><div className="section-heading"><div><span className="eyebrow">Ranked record</span><h2>1v1 overview</h2></div><Target size={19} /></div><div className="win-rate"><strong>{winRate}%</strong><span>Win rate</span></div><div className="record-bar"><span style={{ width: `${winRate}%` }} /></div><div className="record-stats"><span><strong>{player.wins}</strong> Wins</span><span><strong>{player.losses}</strong> Losses</span></div></aside></div>
      <section className="content-section"><div className="section-heading"><div><span className="eyebrow">Community standings</span><h2>League memberships</h2></div></div>{memberships.length ? <div className="membership-list">{memberships.map((league) => <Link key={league.id} href={`/league/${league.slug}`} className="membership-row card"><span className="league-emblem"><Swords size={17} /></span><span><strong>{league.name}</strong><small>{league.memberCount ? `${league.memberCount} players` : 'Community league'}</small></span><span><small>League position</small><strong>{isDemo ? `#${league.position}` : 'View'}</strong></span></Link>)}</div> : <div className="compact-empty card">This player has not joined a league yet.</div>}</section>
    </PageContainer>
  );
}
