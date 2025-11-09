import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: 반드시 getUser() 호출 (세션 갱신 트리거)
  // Do not run code between createServerClient and supabase.auth.getUser()
  // DO NOT skip this for ANY route, including /auth/callback
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // Debug logging
  console.log('[Middleware]', {
    path: request.nextUrl.pathname,
    hasUser: !!user,
    userId: user?.id,
    userError: userError?.message,
    cookies: request.cookies.getAll().filter(c => c.name.includes('supabase')).map(c => ({ name: c.name, hasValue: !!c.value }))
  })

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/callback', '/auth/error']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // Redirect unauthenticated users to signin
  if (!user && !isPublicRoute) {
    console.log('[Middleware] Redirecting to signin - no user found')
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from signin page
  if (user && request.nextUrl.pathname === '/auth/signin') {
    console.log('[Middleware] Redirecting to home - user already authenticated')
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: supabaseResponse를 반드시 반환
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
