import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function GET() {
  const admin = await createAdminClient()

  const { data, error } = await admin
    .from('workout_blocks')
    .select('*, workout_block_exercises(*, exercise:exercises(*))')
    .order('title', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sort exercises within each block by sort_order
  const sorted = (data ?? []).map((block) => ({
    ...block,
    workout_block_exercises: (block.workout_block_exercises ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    ),
  }))

  return NextResponse.json({ data: sorted })
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
  const { exercises: exerciseEntries, ...blockData } = body

  if (!blockData.slug || !blockData.title) {
    return NextResponse.json({ error: 'slug and title are required.' }, { status: 400 })
  }

  // Insert the block
  const { data: block, error: blockError } = await admin
    .from('workout_blocks')
    .insert({
      slug: blockData.slug,
      title: blockData.title,
      summary: blockData.summary || null,
      body_part: blockData.body_part,
      goal: blockData.goal,
      duration_minutes: blockData.duration_minutes || 20,
      equipment: blockData.equipment || [],
      level: blockData.level || 'beginner',
      trainer_note: blockData.trainer_note || null,
    })
    .select()
    .single()

  if (blockError) {
    if (blockError.code === '23505') {
      return NextResponse.json({ error: 'A block with this slug already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: blockError.message }, { status: 500 })
  }

  // Insert exercise links if provided
  if (Array.isArray(exerciseEntries) && exerciseEntries.length > 0) {
    const rows = exerciseEntries.map(
      (e: { exercise_id: string; prescription: string; rest: string; note?: string }, i: number) => ({
        block_id: block.id,
        exercise_id: e.exercise_id,
        sort_order: i,
        prescription: e.prescription,
        rest: e.rest || '45 sec',
        note: e.note || null,
      })
    )

    const { error: exError } = await admin
      .from('workout_block_exercises')
      .insert(rows)

    if (exError) {
      return NextResponse.json({ error: exError.message }, { status: 500 })
    }
  }

  return NextResponse.json(block, { status: 201 })
}
