import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { DBUtils } from '@tubebrew/db';

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
      hasSession: !!data.session,
      hasProviderToken: !!data.session?.provider_token,
      hasProviderRefreshToken: !!data.session?.provider_refresh_token,
    });

    // Save provider tokens to users table for worker access
    if (data.user && data.session?.provider_token) {
      try {
        const db = new DBUtils(supabase);

        // Get or create user
        const googleId = data.user.user_metadata?.sub || data.user.id;
        const user = await db.getOrCreateUser(
          googleId,
          data.user.email!,
          data.user.user_metadata?.name,
          data.user.user_metadata?.avatar_url
        );

        // Calculate token expiration (Google tokens typically expire in 1 hour)
        const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

        // Update with provider tokens
        const { error: updateError } = await supabase
          .from('users')
          .update({
            provider_token: data.session.provider_token,
            provider_refresh_token: data.session.provider_refresh_token || null,
            provider_token_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('[Callback] Failed to save provider tokens:', updateError);
        } else {
          console.log('[Callback] ✅ Provider tokens saved to database');
        }
      } catch (err) {
        console.error('[Callback] Error saving provider tokens:', err);
      }
    }
  }

  // URL to redirect to after sign in process completes
  console.log('[Callback] Redirecting to:', next);
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
