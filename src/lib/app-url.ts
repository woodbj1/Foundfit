import { SITE } from '@/lib/site-config'

function normalizeOrigin(origin: string | null | undefined) {
  if (!origin) return null

  return origin.replace(/\/$/, '')
}

export function getAppUrl(request?: Request) {
  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')

    if (forwardedHost) {
      return normalizeOrigin(`${forwardedProto || 'https'}://${forwardedHost}`) || SITE.url
    }

    return normalizeOrigin(new URL(request.url).origin) || SITE.url
  }

  return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) || SITE.url
}

export function getAppUrlForPath(path: string, request?: Request) {
  return new URL(path, getAppUrl(request)).toString()
}
