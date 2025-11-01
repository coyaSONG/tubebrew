import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@tubebrew/db'

/**
 * Server Components, Server Actions, Route Handlers용 Supabase 클라이언트
 * 서버 환경에서 사용
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 쿠키를 set할 수 없음
            // Middleware에서 처리됨
          }
        },
      },
    }
  )
}
