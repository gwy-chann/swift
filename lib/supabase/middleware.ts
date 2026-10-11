import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveSession, evaluateRouteAccess } from '@/lib/auth/session-guards'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  let user = null

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

      // IMPORTANT: Do not run any logic between createServerClient and
      // supabase.auth.getUser(). A simple mistake could make it hard to debug auth issues.
      const { data } = await supabase.auth.getUser()
      user = data?.user ?? null
    } catch (error) {
      console.error('Supabase middleware auth check error:', error)
    }
  }

  // Evaluate route guard rules
  const resolvedSession = resolveSession(request.cookies, user)
  const decision = evaluateRouteAccess(request.nextUrl.pathname, resolvedSession)

  if (decision.action === 'REDIRECT' && decision.destination) {
    const redirectUrl = new URL(decision.destination, request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl, {
      status: decision.statusCode || 307,
    })

    // Forward any updated cookies to the redirect response
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    }

    return redirectResponse
  }

  return supabaseResponse
}
