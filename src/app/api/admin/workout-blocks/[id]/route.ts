import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // Update block fields
  if (Object.keys(blockData).length > 0) {
    const { error } = await admin
      .from('workout_blocks')
      .update(blockData)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Replace exercise links if provided
  if (Array.isArray(exerciseEntries)) {
    // Delete old links
    await admin.from('workout_block_exercises').delete().eq('block_id', id)

    if (exerciseEntries.length > 0) {
      const rows = exerciseEntries.map(
        (e: { exercise_id: string; prescription: string; rest: string; note?: string }, i: number) => ({
          block_id: id,
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
  }

  // Return updated block with exercises
  const { data } = await admin
    .from('workout_blocks')
    .select('*, workout_block_exercises(*, exercise:exercises(*))')
    .eq('id', id)
    .single()

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const { error } = await admin.from('workout_blocks').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
