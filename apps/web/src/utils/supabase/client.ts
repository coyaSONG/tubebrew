import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@tubebrew/db'

/**
 * Validate required environment variables
 */
function validateEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    throw new Error(
      `Missing required Supabase environment variables: ${missing.join(', ')}\n\n` +
      `Please add these to your Vercel project:\n` +
      `1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables\n` +
      `2. Add the following variables from your Supabase project:\n` +
      `   - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL\n` +
      `   - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous key\n` +
      `3. Redeploy your project for changes to take effect\n\n` +
      `Find these values at: https://supabase.com/dashboard/project/_/settings/api`
    )
  }

  return { supabaseUrl, supabaseAnonKey }
}

/**
 * Client Components용 Supabase 클라이언트
 * 브라우저 환경에서 사용
 */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = validateEnvVars()

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}

/**
 * Get the redirect URL for OAuth
 * Following Supabase official pattern: https://supabase.com/docs/guides/auth/redirect-urls
 */
function getRedirectUrl() {
  let url =
    process?.env?.NEXT_PUBLIC_APP_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/'

  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`

  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`

  return url
}

/**
 * YouTube API 권한을 포함한 Google OAuth 로그인
 */
export async function signInWithGoogle() {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${getRedirectUrl()}/auth/callback`,
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
