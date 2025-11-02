import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { videoId, action, priority = 1 } = await request.json();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (action === 'add') {
      // Add bookmark
      const { error } = await supabase.from('bookmarks').insert({
        user_id: userId,
        video_id: videoId,
        priority,
      });

      if (error && error.code !== '23505') {
        // Ignore duplicate errors
        throw error;
      }

      return Response.json({
        success: true,
        data: { videoId, isBookmarked: true },
      });
    } else {
      // Remove bookmark
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('video_id', videoId);

      if (error) {
        throw error;
      }

      return Response.json({
        success: true,
        data: { videoId, isBookmarked: false },
      });
    }
  } catch (error) {
    console.error('Error managing bookmark:', error);
    return Response.json(
      { error: 'Failed to update bookmark' },
      { status: 500 }
    );
  }
}
