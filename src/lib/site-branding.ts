import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/server'

export const MARKETING_ASSETS_BUCKET = 'marketing-assets'

const SITE_LOGO_VARIANT_CONFIG = {
  header: {
    settingKey: 'header_logo_path',
    defaultSrc: '/brand/site-logo-header.png',
    label: 'Main Page Header',
    description: 'Used in the public homepage and marketing-page headers.',
    previewBackground: 'light',
  },
  site: {
    settingKey: 'site_logo_path',
    defaultSrc: '/brand/site-logo-vertical.png',
    label: 'Other Pages',
    description: 'Used on login, signup, trainer setup, dashboards, and footer.',
    previewBackground: 'light',
  },
  email: {
    settingKey: 'email_logo_path',
    defaultSrc: '/brand/email-logo-white.png',
    label: 'Email',
    description: 'Used in branded client, trainer, and auth emails.',
    previewBackground: 'dark',
  },
} as const

export type SiteLogoVariant = keyof typeof SITE_LOGO_VARIANT_CONFIG

export const DEFAULT_SITE_LOGO_SRC = SITE_LOGO_VARIANT_CONFIG.site.defaultSrc
export const SITE_LOGO_SETTING_KEY = SITE_LOGO_VARIANT_CONFIG.site.settingKey

function getPublicAssetUrl(imagePath: string) {
  const admin = createServiceRoleClient()
  const { data } = admin.storage.from(MARKETING_ASSETS_BUCKET).getPublicUrl(imagePath)
  return data.publicUrl
}

export function isSiteLogoVariant(value: unknown): value is SiteLogoVariant {
  return value === 'header' || value === 'site' || value === 'email'
}

export function normalizeSiteLogoVariant(value?: string | null): SiteLogoVariant {
  return isSiteLogoVariant(value) ? value : 'site'
}

export function getSiteLogoVariantConfig(variant: SiteLogoVariant) {
  return SITE_LOGO_VARIANT_CONFIG[variant]
}

export function getSiteLogoVariants(): SiteLogoVariant[] {
  return ['header', 'site', 'email']
}

async function getSettingValue(key: string) {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (error) {
    throw error
  }

  const value = data?.value?.trim()
  return value ? value : null
}

export async function getConfiguredLogoPath(variant: SiteLogoVariant) {
  return getSettingValue(getSiteLogoVariantConfig(variant).settingKey)
}

export async function getConfiguredSiteLogoPath() {
  return getConfiguredLogoPath('site')
}

export async function getConfiguredLogoPublicUrl(variant: SiteLogoVariant) {
  const imagePath = await getConfiguredLogoPath(variant)

  if (!imagePath) {
    return null
  }

  return getPublicAssetUrl(imagePath)
}

export async function getConfiguredSiteLogoPublicUrl() {
  return getConfiguredLogoPublicUrl('site')
}

export async function getResolvedLogoState(variant: SiteLogoVariant) {
  const config = getSiteLogoVariantConfig(variant)
  const imagePath = await getConfiguredLogoPath(variant)
  const publicUrl = imagePath ? getPublicAssetUrl(imagePath) : config.defaultSrc

  return {
    variant,
    label: config.label,
    description: config.description,
    preview_background: config.previewBackground,
    image_path: imagePath,
    public_url: publicUrl,
    is_custom: Boolean(imagePath),
    default_src: config.defaultSrc,
  }
}
