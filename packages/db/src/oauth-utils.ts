/**
 * OAuth Token Management Utilities
 * Handles YouTube API access token refresh using Google OAuth 2.0
 */

import { google } from 'googleapis';
import type { SupabaseClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

// Buffer time before expiration to trigger refresh (5 minutes)
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Checks if a token needs to be refreshed
 */
export function shouldRefreshToken(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true; // No expiration time means we should refresh
  }

  // IMPORTANT: Database stores timestamp without timezone, so we must append 'Z' to treat it as UTC
  // Otherwise JavaScript interprets it as local time (KST), causing 8-hour offset
  const expiresAtUTC = expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z';
  const expirationTime = new Date(expiresAtUTC).getTime();
  const now = Date.now();

  // Refresh if token expires in less than 5 minutes
  return (expirationTime - now) < REFRESH_BUFFER_MS;
}

/**
 * Refreshes an OAuth token using the refresh token
 */
export async function refreshProviderToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  expiresAt: string;
} | null> {
  try {
    // NOTE: redirect_uri is NOT needed for token refresh
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );

    // Set the refresh token
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token || !credentials.expiry_date) {
      console.error('Failed to refresh token: missing credentials');
      return null;
    }

    return {
      accessToken: credentials.access_token,
      expiresAt: new Date(credentials.expiry_date).toISOString(),
    };
  } catch (error) {
    console.error('❌ [OAuth] Error refreshing provider token:', error);
    if (error instanceof Error) {
      console.error('❌ [OAuth] Error name:', error.name);
      console.error('❌ [OAuth] Error message:', error.message);
      console.error('❌ [OAuth] Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Gets a valid provider token for a user, refreshing if necessary
 */
export async function getValidProviderToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    console.log('[OAuth] Getting token for user_id:', userId);

    // Get user's current tokens
    const { data: user, error } = await supabase
      .from('users')
      .select('provider_token, provider_refresh_token, provider_token_expires_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[OAuth] Error fetching user tokens:', error);
      return null;
    }

    if (!user) {
      console.error('[OAuth] No user found with id:', userId);
      return null;
    }

    // Log token status for debugging
    const needsRefresh = shouldRefreshToken(user.provider_token_expires_at);
    console.log('[OAuth] Token needs refresh:', needsRefresh, '| Expires at:', user.provider_token_expires_at);

    // Check if we have a provider token
    if (!user.provider_token) {
      console.error('❌ [OAuth] RETURN PATH: No provider token');
      return null;
    }

    // Check if token needs refresh
    if (!shouldRefreshToken(user.provider_token_expires_at)) {
      // Token is still valid
      console.log('✅ [OAuth] RETURN PATH: Token valid, returning existing');
      return user.provider_token;
    }

    // Token needs refresh
    console.log('🔄 [OAuth] Token expired/expiring, starting refresh...');

    if (!user.provider_refresh_token) {
      console.error('❌ [OAuth] RETURN PATH: No refresh token');
      return null;
    }

    // Refresh the token
    console.log('🔄 [OAuth] Calling refreshProviderToken...');

    // Check if Google OAuth credentials are configured
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('❌ [OAuth] Google OAuth credentials not configured');
      console.error('❌ [OAuth] Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env');
      console.error('❌ [OAuth] User needs to re-authenticate');
      return null;
    }

    const refreshed = await refreshProviderToken(user.provider_refresh_token);

    if (!refreshed) {
      console.error('❌ [OAuth] RETURN PATH: Refresh failed - user needs to re-authenticate');
      return null;
    }

    // Update user with new token
    console.log('💾 [OAuth] Updating database with refreshed token...');
    const { error: updateError } = await supabase
      .from('users')
      .update({
        provider_token: refreshed.accessToken,
        provider_token_expires_at: refreshed.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ [OAuth] RETURN PATH: DB update failed:', updateError);
      return null;
    }

    console.log('✅ [OAuth] RETURN PATH: Success! Token refreshed and saved');
    return refreshed.accessToken;
  } catch (error) {
    console.error('Error in getValidProviderToken:', error);
    return null;
  }
}

/**
 * Gets a valid provider token by google_id (for Supabase auth user)
 */
export async function getValidProviderTokenByGoogleId(
  supabase: SupabaseClient,
  googleId: string
): Promise<string | null> {
  try {
    console.log('[OAuth] Looking up user by google_id:', googleId);

    // Get user by google_id
    const { data: user, error } = await supabase
      .from('users')
      .select('id, provider_token, provider_refresh_token, provider_token_expires_at')
      .eq('google_id', googleId)
      .single();

    if (error) {
      console.error('[OAuth] Error fetching user by google_id:', error);
      return null;
    }

    if (!user) {
      console.error('[OAuth] No user found with google_id:', googleId);
      return null;
    }

    console.log('[OAuth] User found:', {
      userId: user.id,
      hasToken: !!user.provider_token,
      hasRefreshToken: !!user.provider_refresh_token,
      expiresAt: user.provider_token_expires_at
    });

    // Use the main function with user.id
    return await getValidProviderToken(supabase, user.id);
  } catch (error) {
    console.error('[OAuth] Error in getValidProviderTokenByGoogleId:', error);
    return null;
  }
}
