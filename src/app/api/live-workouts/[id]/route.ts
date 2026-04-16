import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isDailyConfigured } from '@/lib/daily'

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
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !['trainer', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Trainer or admin access required.' }, { status: 403 })
  }

  const { data: liveWorkout } = await admin
    .from('live_workouts')
    .select('*')
    .eq('id', id)
    .single()

  if (!liveWorkout) {
    return NextResponse.json({ error: 'Live workout not found.' }, { status: 404 })
  }

  const body = await request.json()
  const { status } = body

  if (!status || !['live', 'ended', 'cancelled'].includes(status)) {
    return NextResponse.json(
      { error: 'status must be one of: live, ended, cancelled' },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = { status }

  // When going live, create a Daily room if configured
  if (status === 'live' && !liveWorkout.daily_room_name && isDailyConfigured()) {
    const dailyApiKey = process.env.DAILY_API_KEY
    const dailyDomain = process.env.DAILY_DOMAIN || 'foundfit'
    const roomName = `foundfit-live-${id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 50)}`

    try {
      const response = await fetch(
        `${process.env.DAILY_API_BASE_URL || 'https://api.daily.co/v1'}/rooms`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${dailyApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: roomName,
            privacy: 'private',
            properties: {
              enable_chat: true,
              enable_prejoin_ui: true,
              start_audio_off: false,
              start_video_off: false,
            },
          }),
        }
      )

      if (response.ok) {
        updates.daily_room_name = roomName
      }
    } catch {
      // Room creation failed, continue without it
    }
  }

  const { data: updated, error } = await admin
    .from('live_workouts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
