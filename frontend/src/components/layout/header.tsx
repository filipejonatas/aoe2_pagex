'use client';

import { Menu, Search, Shield, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/leagues', label: 'Leagues' },
  { href: '/players', label: 'Players' },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="AoE League home">
          <span className="brand__mark"><Shield size={19} strokeWidth={1.8} /></span>
          <span className="brand__name">AoE <em>League</em></span>
        </Link>
        <nav className={`main-nav ${open ? 'main-nav--open' : ''}`} aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={link.href} className={pathname.startsWith(link.href) ? 'active' : ''} onClick={() => setOpen(false)}>{link.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link href="/players" className="icon-button" aria-label="Search players"><Search size={18} /></Link>
          <Link href="/login" className="user-link"><UserRound size={17} /><span>Sign in</span></Link>
          <button className="mobile-menu" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
      </div>
    </header>
  );
}
