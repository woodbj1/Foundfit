import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function GET() {
  const admin = await createAdminClient()

  const { data, error } = await admin
    .from('exercises')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  const body = await request.json()
  const {
    slug,
    name,
    body_parts = [],
    goals = [],
    equipment = [],
    summary = '',
    setup = '',
    how_to = [],
    coaching_cues = [],
    common_mistakes = [],
    demo_video_url = null,
    demo_video_storage_path = null,
  } = body

  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name are required.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('exercises')
    .insert({
      slug,
      name,
      body_parts,
      goals,
      equipment,
      summary,
      setup,
      how_to,
      coaching_cues,
      common_mistakes,
      demo_video_url,
      demo_video_storage_path,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'An exercise with this slug already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
