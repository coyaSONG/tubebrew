import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(
        new URL('/auth/error?error=callback_error', requestUrl.origin)
      );
    }

    // Save provider tokens to users table
    if (data.session && data.user) {
      const { provider_token, provider_refresh_token } = data.session;

      if (provider_token) {
        const supabaseAdmin = createServiceClient();

        // Update user with provider tokens
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            provider_token,
            provider_refresh_token,
            provider_token_expires_at: new Date(Date.now() + 3600 * 1000), // 1 hour from now
            updated_at: new Date().toISOString(),
          })
          .eq('google_id', data.user.id);

        if (updateError) {
          console.error('Failed to save provider token:', updateError);
        }
      }
    }
  }

  // Redirect to the app or the page the user was trying to access
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
