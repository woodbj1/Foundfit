import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function GET() {
  const admin = await createAdminClient()

  // Get the active plan with its days + blocks
  const { data: plan, error } = await admin
    .from('weekly_plans')
    .select('*, weekly_plan_days(*, block:workout_blocks(id, slug, title, body_part, goal, duration_minutes))')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate weeks running
  let weeksRunning = 0
  if (plan?.started_at) {
    const started = new Date(plan.started_at)
    const now = new Date()
    weeksRunning = Math.max(1, Math.ceil((now.getTime() - started.getTime()) / (7 * 24 * 60 * 60 * 1000)))
  }

  return NextResponse.json({
    plan: plan ?? null,
    weeksRunning,
  })
}

export async function PUT(request: NextRequest) {
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
  const { name = 'Current Plan', days } = body

  if (!Array.isArray(days) || days.length !== 7) {
    return NextResponse.json({ error: 'days must be an array of 7 entries (0=Sun through 6=Sat).' }, { status: 400 })
  }

  // Deactivate any existing active plan
  await admin
    .from('weekly_plans')
    .update({ is_active: false })
    .eq('is_active', true)

  // Create new plan
  const { data: plan, error: planError } = await admin
    .from('weekly_plans')
    .insert({ name, is_active: true, started_at: new Date().toISOString().slice(0, 10) })
    .select()
    .single()

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 })
  }

  // Insert day entries
  const dayRows = days.map((d: { day_of_week: number; block_id: string | null; label?: string }) => ({
    plan_id: plan.id,
    day_of_week: d.day_of_week,
    block_id: d.block_id || null,
    label: d.label || null,
  }))

  const { error: dayError } = await admin.from('weekly_plan_days').insert(dayRows)

  if (dayError) {
    return NextResponse.json({ error: dayError.message }, { status: 500 })
  }

  return NextResponse.json({ plan, message: 'Weekly plan updated.' })
}
