import { NextRequest, NextResponse } from 'next/server';
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
 * POST /api/channels/save
 *
 * 온보딩 시 선택한 채널들을 DB에 저장합니다.
 * - channels 테이블에 채널 정보 저장 (upsert)
 * - user_channels 테이블에 사용자-채널 관계 저장
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseService = createServiceClient();

    // 1. 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 사용자 ID 조회 (없으면 생성)
    let userData = await supabaseService
      .from('users')
      .select('id')
      .eq('google_id', user.id)
      .single();

    // 사용자가 없으면 생성 (Service Role로 RLS 우회)
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
        console.error('User creation error:', createError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }

      userData = { data: newUser, error: null, count: null, status: 200, statusText: 'OK' };
    }

    const userId = userData.data!.id;

    // 3. 요청 데이터 파싱
    const body = (await request.json()) as SaveChannelsRequest;
    const { channels } = body;

    if (!channels || channels.length === 0) {
      return NextResponse.json(
        { error: 'No channels provided' },
        { status: 400 }
      );
    }

    // 4. 채널 저장 (upsert) - Service Role로 RLS 우회
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
      console.error('Channel upsert error:', channelError);
      throw channelError;
    }

    // 5. user_channels 관계 저장 - Service Role로 RLS 우회
    const userChannels = channels
      .map((ch) => {
        const channelId = insertedChannels?.find(
          (ic) => ic.youtube_id === ch.youtubeId
        )?.id;

        if (!channelId) return null;

        return {
          user_id: userId,
          channel_id: channelId,
          custom_category: ch.customCategory || null,
          is_hidden: ch.isHidden || false,
          notification_enabled: !ch.isHidden,
        };
      })
      .filter((uc): uc is NonNullable<typeof uc> => uc !== null);

    const { error: userChannelError } = await supabaseService
      .from('user_channels')
      .upsert(userChannels, {
        onConflict: 'user_id,channel_id',
        ignoreDuplicates: false,
      });

    if (userChannelError) {
      console.error('User channels upsert error:', userChannelError);
      throw userChannelError;
    }

    // 6. 응답 반환
    return NextResponse.json({
      success: true,
      message: 'Channels saved successfully',
      count: channels.length,
    });
  } catch (error) {
    console.error('Error saving channels:', error);

    return NextResponse.json(
      {
        error: 'Failed to save channels',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
