import type { UserRole } from '@/lib/types'

export const CLIENT_ROUTE_PREFIXES = [
  '/dashboard',
  '/account',
  '/book',
  '/sessions',
  '/meal-plans',
  '/library',
]

export const TRAINER_ROUTE_PREFIXES = [
  '/trainer',
]

export const ADMIN_ROUTE_PREFIXES = [
  '/admin',
]

export function getRoleHomePath(role: UserRole) {
  switch (role) {
    case 'trainer':
      return '/trainer'
    case 'admin':
      return '/admin'
    default:
      return '/dashboard'
  }
}

export function isRouteInPrefixes(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

