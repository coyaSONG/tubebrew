import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AIService } from '@tubebrew/ai';

export interface ClassifyChannelRequest {
  channelId: string;
  title: string;
  description: string;
  recentVideoTitles: string[];
}

/**
 * POST /api/channels/classify
 *
 * AI를 사용하여 채널을 카테고리로 분류합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 요청 데이터 파싱
    const body = (await request.json()) as ClassifyChannelRequest;
    const { title, description, recentVideoTitles } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Channel title is required' },
        { status: 400 }
      );
    }

    // 3. AI 서비스로 분류
    const ai = new AIService();
    const category = await ai.classifyChannel(
      title,
      description || '',
      recentVideoTitles || []
    );

    // 4. 응답 반환
    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Error classifying channel:', error);

    return NextResponse.json(
      {
        error: 'Failed to classify channel',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
