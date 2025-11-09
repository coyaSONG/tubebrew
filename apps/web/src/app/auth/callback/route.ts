import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  console.log('[Callback] Starting OAuth callback', {
    hasCode: !!code,
    next,
    cookies: request.cookies.getAll().filter(c => c.name.includes('supabase')).map(c => c.name)
  });

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Callback] Exchange code error:', error);
      return NextResponse.redirect(
        new URL('/auth/signin?error=callback_error', requestUrl.origin)
      );
    }

    console.log('[Callback] Session exchanged successfully', {
      userId: data.user?.id,
      hasSession: !!data.session
    });
  }

  // URL to redirect to after sign in process completes
  console.log('[Callback] Redirecting to:', next);
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
