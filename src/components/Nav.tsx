'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSniffing } from '@/lib/ui/sniff';
import { classic, LabArt, noseDown } from './LabArt';

const PAGES = [
  { href: '/', label: 'Check' },
  { href: '/library', label: 'Library' },
];

export function Header() {
  const path = usePathname();
  const sniffing = useSniffing();
  return (
    <header className="head">
      <Link href="/" className="home" aria-label="CRX Sniffer home">
        {/* Both drawings share one cell so the header never shifts; the dog sniffs while a report is up. */}
        <span className="sniff">
          <LabArt art={classic} size={2} className={sniffing ? 'off' : undefined} />
          <LabArt art={noseDown} size={2} className={sniffing ? undefined : 'off'} />
        </span>
      </Link>
      <nav className="tabs" aria-label="Pages">
        {PAGES.map((p) => (
          <Link key={p.href} href={p.href} className={path === p.href ? 'tab on' : 'tab'} aria-current={path === p.href ? 'page' : undefined}>
            {p.label}
          </Link>
        ))}
      </nav>
      <div />
    </header>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Pages">
      {PAGES.map((p) => (
        <Link key={p.href} href={p.href} className={path === p.href ? 'on' : undefined} aria-current={path === p.href ? 'page' : undefined}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}

export function Foot({ extra, spaced = false }: { extra?: string; spaced?: boolean }) {
  return (
    <div className={spaced ? 'foot spaced' : 'foot'}>
      <Link href="/method">Method</Link>
      <span>rules v1</span>
      {extra ? <span>{extra}</span> : null}
    </div>
  );
}
