import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { sortScheduleRules } from '@/lib/trainer-schedule'
import type { TrainerScheduleRule } from '@/lib/types'

type RouteSupabase = Awaited<ReturnType<typeof createClient>>

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected server error'
}

function normalizeRules(
  rules: ReadonlyArray<Partial<TrainerScheduleRule>> | null | undefined,
  trainerId: string
): TrainerScheduleRule[] {
  return sortScheduleRules(
    (rules ?? []).map((rule) => ({
      id: rule.id || `temp-${Math.random().toString(36).slice(2, 8)}`,
      trainer_id: trainerId,
      day_of_week: Number(rule.day_of_week) as TrainerScheduleRule['day_of_week'],
      start_time: String(rule.start_time || ''),
      end_time: String(rule.end_time || ''),
      rule_type: rule.rule_type === 'blocked' ? 'blocked' : 'work_hours',
      label: rule.label?.trim() || null,
    }))
  )
}

async function getTrainerIdForUser(supabase: RouteSupabase, userId: string) {
  const { data: trainer, error } = await supabase
    .from('trainers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (error || !trainer) {
    return null
  }

  return trainer.id as string
}

async function loadLegacyAvailabilityBlocks(supabase: RouteSupabase, trainerId: string) {
  const { data, error } = await supabase
    .from('availability_blocks')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw error

  return normalizeRules(
    (data ?? []).map((rule) => ({
      ...rule,
      rule_type: 'work_hours',
      label: null,
    })),
    trainerId
  )
}

async function loadTrainerScheduleRules(supabase: RouteSupabase, trainerId: string) {
  const { data, error } = await supabase
    .from('trainer_schedule_rules')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    return loadLegacyAvailabilityBlocks(supabase, trainerId)
  }

  if (!data || data.length === 0) {
    return loadLegacyAvailabilityBlocks(supabase, trainerId)
  }

  return normalizeRules(data as TrainerScheduleRule[], trainerId)
}

function validateRules(rules: TrainerScheduleRule[]) {
  for (const rule of rules) {
    if (
      Number.isNaN(rule.day_of_week) ||
      rule.day_of_week < 0 ||
      rule.day_of_week > 6 ||
      !rule.start_time ||
      !rule.end_time ||
      rule.end_time <= rule.start_time
    ) {
      return 'Each schedule rule must include a valid day, start time, and end time.'
    }
  }

  return null
}

async function syncLegacyAvailabilityBlocks(supabase: RouteSupabase, trainerId: string, rules: TrainerScheduleRule[]) {
  const workHours = rules
    .filter((rule) => rule.rule_type === 'work_hours')
    .map((rule) => ({
      trainer_id: trainerId,
      day_of_week: rule.day_of_week,
      start_time: rule.start_time,
      end_time: rule.end_time,
    }))

  await supabase.from('availability_blocks').delete().eq('trainer_id', trainerId).throwOnError()

  if (workHours.length > 0) {
    await supabase.from('availability_blocks').insert(workHours).throwOnError()
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const trainerId = await getTrainerIdForUser(supabase, user.id)
    if (!trainerId) return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 })

    const rules = await loadTrainerScheduleRules(supabase, trainerId)
    return NextResponse.json({ data: rules })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const trainerId = await getTrainerIdForUser(supabase, user.id)
    if (!trainerId) return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 })

    const body = await req.json()
    const normalizedRules = normalizeRules(body?.rules, trainerId)
    const validationError = validateRules(normalizedRules)

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    await supabase.from('trainer_schedule_rules').delete().eq('trainer_id', trainerId).throwOnError()

    if (normalizedRules.length > 0) {
      await supabase
        .from('trainer_schedule_rules')
        .insert(
          normalizedRules.map((rule) => ({
            trainer_id: trainerId,
            day_of_week: rule.day_of_week,
            start_time: rule.start_time,
            end_time: rule.end_time,
            rule_type: rule.rule_type,
            label: rule.rule_type === 'blocked' ? rule.label || null : null,
          }))
        )
        .throwOnError()
    }

    await syncLegacyAvailabilityBlocks(supabase, trainerId, normalizedRules)

    const rules = await loadTrainerScheduleRules(supabase, trainerId)
    return NextResponse.json({ data: rules })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const trainerId = await getTrainerIdForUser(supabase, user.id)
    if (!trainerId) return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const currentRules = await loadTrainerScheduleRules(supabase, trainerId)
    const nextRules = currentRules.filter((rule) => rule.id !== id)

    await supabase.from('trainer_schedule_rules').delete().eq('id', id).eq('trainer_id', trainerId)
    await syncLegacyAvailabilityBlocks(supabase, trainerId, nextRules)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
