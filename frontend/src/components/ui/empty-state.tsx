import { ShieldOff } from 'lucide-react';
import Link from 'next/link';

export function EmptyState({ title = 'No players in this league yet.', body = 'Invite players to build your community ranking.' }: { title?: string; body?: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><ShieldOff size={22} /></span>
      <h3>{title}</h3><p>{body}</p>
      <Link href="/leagues" className="button button--secondary">View leagues</Link>
    </div>
  );
}
