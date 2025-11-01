import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@tubebrew/db'

/**
 * Client Components용 Supabase 클라이언트
 * 브라우저 환경에서 사용
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * YouTube API 권한을 포함한 Google OAuth 로그인
 */
export async function signInWithGoogle() {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      scopes: 'openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl',
    },
  })

  if (error) {
    console.error('Sign in error:', error)
    throw error
  }

  return data
}

/**
 * 로그아웃
 */
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

/**
 * 현재 세션 가져오기 (Client-side)
 */
export async function getSession() {
  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error('Get session error:', error)
    return null
  }

  return session
}

/**
 * YouTube API에 사용할 access token 가져오기
 */
export async function getYouTubeToken() {
  const session = await getSession()

  if (!session?.provider_token) {
    throw new Error('No YouTube access token available')
  }

  return session.provider_token
}

/**
 * 현재 로그인한 사용자 정보 (Client-side)
 */
export async function getCurrentUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Get user error:', error)
    return null
  }

  return user
}
