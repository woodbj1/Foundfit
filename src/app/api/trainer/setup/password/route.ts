import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { ensureProfileAndRole } from '@/lib/supabase/auth-repair'

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[a-zA-Z]/, 'Password must include at least one letter.')
    .regex(/[0-9]/, 'Password must include at least one number.'),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await ensureProfileAndRole(user)
  if (profile.role !== 'trainer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = passwordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid password.' },
      { status: 400 }
    )
  }

  const { error: authError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const { data: trainer, error: trainerError } = await admin
    .from('trainers')
    .select('id, google_calendar_connected_at, onboarding_completed_at')
    .eq('user_id', user.id)
    .single()

  if (trainerError) {
    return NextResponse.json({ error: trainerError.message }, { status: 500 })
  }

  const now = new Date().toISOString()
  const trainerUpdate: Record<string, string | null> = {
    password_updated_at: now,
  }

  if (!trainer.onboarding_completed_at && trainer.google_calendar_connected_at) {
    trainerUpdate.onboarding_completed_at = now
  }

  const { error: updateError } = await admin
    .from('trainers')
    .update(trainerUpdate)
    .eq('id', trainer.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    onboardingCompleted: Boolean(trainerUpdate.onboarding_completed_at),
  })
}
