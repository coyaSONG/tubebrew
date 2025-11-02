import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { videoId, source = 'tubebrew' } = await request.json();

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

    // Add to watch history (idempotent)
    const { data, error } = await supabase
      .from('watch_history')
      .insert({
        user_id: userId,
        video_id: videoId,
        source,
      })
      .select()
      .single();

    // Ignore duplicate errors (already watched)
    if (error && error.code === '23505') {
      return Response.json({
        success: true,
        data: { videoId, watchedAt: new Date().toISOString() },
      });
    }

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      data: { videoId, watchedAt: data.watched_at },
    });
  } catch (error) {
    console.error('Error marking as watched:', error);
    return Response.json(
      { error: 'Failed to mark as watched' },
      { status: 500 }
    );
  }
}
