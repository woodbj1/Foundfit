import { NextRequest, NextResponse } from 'next/server'

import {
  getConfiguredLogoPublicUrl,
  getSiteLogoVariantConfig,
  normalizeSiteLogoVariant,
} from '@/lib/site-branding'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const variant = normalizeSiteLogoVariant(request.nextUrl.searchParams.get('variant'))
  const { defaultSrc } = getSiteLogoVariantConfig(variant)

  try {
    const customLogoUrl = await getConfiguredLogoPublicUrl(variant)
    const target = customLogoUrl || new URL(defaultSrc, request.url).toString()
    const response = NextResponse.redirect(target)
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  } catch (error) {
    console.error('[GET /api/public/branding/logo]', error)
    const response = NextResponse.redirect(new URL(defaultSrc, request.url))
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return response
  }
}
