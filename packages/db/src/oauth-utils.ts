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

  const expirationTime = new Date(expiresAt).getTime();
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
    console.error('Error refreshing provider token:', error);
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
    // Get user's current tokens
    const { data: user, error } = await supabase
      .from('users')
      .select('provider_token, provider_refresh_token, provider_token_expires_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('Error fetching user tokens:', error);
      return null;
    }

    // Check if we have a provider token
    if (!user.provider_token) {
      console.log('User has no provider token');
      return null;
    }

    // Check if token needs refresh
    if (!shouldRefreshToken(user.provider_token_expires_at)) {
      // Token is still valid
      return user.provider_token;
    }

    // Token needs refresh
    console.log('Provider token expired or expiring soon, refreshing...');

    if (!user.provider_refresh_token) {
      console.error('No refresh token available for user');
      return null;
    }

    // Refresh the token
    const refreshed = await refreshProviderToken(user.provider_refresh_token);

    if (!refreshed) {
      console.error('Failed to refresh provider token');
      return null;
    }

    // Update user with new token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        provider_token: refreshed.accessToken,
        provider_token_expires_at: refreshed.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update refreshed token:', updateError);
      return null;
    }

    console.log('Provider token refreshed successfully');
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
    // Get user by google_id
    const { data: user, error } = await supabase
      .from('users')
      .select('id, provider_token, provider_refresh_token, provider_token_expires_at')
      .eq('google_id', googleId)
      .single();

    if (error || !user) {
      console.error('Error fetching user by google_id:', error);
      return null;
    }

    // Use the main function with user.id
    return await getValidProviderToken(supabase, user.id);
  } catch (error) {
    console.error('Error in getValidProviderTokenByGoogleId:', error);
    return null;
  }
}
