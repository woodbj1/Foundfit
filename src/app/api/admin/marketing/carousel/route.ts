import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const CAROUSEL_BUCKET = 'marketing-assets'
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024
export const runtime = 'nodejs'

function revalidateMarketingPages() {
  revalidatePath('/')
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

function getPublicUrl(imagePath: string) {
  const admin = createServiceRoleClient()
  const { data } = admin.storage.from(CAROUSEL_BUCKET).getPublicUrl(imagePath)
  return data.publicUrl
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { data, error } = await auth.admin
    .from('marketing_carousel_slides')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    slides: (data ?? []).map((slide) => ({
      ...slide,
      public_url: getPublicUrl(slide.image_path),
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const formData = await request.formData()
  const image = formData.get('image')
  const altText = String(formData.get('alt_text') || '').trim()
  const eyebrow = String(formData.get('eyebrow') || '').trim()
  const caption = String(formData.get('caption') || '').trim()

  if (!(image instanceof File)) {
    return NextResponse.json({ error: 'An image file is required.' }, { status: 400 })
  }

  if (!image.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Upload a valid image file.' }, { status: 400 })
  }

  if (image.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'Images must be 8MB or smaller.' }, { status: 400 })
  }

  if (!altText || !eyebrow || !caption) {
    return NextResponse.json(
      { error: 'Alt text, eyebrow, and caption are required.' },
      { status: 400 }
    )
  }

  const extension = image.name.includes('.')
    ? image.name.split('.').pop()?.toLowerCase() || 'jpg'
    : image.type.split('/')[1] || 'jpg'
  const imagePath = `${Date.now()}-${randomUUID()}.${extension}`
  const buffer = Buffer.from(await image.arrayBuffer())

  const uploadResult = await auth.admin.storage
    .from(CAROUSEL_BUCKET)
    .upload(imagePath, buffer, {
      contentType: image.type,
      upsert: false,
    })

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const { data: sortRows } = await auth.admin
    .from('marketing_carousel_slides')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSortOrder = (sortRows?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await auth.admin
    .from('marketing_carousel_slides')
    .insert({
      image_path: imagePath,
      alt_text: altText,
      eyebrow,
      caption,
      sort_order: nextSortOrder,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) {
    await auth.admin.storage.from(CAROUSEL_BUCKET).remove([imagePath])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateMarketingPages()

  return NextResponse.json({
    slide: {
      ...data,
      public_url: getPublicUrl(data.image_path),
    },
  })
}
