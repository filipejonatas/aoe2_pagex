import type { Metadata } from 'next';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'AoE League — Community Rankings', template: '%s — AoE League' },
  description: 'Compare your AoE II rating, join community leagues and track your progress.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="background-pattern" /><Header /><main>{children}</main><Footer /></body></html>;
}
