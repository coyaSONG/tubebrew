import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/settings
 *
 * 사용자의 설정을 가져옵니다.
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

    // 2. 사용자의 내부 ID 가져오기
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('google_id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 3. 사용자 설정 가져오기 (없으면 기본값으로 생성)
    let { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userData.id)
      .single();

    // 설정이 없으면 기본값으로 생성
    if (settingsError && settingsError.code === 'PGRST116') {
      const { data: newSettings, error: createError } = await supabase
        .from('user_settings')
        .insert({
          user_id: userData.id,
          summary_level: 2,
          notification_type: 'daily',
          notification_time: '08:00:00',
          youtube_sync_enabled: true,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      settings = newSettings;
    } else if (settingsError) {
      throw settingsError;
    }

    // Ensure settings exists
    if (!settings) {
      throw new Error('Failed to retrieve or create user settings');
    }

    // 4. camelCase로 변환하여 응답
    return NextResponse.json({
      success: true,
      data: {
        userId: settings.user_id,
        summaryLevel: settings.summary_level,
        notificationType: settings.notification_type,
        notificationTime: settings.notification_time,
        youtubeSyncEnabled: settings.youtube_sync_enabled,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 *
 * 사용자의 설정을 업데이트합니다.
 */
export async function PUT(request: NextRequest) {
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

    // 2. 사용자의 내부 ID 가져오기
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('google_id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 3. 요청 body 파싱
    const body = await request.json();

    // 4. snake_case로 변환
    const updates: any = {};

    if (body.summaryLevel !== undefined) {
      // Validate summary level (1-4)
      if (body.summaryLevel < 1 || body.summaryLevel > 4) {
        return NextResponse.json(
          { error: 'Summary level must be between 1 and 4' },
          { status: 400 }
        );
      }
      updates.summary_level = body.summaryLevel;
    }

    if (body.notificationType !== undefined) {
      updates.notification_type = body.notificationType;
    }

    if (body.notificationTime !== undefined) {
      updates.notification_time = body.notificationTime;
    }

    if (body.youtubeSyncEnabled !== undefined) {
      updates.youtube_sync_enabled = body.youtubeSyncEnabled;
    }

    // 업데이트할 내용이 없으면 에러 반환
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // 5. 설정 업데이트
    updates.updated_at = new Date().toISOString();

    const { data: settings, error: updateError } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userData.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 6. camelCase로 변환하여 응답
    return NextResponse.json({
      success: true,
      data: {
        userId: settings.user_id,
        summaryLevel: settings.summary_level,
        notificationType: settings.notification_type,
        notificationTime: settings.notification_time,
        youtubeSyncEnabled: settings.youtube_sync_enabled,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to update user settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
