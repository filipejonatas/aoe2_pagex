'use client';

import { Menu, Search, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';

const links = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/leagues', label: 'Leagues' },
  { href: '/players', label: 'Players' },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hydrated = useAuthStore((state) => state.hydrated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="AoE League home">
          <span className="brand__name">AoE <em>League</em></span>
        </Link>
        <nav className={`main-nav ${open ? 'main-nav--open' : ''}`} aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={link.href} className={pathname.startsWith(link.href) ? 'active' : ''} onClick={() => setOpen(false)}>{link.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link href="/players" className="icon-button" aria-label="Search players"><Search size={18} /></Link>
          <Link href={hydrated && token ? '/dashboard' : '/login'} className="user-link"><UserRound size={17} /><span>{hydrated && token ? user?.aoePlayer?.nickname ?? user?.username ?? 'Profile' : 'Sign in'}</span></Link>
          <button className="mobile-menu" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
      </div>
    </header>
  );
}
