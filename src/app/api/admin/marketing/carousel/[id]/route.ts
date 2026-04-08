import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const CAROUSEL_BUCKET = 'marketing-assets'
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const altText = String(body.alt_text || '').trim()
  const eyebrow = String(body.eyebrow || '').trim()
  const caption = String(body.caption || '').trim()
  const sortOrder = Number.parseInt(String(body.sort_order ?? '0'), 10)
  const isActive = Boolean(body.is_active)

  if (!altText || !eyebrow || !caption) {
    return NextResponse.json(
      { error: 'Alt text, eyebrow, and caption are required.' },
      { status: 400 }
    )
  }

  if (!Number.isFinite(sortOrder)) {
    return NextResponse.json({ error: 'Sort order must be a number.' }, { status: 400 })
  }

  const { data, error } = await auth.admin
    .from('marketing_carousel_slides')
    .update({
      alt_text: altText,
      eyebrow,
      caption,
      sort_order: sortOrder,
      is_active: isActive,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params

  const { data: existing, error: fetchError } = await auth.admin
    .from('marketing_carousel_slides')
    .select('id, image_path')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 })
  }

  const { error } = await auth.admin
    .from('marketing_carousel_slides')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await auth.admin.storage.from(CAROUSEL_BUCKET).remove([existing.image_path])
  revalidateMarketingPages()

  return NextResponse.json({ success: true })
}
