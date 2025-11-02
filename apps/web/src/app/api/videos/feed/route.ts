import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const includeWatched = searchParams.get('includeWatched') === 'true';

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('google_id', user.id)
      .single();

    if (!userData) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userData.id;

    // Get user's channels
    const { data: userChannels } = await supabase
      .from('user_channels')
      .select('channel_id')
      .eq('user_id', userId)
      .eq('is_hidden', false);

    if (!userChannels || userChannels.length === 0) {
      return Response.json({
        success: true,
        data: {
          videos: [],
          pagination: {
            page,
            limit,
            total: 0,
            hasMore: false,
          },
        },
      });
    }

    const channelIds = userChannels.map((uc) => uc.channel_id);

    // Build videos query
    let videosQuery = supabase
      .from('videos')
      .select(
        `
        *,
        channel:channels(*),
        summaries(*)
      `,
        { count: 'exact' }
      )
      .in('channel_id', channelIds);

    // Apply category filter if provided
    if (category) {
      // We need to filter by channel category
      const { data: filteredChannels } = await supabase
        .from('channels')
        .select('id')
        .eq('category', category)
        .in('id', channelIds);

      if (filteredChannels && filteredChannels.length > 0) {
        const filteredChannelIds = filteredChannels.map((c) => c.id);
        videosQuery = videosQuery.in('channel_id', filteredChannelIds);
      } else {
        // No channels match the category
        return Response.json({
          success: true,
          data: {
            videos: [],
            pagination: {
              page,
              limit,
              total: 0,
              hasMore: false,
            },
          },
        });
      }
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        videosQuery = videosQuery.order('published_at', { ascending: true });
        break;
      case 'views':
        videosQuery = videosQuery.order('view_count', { ascending: false });
        break;
      case 'duration':
        videosQuery = videosQuery.order('duration', { ascending: true });
        break;
      default: // newest
        videosQuery = videosQuery.order('published_at', { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    videosQuery = videosQuery.range(from, to);

    const { data: videos, error: videosError, count } = await videosQuery;

    if (videosError) {
      throw videosError;
    }

    // Get bookmarks for these videos
    const videoIds = videos?.map((v) => v.id) || [];
    const { data: bookmarks } = await supabase
      .from('bookmarks')
      .select('video_id')
      .eq('user_id', userId)
      .in('video_id', videoIds);

    const bookmarkedIds = new Set(bookmarks?.map((b) => b.video_id) || []);

    // Get watch history
    const { data: watchHistory } = await supabase
      .from('watch_history')
      .select('video_id')
      .eq('user_id', userId)
      .in('video_id', videoIds);

    const watchedIds = new Set(watchHistory?.map((w) => w.video_id) || []);

    // Get user settings for default summary level
    const { data: settings } = await supabase
      .from('user_settings')
      .select('summary_level')
      .eq('user_id', userId)
      .single();

    // Enrich videos with user-specific data
    const enrichedVideos = videos?.map((video) => ({
      ...video,
      isBookmarked: bookmarkedIds.has(video.id),
      isWatched: watchedIds.has(video.id),
      userSummaryLevel: settings?.summary_level || 2,
    }));

    // Filter out watched videos if needed
    const filteredVideos = includeWatched
      ? enrichedVideos
      : enrichedVideos?.filter((v) => !v.isWatched);

    return Response.json({
      success: true,
      data: {
        videos: filteredVideos,
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: (count || 0) > to + 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching video feed:', error);
    return Response.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}
