import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import {
  MARKETING_ASSETS_BUCKET,
  getConfiguredLogoPath,
  getResolvedLogoState,
  getSiteLogoVariantConfig,
  getSiteLogoVariants,
  normalizeSiteLogoVariant,
} from '@/lib/site-branding'

const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024
export const runtime = 'nodejs'

function revalidateBrandingPages() {
  revalidatePath('/')
  revalidatePath('/location')
  revalidatePath('/login')
  revalidatePath('/signup')
  revalidatePath('/trainer-setup')
  revalidatePath('/dashboard')
  revalidatePath('/trainer')
  revalidatePath('/admin')
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
  }

  return { admin: createServiceRoleClient() }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const singleVariant = request.nextUrl.searchParams.get('variant')

  if (singleVariant) {
    const variant = normalizeSiteLogoVariant(singleVariant)
    return NextResponse.json({
      logo: await getResolvedLogoState(variant),
    })
  }

  const logos = await Promise.all(getSiteLogoVariants().map((variant) => getResolvedLogoState(variant)))

  return NextResponse.json({ logos })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const formData = await request.formData()
  const image = formData.get('image')
  const variant = normalizeSiteLogoVariant(formData.get('variant')?.toString() ?? null)

  if (!(image instanceof File)) {
    return NextResponse.json({ error: 'A logo image file is required.' }, { status: 400 })
  }

  if (!image.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Upload a valid image file.' }, { status: 400 })
  }

  if (image.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'Logo images must be 6MB or smaller.' }, { status: 400 })
  }

  const previousPath = await getConfiguredLogoPath(variant)
  const extension = image.name.includes('.')
    ? image.name.split('.').pop()?.toLowerCase() || 'png'
    : image.type.split('/')[1] || 'png'
  const imagePath = `branding/${variant}-logo-${Date.now()}-${randomUUID()}.${extension}`
  const buffer = Buffer.from(await image.arrayBuffer())

  const uploadResult = await auth.admin.storage
    .from(MARKETING_ASSETS_BUCKET)
    .upload(imagePath, buffer, {
      contentType: image.type,
      upsert: false,
    })

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const { settingKey } = getSiteLogoVariantConfig(variant)
  const { error: settingError } = await auth.admin
    .from('settings')
    .upsert({ key: settingKey, value: imagePath }, { onConflict: 'key' })

  if (settingError) {
    await auth.admin.storage.from(MARKETING_ASSETS_BUCKET).remove([imagePath])
    return NextResponse.json({ error: settingError.message }, { status: 500 })
  }

  if (previousPath) {
    await auth.admin.storage.from(MARKETING_ASSETS_BUCKET).remove([previousPath])
  }

  revalidateBrandingPages()

  return NextResponse.json({
    logo: await getResolvedLogoState(variant),
  })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const variant = normalizeSiteLogoVariant(request.nextUrl.searchParams.get('variant'))
  const currentPath = await getConfiguredLogoPath(variant)
  const { settingKey } = getSiteLogoVariantConfig(variant)

  const { error: deleteSettingError } = await auth.admin
    .from('settings')
    .delete()
    .eq('key', settingKey)

  if (deleteSettingError) {
    return NextResponse.json({ error: deleteSettingError.message }, { status: 500 })
  }

  if (currentPath) {
    await auth.admin.storage.from(MARKETING_ASSETS_BUCKET).remove([currentPath])
  }

  revalidateBrandingPages()

  return NextResponse.json({
    logo: await getResolvedLogoState(variant),
  })
}
