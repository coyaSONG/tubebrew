'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Settings, Home, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from './constants';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/later', label: 'Later', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // Close menu on route change
  useEffect(() => {
    closeMenu();
  }, [pathname]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstLink = menuRef.current.querySelector('a');
      firstLink?.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={toggleMenu}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden"
          style={{ zIndex: Z_INDEX.overlay }}
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Menu */}
      <div
        ref={menuRef}
        id="mobile-navigation"
        className={`fixed top-16 left-0 bottom-0 w-[85vw] max-w-sm bg-background border-r border-border transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ zIndex: Z_INDEX.drawer }}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <nav className="p-4 space-y-2" role="navigation">
          {/* Main Navigation */}
          <div className="space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
