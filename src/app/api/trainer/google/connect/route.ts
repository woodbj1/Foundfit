import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureProfileAndRole } from '@/lib/supabase/auth-repair'
import { getTrainerGoogleAuthUrl, isTrainerGoogleCalendarConfigured } from '@/lib/google-calendar'

const TRAINER_GOOGLE_STATE_COOKIE = 'trainer_google_oauth_state'

export async function POST() {
  if (!isTrainerGoogleCalendarConfigured()) {
    return NextResponse.json(
      { error: 'Google Calendar is not configured yet. Please ask an admin to finish setup.' },
      { status: 503 }
    )
  }

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

  const state = crypto.randomUUID()
  const response = NextResponse.json({ url: getTrainerGoogleAuthUrl(state) })

  response.cookies.set({
    name: TRAINER_GOOGLE_STATE_COOKIE,
    value: JSON.stringify({ state, userId: user.id }),
    httpOnly: true,
    maxAge: 60 * 10,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
