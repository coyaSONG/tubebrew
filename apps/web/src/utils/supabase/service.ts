import { createClient } from '@supabase/supabase-js';
import { Database } from '@tubebrew/db';

/**
 * Service Role 클라이언트 (RLS 우회)
 * 서버 사이드 API에서만 사용
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
