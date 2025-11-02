import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { VideoFeedClient } from './components/video-feed-client';

export default async function HomePage() {
  const supabase = await createClient();

  // 1. Check user authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (authError || !user) {
    redirect('/auth/signin');
  }

  // 2. Get user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('google_id', user.id)
    .single();

  if (userError || !userData) {
    // User record doesn't exist, redirect to onboarding
    redirect('/onboarding');
  }

  // 3. Check if user has channels set up
  const { count } = await supabase
    .from('user_channels')
    .select('channel_id', { count: 'exact' })
    .eq('user_id', userData.id)
    .eq('is_hidden', false);

  // Redirect to onboarding if no channels
  if (!count || count === 0) {
    redirect('/onboarding');
  }

  // 4. Get user settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('summary_level')
    .eq('user_id', userData.id)
    .single();

  return (
    <div className="py-6 lg:py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your personalized video feed with AI summaries
        </p>
      </div>

      <VideoFeedClient
        userId={userData.id}
        defaultSummaryLevel={(settings?.summary_level as 1 | 2 | 3 | 4 | undefined) || 2}
      />
    </div>
  );
}
