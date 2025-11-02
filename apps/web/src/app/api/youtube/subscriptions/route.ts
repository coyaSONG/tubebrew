import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { YouTubeAPI } from '@tubebrew/youtube';
import { getValidProviderTokenByGoogleId } from '@tubebrew/db';

/**
 * GET /api/youtube/subscriptions
 *
 * 사용자의 YouTube 구독 채널 목록을 가져옵니다.
 * - 자동으로 만료된 토큰을 갱신하여 사용
 * - 최대 50개의 구독 채널 반환
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[YouTube API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[YouTube API] User authenticated:', { userId: user.id, email: user.email });

    // 2. 유효한 YouTube access token 가져오기 (자동 갱신 포함)
    const supabaseAdmin = createServiceClient();
    console.log('[YouTube API] Fetching provider token for google_id:', user.id);
    const accessToken = await getValidProviderTokenByGoogleId(supabaseAdmin, user.id);

    if (!accessToken) {
      console.error('[YouTube API] No access token returned for user:', user.id);
      return NextResponse.json(
        {
          error: 'YouTube access token expired or invalid',
          message: 'Your YouTube access has expired. Please sign out and sign in again to reconnect your YouTube account.',
          action: 'REAUTH_REQUIRED'
        },
        { status: 401 }
      );
    }

    console.log('[YouTube API] Access token retrieved successfully');

    // 3. YouTube API 클라이언트 생성
    const youtube = new YouTubeAPI(undefined, accessToken);

    // 4. 구독 채널 가져오기 (모든 채널, 페이지네이션 자동 처리)
    const channels = await youtube.getSubscribedChannels();

    // 5. 응답 반환
    return NextResponse.json({
      success: true,
      data: channels,
      count: channels.length,
    });
  } catch (error) {
    console.error('Error fetching YouTube subscriptions:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch YouTube subscriptions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
