import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/server'

export const MARKETING_ASSETS_BUCKET = 'marketing-assets'
export const SITE_LOGO_SETTING_KEY = 'site_logo_path'
export const DEFAULT_SITE_LOGO_SRC = '/brand/site-logo-vertical.png'

function getPublicAssetUrl(imagePath: string) {
  const admin = createServiceRoleClient()
  const { data } = admin.storage.from(MARKETING_ASSETS_BUCKET).getPublicUrl(imagePath)
  return data.publicUrl
}

export async function getConfiguredSiteLogoPath() {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('settings')
    .select('value')
    .eq('key', SITE_LOGO_SETTING_KEY)
    .maybeSingle()

  if (error) {
    throw error
  }

  const value = data?.value?.trim()
  return value ? value : null
}

export async function getConfiguredSiteLogoPublicUrl() {
  const imagePath = await getConfiguredSiteLogoPath()

  if (!imagePath) {
    return null
  }

  return getPublicAssetUrl(imagePath)
}
