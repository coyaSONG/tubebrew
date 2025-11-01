import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();

  // 1. 사용자 인증 확인 (getUser()는 서버에서 검증)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // 로그인하지 않은 경우 로그인 페이지로
  if (authError || !user) {
    redirect('/auth/signin');
  }

  // 2. 사용자 정보 조회
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('google_id', user.id)
    .single();

  if (userError || !userData) {
    // 사용자 레코드가 없으면 온보딩으로
    redirect('/onboarding');
  }

  // 3. 채널 설정 여부 확인
  const { data: userChannels, count } = await supabase
    .from('user_channels')
    .select('channel_id', { count: 'exact' })
    .eq('user_id', userData.id);

  // 채널이 없으면 온보딩으로
  if (!count || count === 0) {
    redirect('/onboarding');
  }

  // 4. 메인 대시보드 렌더링 (임시)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-4xl font-bold mb-4">TubeBrew</h1>
        <p className="text-lg text-muted-foreground mb-8">
          환영합니다! 채널 설정이 완료되었습니다.
        </p>
        <p className="text-sm text-muted-foreground">
          대시보드 UI는 곧 구현될 예정입니다.
        </p>
        <div className="mt-8">
          <p className="text-sm">
            설정된 채널 수: <strong>{count}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
