import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { YouTubeAPI } from '@tubebrew/youtube';

/**
 * GET /api/youtube/subscriptions
 *
 * 사용자의 YouTube 구독 채널 목록을 가져옵니다.
 * - Supabase 세션에서 provider_token을 사용하여 YouTube API 호출
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 세션에서 YouTube access token 가져오기
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.provider_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'YouTube access token not found. Please re-authenticate.' },
        { status: 401 }
      );
    }

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
