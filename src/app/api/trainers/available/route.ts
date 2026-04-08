import { NextResponse } from 'next/server'

import { createAdminClient, createClient } from '@/lib/supabase/server'

type TrainerRow = {
  id: string
  onboarding_completed_at: string | null
  profile?: { full_name: string | null }[] | { full_name: string | null } | null
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

  const { data, error } = await admin
    .from('trainers')
    .select('id, onboarding_completed_at, profile:profiles!trainers_user_id_fkey(full_name)')
    .eq('is_active', true)
    .not('onboarding_completed_at', 'is', null)

  if (error) {
    console.error('[GET /api/trainers/available]', error)
    return NextResponse.json({ error: 'Could not load trainers.' }, { status: 500 })
  }

  const trainers = ((data ?? []) as TrainerRow[])
    .map((trainer) => {
      const profile = Array.isArray(trainer.profile) ? trainer.profile[0] : trainer.profile

      return {
        id: trainer.id,
        full_name: profile?.full_name?.trim() || 'Trainer',
      }
    })
    .sort((left, right) => left.full_name.localeCompare(right.full_name))

  return NextResponse.json({ data: trainers })
}

