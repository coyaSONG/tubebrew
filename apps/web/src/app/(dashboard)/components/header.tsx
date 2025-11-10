import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import { MobileMenu } from './mobile-menu';
import { Navigation } from './navigation';
import { Z_INDEX } from './constants';

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header
      className="sticky top-0 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ zIndex: Z_INDEX.header }}
      role="banner"
    >
      <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo & Navigation */}
        <div className="flex items-center gap-6">
          {/* Mobile Menu Button */}
          <MobileMenu />

          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="TubeBrew Logo"
              width={32}
              height={32}
              className="w-8 h-8"
              priority
            />
            <span className="text-xl font-bold">TubeBrew</span>
          </Link>

          {/* Navigation - hidden on mobile */}
          <Navigation />
        </div>

        {/* User Menu */}
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[200px]">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
