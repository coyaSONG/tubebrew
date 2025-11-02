import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-full items-center justify-between px-4">
        {/* Logo & Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            TubeBrew
          </Link>

          {/* Navigation - hidden on mobile */}
          <nav className="hidden md:flex gap-4">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/later"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Later
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Settings
            </Link>
          </nav>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
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
      </div>
    </header>
  );
}
