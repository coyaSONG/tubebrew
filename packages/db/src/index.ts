// Database client and utilities
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client-side Supabase client (with Row Level Security)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (bypasses RLS)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

/**
 * Database utility functions
 */

export class DBUtils {
  private client: SupabaseClient<Database>;

  constructor(client?: SupabaseClient<Database>) {
    this.client = client || supabase;
  }

  /**
   * Get or create user by Google ID
   */
  async getOrCreateUser(googleId: string, email: string, name?: string, avatarUrl?: string) {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await this.client
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const { data: newUser, error: createError } = await this.client
      .from('users')
      .insert({
        google_id: googleId,
        email,
        name: name || null,
        avatar_url: avatarUrl || null,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    // Create default user settings
    if (newUser) {
      await this.client.from('user_settings').insert({
        user_id: newUser.id,
        summary_level: 2,
        notification_type: 'daily',
        notification_time: '08:00:00',
        youtube_sync_enabled: true,
      });
    }

    return newUser;
  }

  /**
   * Get user's subscribed channels with custom settings
   */
  async getUserChannels(userId: string) {
    const { data, error } = await this.client
      .from('user_channels')
      .select(`
        *,
        channel:channels (*)
      `)
      .eq('user_id', userId)
      .eq('is_hidden', false);

    if (error) {
      throw new Error(`Failed to fetch user channels: ${error.message}`);
    }

    return data;
  }

  /**
   * Get recent videos from user's subscribed channels
   */
  async getRecentVideos(userId: string, limit: number = 50) {
    const { data, error } = await this.client
      .from('videos')
      .select(`
        *,
        channel:channels (*),
        summaries (*)
      `)
      .in(
        'channel_id',
        this.client
          .from('user_channels')
          .select('channel_id')
          .eq('user_id', userId)
          .eq('is_hidden', false)
      )
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent videos: ${error.message}`);
    }

    return data;
  }

  /**
   * Get video with summaries
   */
  async getVideoWithSummaries(videoId: string) {
    const { data, error } = await this.client
      .from('videos')
      .select(`
        *,
        channel:channels (*),
        summaries (*),
        transcripts (*)
      `)
      .eq('id', videoId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch video: ${error.message}`);
    }

    return data;
  }

  /**
   * Add video to bookmarks
   */
  async addBookmark(userId: string, videoId: string, priority: number = 1) {
    const { data, error } = await this.client
      .from('bookmarks')
      .insert({
        user_id: userId,
        video_id: videoId,
        priority,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add bookmark: ${error.message}`);
    }

    return data;
  }

  /**
   * Remove video from bookmarks
   */
  async removeBookmark(userId: string, videoId: string) {
    const { error } = await this.client
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('video_id', videoId);

    if (error) {
      throw new Error(`Failed to remove bookmark: ${error.message}`);
    }
  }

  /**
   * Get user's bookmarks
   */
  async getUserBookmarks(userId: string) {
    const { data, error } = await this.client
      .from('bookmarks')
      .select(`
        *,
        video:videos (
          *,
          channel:channels (*),
          summaries (*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    }

    return data;
  }

  /**
   * Mark video as watched
   */
  async markAsWatched(userId: string, videoId: string, source: 'tubebrew' | 'youtube' = 'tubebrew') {
    const { data, error } = await this.client
      .from('watch_history')
      .insert({
        user_id: userId,
        video_id: videoId,
        source,
      })
      .select()
      .single();

    if (error) {
      // Ignore duplicate errors (already watched)
      if (error.code === '23505') {
        return null;
      }
      throw new Error(`Failed to mark as watched: ${error.message}`);
    }

    return data;
  }

  /**
   * Check if video is watched
   */
  async isVideoWatched(userId: string, videoId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('watch_history')
      .select('video_id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single();

    return !!data && !error;
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId: string) {
    const { data, error } = await this.client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch user settings: ${error.message}`);
    }

    return data;
  }

  /**
   * Update user settings
   */
  async updateUserSettings(userId: string, settings: Partial<Database['public']['Tables']['user_settings']['Update']>) {
    const { data, error } = await this.client
      .from('user_settings')
      .update(settings)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user settings: ${error.message}`);
    }

    return data;
  }
}

// Export singleton instance
export const db = new DBUtils();

// Export database types and utilities
export * from './types';
