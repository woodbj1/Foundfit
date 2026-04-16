import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createDailyRoomForBooking, isDailyConfigured } from '@/lib/daily'

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
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['trainer', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Trainer or admin access required.' }, { status: 403 })
  }

  const { data: trainer } = await admin
    .from('trainers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!trainer) {
    return NextResponse.json({ error: 'Trainer profile not found.' }, { status: 404 })
  }

  const body = await request.json()
  const {
    title = 'Daily Live Workout',
    description,
    scheduled_date,
    scheduled_time = '09:00',
    duration_minutes = 60,
  } = body

  if (!scheduled_date) {
    return NextResponse.json({ error: 'scheduled_date is required.' }, { status: 400 })
  }

  const { data: liveWorkout, error } = await admin
    .from('live_workouts')
    .insert({
      trainer_id: trainer.id,
      title,
      description: description || null,
      scheduled_date,
      scheduled_time,
      duration_minutes,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A live workout is already scheduled for this date.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(liveWorkout, { status: 201 })
}

export async function GET() {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: liveWorkouts } = await admin
    .from('live_workouts')
    .select(
      '*, trainer:trainers(id, profile:profiles!trainers_user_id_fkey(full_name))'
    )
    .gte('scheduled_date', new Date().toISOString().slice(0, 10))
    .neq('status', 'cancelled')
    .order('scheduled_date', { ascending: true })
    .limit(14)

  return NextResponse.json({ data: liveWorkouts ?? [] })
}
