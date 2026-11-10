'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PAGES = [
  { href: '/', label: 'Check' },
  { href: '/list', label: 'List' },
  { href: '/export', label: 'Export' },
];

// The dog stays exactly as drawn.
const DOG = `      __
 (___()'\`;
 /,    /\`
 \\\\"--\\\\`;

export function Header() {
  const path = usePathname();
  return (
    <header className="band">
      <Link href="/" className="art" aria-label="CRX Sniffer home">
        {DOG}
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
