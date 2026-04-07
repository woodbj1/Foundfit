import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTrainerCalendarBusySlots } from '@/lib/google-calendar'
import { addDays, addMinutes, areIntervalsOverlapping, format } from 'date-fns'
import { sortScheduleRules } from '@/lib/trainer-schedule'
import type { TrainerScheduleRule } from '@/lib/types'
import {
  getCurrentDateInTimeZone,
  getDayOfWeekFromDateString,
  getUtcRangeForDateInTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/timezone'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')
  const trainerId = searchParams.get('trainer_id')
  const serviceId = searchParams.get('service_id')

  if (!dateStr) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dayOfWeek = getDayOfWeekFromDateString(dateStr)

  const { data: bookingWindowSetting } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['default_duration', 'booking_window_days'])

  const defaultDurationSetting = bookingWindowSetting?.find((setting) => setting.key === 'default_duration')
  const bookingWindowDaysSetting = bookingWindowSetting?.find((setting) => setting.key === 'booking_window_days')

  const bookingWindowDays = Math.max(parseInt(bookingWindowDaysSetting?.value || '14', 10) || 14, 1)
  const currentBookingDate = getCurrentDateInTimeZone('America/New_York')
  const lastBookableDate = format(
    addDays(new Date(`${currentBookingDate}T00:00:00Z`), bookingWindowDays - 1),
    'yyyy-MM-dd'
  )

  if (dateStr < currentBookingDate || dateStr > lastBookableDate) {
    return NextResponse.json({ slots: [] })
  }

  // Get default duration from settings
  let duration = parseInt(defaultDurationSetting?.value || '50', 10)

  if (serviceId) {
    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .eq('is_active', true)
      .single()

    if (service?.duration_minutes) {
      duration = service.duration_minutes
    }
  }

  // Find a trainer. If one isn't specified, use the first active trainer.
  let targetTrainerId = trainerId
  if (!targetTrainerId) {
    const { data: firstTrainer } = await supabase
      .from('trainers')
      .select('id')
      .eq('is_active', true)
      .not('onboarding_completed_at', 'is', null)
      .limit(1)
      .single()
    if (!firstTrainer) {
      return NextResponse.json({ slots: [] })
    }
    targetTrainerId = firstTrainer.id
  }

  if (!targetTrainerId) {
    return NextResponse.json({ slots: [] })
  }

  const { data: targetTrainer } = await supabase
    .from('trainers')
    .select('id, onboarding_completed_at, profile:profiles!trainers_user_id_fkey(timezone)')
    .eq('id', targetTrainerId)
    .maybeSingle()

  if (!targetTrainer?.onboarding_completed_at) {
    return NextResponse.json({ slots: [], trainer_id: targetTrainerId })
  }

  const trainerProfile = Array.isArray(targetTrainer.profile)
    ? targetTrainer.profile[0]
    : targetTrainer.profile
  const trainerTimezone = trainerProfile?.timezone || 'America/New_York'

  const { data: scheduleRulesData, error: scheduleRulesError } = await supabase
    .from('trainer_schedule_rules')
    .select('day_of_week, start_time, end_time, rule_type')
    .eq('trainer_id', targetTrainerId)
    .eq('day_of_week', dayOfWeek)
    .order('start_time')

  let scheduleRules = (scheduleRulesData as TrainerScheduleRule[] | null) ?? []

  if (scheduleRulesError || scheduleRules.length === 0) {
    const { data: legacyBlocks } = await supabase
      .from('availability_blocks')
      .select('day_of_week, start_time, end_time')
      .eq('trainer_id', targetTrainerId)
      .eq('day_of_week', dayOfWeek)
      .order('start_time')

    scheduleRules = ((legacyBlocks ?? []).map((block) => ({
      ...block,
      trainer_id: targetTrainerId,
      id: `legacy-${block.day_of_week}-${block.start_time}-${block.end_time}`,
      rule_type: 'work_hours',
      label: null,
    })) as TrainerScheduleRule[])
  }

  const workHours = sortScheduleRules(
    scheduleRules.filter((rule) => rule.rule_type === 'work_hours')
  )
  const blockedTimes = sortScheduleRules(
    scheduleRules.filter((rule) => rule.rule_type === 'blocked')
  )

  if (workHours.length === 0) {
    return NextResponse.json({ slots: [] })
  }

  // Get existing bookings for this day
  const { start: dayStart, end: dayEnd } = getUtcRangeForDateInTimeZone(dateStr, trainerTimezone)

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('trainer_id', targetTrainerId)
    .in('status', ['pending', 'approved'])
    .gte('start_time', dayStart.toISOString())
    .lt('start_time', dayEnd.toISOString())

  // Get Google Calendar busy slots
  let gcalBusy: { start: string; end: string }[] = []
  try {
    gcalBusy = await getTrainerCalendarBusySlots(dateStr, targetTrainerId, trainerTimezone)
  } catch (error) {
    console.error('Google Calendar error (continuing without):', error)
  }

  // Generate available slots
  const allSlots: { start: string; end: string }[] = []

  for (const workHoursRule of workHours) {
    const [startH, startM] = workHoursRule.start_time.split(':').map(Number)
    const [endH, endM] = workHoursRule.end_time.split(':').map(Number)

    let slotStart = zonedDateTimeToUtc(
      dateStr,
      `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
      trainerTimezone
    )

    const blockEnd = zonedDateTimeToUtc(
      dateStr,
      `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
      trainerTimezone
    )

    // Don't show past slots for today
    const now = new Date()
    if (slotStart < now && dateStr === getCurrentDateInTimeZone(trainerTimezone)) {
      // Move slot start to next available time after now
      while (slotStart < now) {
        slotStart = addMinutes(slotStart, duration)
      }
    }

    while (addMinutes(slotStart, duration) <= blockEnd) {
      const slotEnd = addMinutes(slotStart, duration)
      const slotInterval = { start: slotStart, end: slotEnd }

      // Check against existing bookings
      const conflictsWithBooking = existingBookings?.some((booking) =>
        areIntervalsOverlapping(slotInterval, {
          start: new Date(booking.start_time),
          end: new Date(booking.end_time),
        })
      )

      // Check against Google Calendar
      const conflictsWithGcal = gcalBusy.some((busy) =>
        areIntervalsOverlapping(slotInterval, {
          start: new Date(busy.start),
          end: new Date(busy.end),
        })
      )

      const conflictsWithBlockedTime = blockedTimes.some((blockedRule) =>
        areIntervalsOverlapping(slotInterval, {
          start: zonedDateTimeToUtc(dateStr, blockedRule.start_time, trainerTimezone),
          end: zonedDateTimeToUtc(dateStr, blockedRule.end_time, trainerTimezone),
        })
      )

      if (!conflictsWithBooking && !conflictsWithGcal && !conflictsWithBlockedTime) {
        allSlots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        })
      }

      slotStart = addMinutes(slotStart, duration)
    }
  }

  return NextResponse.json({ slots: allSlots, trainer_id: targetTrainerId })
}
