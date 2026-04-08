import { NextResponse } from 'next/server'
import { ensureProfileAndRole } from '@/lib/supabase/auth-repair'
import { getTrainerCalendarConnectionStatus } from '@/lib/google-calendar'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
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

  const admin = createServiceRoleClient()
  const { data: trainer, error } = await admin
    .from('trainers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (error || !trainer) {
    return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
  }

  const status = await getTrainerCalendarConnectionStatus(trainer.id, { repair: true })
  return NextResponse.json(status)
}
