import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import {
  DEFAULT_SITE_LOGO_SRC,
  MARKETING_ASSETS_BUCKET,
  SITE_LOGO_SETTING_KEY,
  getConfiguredSiteLogoPath,
  getConfiguredSiteLogoPublicUrl,
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

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const currentPath = await getConfiguredSiteLogoPath()
  const publicUrl = await getConfiguredSiteLogoPublicUrl()

  return NextResponse.json({
    logo: {
      image_path: currentPath,
      public_url: publicUrl || DEFAULT_SITE_LOGO_SRC,
      is_custom: Boolean(currentPath),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const formData = await request.formData()
  const image = formData.get('image')

  if (!(image instanceof File)) {
    return NextResponse.json({ error: 'A logo image file is required.' }, { status: 400 })
  }

  if (!image.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Upload a valid image file.' }, { status: 400 })
  }

  if (image.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'Logo images must be 6MB or smaller.' }, { status: 400 })
  }

  const previousPath = await getConfiguredSiteLogoPath()
  const extension = image.name.includes('.')
    ? image.name.split('.').pop()?.toLowerCase() || 'png'
    : image.type.split('/')[1] || 'png'
  const imagePath = `branding/site-logo-${Date.now()}-${randomUUID()}.${extension}`
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

  const { error: settingError } = await auth.admin
    .from('settings')
    .upsert({ key: SITE_LOGO_SETTING_KEY, value: imagePath }, { onConflict: 'key' })

  if (settingError) {
    await auth.admin.storage.from(MARKETING_ASSETS_BUCKET).remove([imagePath])
    return NextResponse.json({ error: settingError.message }, { status: 500 })
  }

  if (previousPath) {
    await auth.admin.storage.from(MARKETING_ASSETS_BUCKET).remove([previousPath])
  }

  revalidateBrandingPages()

  const { data } = auth.admin.storage.from(MARKETING_ASSETS_BUCKET).getPublicUrl(imagePath)
  return NextResponse.json({
    logo: {
      image_path: imagePath,
      public_url: data.publicUrl,
      is_custom: true,
    },
  })
}

export async function DELETE() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const currentPath = await getConfiguredSiteLogoPath()

  const { error: deleteSettingError } = await auth.admin
    .from('settings')
    .delete()
    .eq('key', SITE_LOGO_SETTING_KEY)

  if (deleteSettingError) {
    return NextResponse.json({ error: deleteSettingError.message }, { status: 500 })
  }

  if (currentPath) {
    await auth.admin.storage.from(MARKETING_ASSETS_BUCKET).remove([currentPath])
  }

  revalidateBrandingPages()

  return NextResponse.json({
    logo: {
      image_path: null,
      public_url: DEFAULT_SITE_LOGO_SRC,
      is_custom: false,
    },
  })
}
