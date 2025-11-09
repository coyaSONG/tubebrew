'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bookmark, Settings, Clock } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    { href: '/history', label: 'History', icon: Clock },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Navigation */}
      <nav>
        <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Menu</h3>
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Quick Actions */}
      <div className="pt-4 border-t border-border">
        <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Quick Actions</h3>
        <div className="space-y-2 text-sm">
          <button className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Refresh Feed
          </button>
          <button className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Manage Channels
          </button>
        </div>
      </div>
    </div>
  );
}
