import { NextRequest, NextResponse } from 'next/server';
import { YouTubeAPI } from '@tubebrew/youtube';

/**
 * GET /api/youtube/channel-videos?channelId=xxx
 *
 * 특정 채널의 최근 영상 목록을 가져옵니다 (RSS 사용, API quota 소모 없음)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId is required' },
        { status: 400 }
      );
    }

    // YouTube API 클라이언트 생성 (API key 없이도 RSS는 사용 가능)
    const youtube = new YouTubeAPI();

    // RSS로 최근 영상 가져오기 (최대 15개 정도 반환됨)
    const videos = await youtube.getChannelVideosViaRSS(channelId);

    // 영상 제목만 추출 (최대 5개)
    const titles = videos.slice(0, 5).map(v => v.title);

    return NextResponse.json({
      success: true,
      channelId,
      titles,
      count: titles.length,
    });
  } catch (error) {
    console.error('Error fetching channel videos:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch channel videos',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
