import { NextResponse } from 'next/server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  createDailyMeetingToken,
  getDailyJoinAvailability,
  isDailyConfigured,
} from '@/lib/daily'

function normalizeSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value ?? null
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

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') {
    return NextResponse.json({ error: 'Client access only.' }, { status: 403 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: liveWorkout } = await admin
    .from('live_workouts')
    .select(
      '*, trainer:trainers(id, user_id, profile:profiles!trainers_user_id_fkey(full_name, timezone))'
    )
    .eq('scheduled_date', today)
    .in('status', ['scheduled', 'live'])
    .order('scheduled_time', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!liveWorkout) {
    return NextResponse.json({
      hasLiveWorkout: false,
      message: 'No live workout scheduled for today. Check back tomorrow!',
    })
  }

  const trainer = normalizeSingle(liveWorkout.trainer)
  const trainerProfile = trainer ? normalizeSingle(trainer.profile) : null
  const trainerTimezone = trainerProfile?.timezone || 'America/New_York'

  // Build start/end times from date + time
  const startDateTime = `${liveWorkout.scheduled_date}T${liveWorkout.scheduled_time}`
  const startMs = new Date(startDateTime + (trainerTimezone === 'America/New_York' ? '-04:00' : 'Z')).getTime()
  const endMs = startMs + liveWorkout.duration_minutes * 60 * 1000
  const startTime = new Date(startMs).toISOString()
  const endTime = new Date(endMs).toISOString()

  const result: Record<string, unknown> = {
    hasLiveWorkout: true,
    liveWorkout: {
      id: liveWorkout.id,
      title: liveWorkout.title,
      description: liveWorkout.description,
      scheduledDate: liveWorkout.scheduled_date,
      scheduledTime: liveWorkout.scheduled_time,
      durationMinutes: liveWorkout.duration_minutes,
      status: liveWorkout.status,
      startTime,
      endTime,
      trainerName: trainerProfile?.full_name || 'Trainer',
      trainerTimezone,
    },
  }

  // If live and Daily is configured, provide join link
  if (liveWorkout.status === 'live' && liveWorkout.daily_room_name && isDailyConfigured()) {
    const availability = getDailyJoinAvailability(startTime, endTime)

    if (availability.canJoin) {
      try {
        const dailyDomain = process.env.DAILY_DOMAIN || 'foundfit'
        const roomUrl = `https://${dailyDomain}.daily.co/${liveWorkout.daily_room_name}`

        const token = await createDailyMeetingToken({
          roomName: liveWorkout.daily_room_name,
          userName: profile.full_name || 'Member',
          userId: user.id,
          isOwner: false,
          startTime,
          endTime,
        })

        result.joinUrl = `${roomUrl}?t=${token.token}`
      } catch {
        // Daily token creation failed, still return workout info
      }
    }

    result.joinAvailability = availability
  }

  return NextResponse.json(result)
}
