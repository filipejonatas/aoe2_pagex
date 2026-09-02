import { Search } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { PlayerSearch } from '@/components/player/player-search';

export const metadata = { title: 'Players' };

export default function PlayersPage() {
  return <PageContainer className="narrow-page page-top"><div className="center-title"><span className="round-icon"><Search size={21} /></span><span className="eyebrow">Official AoE II profiles</span><h1>Find a player</h1><p>Search by nickname to view rating, history and league positions.</p></div><PlayerSearch /><div className="search-tip card"><strong>Search tip</strong><p>Use the player&apos;s exact in-game nickname for the most accurate results.</p></div></PageContainer>;
}
