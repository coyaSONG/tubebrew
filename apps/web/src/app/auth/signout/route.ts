import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /auth/signout
 *
 * Signs out the user by clearing the Supabase session
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error);
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Redirect to home page (will redirect to signin due to auth check)
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Unexpected error during signout:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
