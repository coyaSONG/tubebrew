'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export interface SaveChannelsRequest {
  channels: Array<{
    youtubeId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    category?: string;
    customCategory?: string;
    isHidden?: boolean;
  }>;
}

/**
 * Server Action: Save user channels after onboarding
 */
export async function saveChannels(data: SaveChannelsRequest) {
  const supabase = await createClient();
  const supabaseService = createServiceClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // 2. 사용자 ID 조회 (없으면 생성)
  let userData = await supabaseService
    .from('users')
    .select('id')
    .eq('google_id', user.id)
    .single();

  // 사용자가 없으면 생성
  if (userData.error || !userData.data) {
    const { data: newUser, error: createError } = await supabaseService
      .from('users')
      .insert({
        google_id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.email,
        avatar_url: user.user_metadata?.avatar_url || null,
      })
      .select('id')
      .single();

    if (createError || !newUser) {
      throw new Error('Failed to create user');
    }

    userData = { data: newUser, error: null };
  }

  const userId = userData.data!.id;

  // 3. 요청 데이터 검증
  const { channels } = data;

  if (!channels || channels.length === 0) {
    throw new Error('No channels provided');
  }

  // 4. 채널 저장 (upsert)
  const channelsToInsert = channels.map((ch) => ({
    youtube_id: ch.youtubeId,
    title: ch.title,
    description: ch.description || null,
    thumbnail_url: ch.thumbnailUrl || null,
    category: ch.category || null,
  }));

  const { data: insertedChannels, error: channelError } = await supabaseService
    .from('channels')
    .upsert(channelsToInsert, {
      onConflict: 'youtube_id',
      ignoreDuplicates: false,
    })
    .select('id, youtube_id');

  if (channelError) {
    throw channelError;
  }

  // 5. user_channels 관계 저장
  const userChannels = channels.map((ch) => {
    const channelId = insertedChannels?.find(
      (ic) => ic.youtube_id === ch.youtubeId
    )?.id;

    return {
      user_id: userId,
      channel_id: channelId,
      custom_category: ch.customCategory || null,
      is_hidden: ch.isHidden || false,
      notification_enabled: !ch.isHidden,
    };
  });

  const { error: userChannelError } = await supabaseService
    .from('user_channels')
    .upsert(userChannels, {
      onConflict: 'user_id,channel_id',
      ignoreDuplicates: false,
    });

  if (userChannelError) {
    throw userChannelError;
  }

  // 6. 캐시 무효화 및 리다이렉션
  revalidatePath('/', 'layout');
  redirect('/');
}
