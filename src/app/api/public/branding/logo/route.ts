import { NextRequest, NextResponse } from 'next/server'

import {
  DEFAULT_SITE_LOGO_SRC,
  getConfiguredSiteLogoPublicUrl,
} from '@/lib/site-branding'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const customLogoUrl = await getConfiguredSiteLogoPublicUrl()
    const target = customLogoUrl || new URL(DEFAULT_SITE_LOGO_SRC, request.url).toString()
    const response = NextResponse.redirect(target)
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('[GET /api/public/branding/logo]', error)
    const response = NextResponse.redirect(new URL(DEFAULT_SITE_LOGO_SRC, request.url))
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  }
}
