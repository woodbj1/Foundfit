import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  ADMIN_ROUTE_PREFIXES,
  CLIENT_ROUTE_PREFIXES,
  getRoleHomePath,
  isRouteInPrefixes,
  TRAINER_ROUTE_PREFIXES,
} from '@/lib/role-routing'
import type { UserRole } from '@/lib/types'

const PUBLIC_PATHS = new Set([
  '/',
  '/location',
  '/login',
  '/privacy-policy',
  '/signup',
  '/terms-of-service',
])

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) {
    return true
  }

  if (pathname.startsWith('/auth/')) {
    return true
  }

  if (pathname.startsWith('/api/webhooks/')) {
    return true
  }

  return false
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'client' || value === 'trainer' || value === 'admin'
}

function getUserRole(user: { app_metadata?: Record<string, unknown> | null; user_metadata?: Record<string, unknown> | null }): UserRole {
  const appRole = user.app_metadata?.role
  if (isUserRole(appRole)) {
    return appRole
  }

  const userRole = user.user_metadata?.role
  if (isUserRole(userRole)) {
    return userRole
  }

  return 'client'
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.delete('code')
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const role = getUserRole(user)
    const url = request.nextUrl.clone()
    url.pathname = getRoleHomePath(role)
    return NextResponse.redirect(url)
  }

  if (user) {
    const role = getUserRole(user)
    const pathname = request.nextUrl.pathname

    if (role === 'trainer' && isRouteInPrefixes(pathname, CLIENT_ROUTE_PREFIXES)) {
      const url = request.nextUrl.clone()
      url.pathname = getRoleHomePath(role)
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (role === 'client' && isRouteInPrefixes(pathname, TRAINER_ROUTE_PREFIXES)) {
      const url = request.nextUrl.clone()
      url.pathname = getRoleHomePath(role)
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (role !== 'admin' && isRouteInPrefixes(pathname, ADMIN_ROUTE_PREFIXES)) {
      const url = request.nextUrl.clone()
      url.pathname = getRoleHomePath(role)
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (role === 'admin' && isRouteInPrefixes(pathname, CLIENT_ROUTE_PREFIXES)) {
      const url = request.nextUrl.clone()
      url.pathname = getRoleHomePath(role)
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return response
}
