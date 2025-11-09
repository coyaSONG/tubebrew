'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/later', label: 'Later' },
  { href: '/settings', label: 'Settings' },
] as const;

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex gap-4" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors ${
              isActive
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
