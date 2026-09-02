import { Crown } from 'lucide-react';

export function RankBadge({ position }: { position: number }) {
  if (position > 3) return <span className="rank-plain">{position}</span>;
  return <span className={`rank-badge rank-badge--${position}`}>{position === 1 && <Crown size={12} />}#{position}</span>;
}
