import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@tubebrew/db'

/**
 * Get Supabase environment variables
 * NEXT_PUBLIC_ variables are inlined at build time by Next.js
 */
function getEnvVars() {
  // These values are inlined at build time by Next.js
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // In development, provide helpful error message
    if (process.env.NODE_ENV === 'development') {
      const missing = []
      if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
      if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

      throw new Error(
        `Missing required Supabase environment variables: ${missing.join(', ')}\n\n` +
        `Add these to your .env.local file`
      )
    }

    // In production, this should never happen if build succeeded
    // If it does, it means the build-time inlining failed
    throw new Error('Supabase configuration is missing')
  }

  return { supabaseUrl, supabaseAnonKey }
}

/**
 * Server Components, Server Actions, Route Handlers용 Supabase 클라이언트
 * 서버 환경에서 사용
 */
export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getEnvVars()
  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
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
