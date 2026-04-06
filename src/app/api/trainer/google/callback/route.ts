import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { ensureProfileAndRole } from '@/lib/supabase/auth-repair'
import { exchangeTrainerGoogleCode } from '@/lib/google-calendar'

const TRAINER_GOOGLE_STATE_COOKIE = 'trainer_google_oauth_state'

function redirectToSetup(request: NextRequest, reason: string) {
  const url = new URL('/trainer-setup', request.url)
  url.searchParams.set('google', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const returnedState = request.nextUrl.searchParams.get('state')

  if (!code || !returnedState) {
    return redirectToSetup(request, 'missing_code')
  }

  const cookieStore = await cookies()
  const rawStateCookie = cookieStore.get(TRAINER_GOOGLE_STATE_COOKIE)?.value

  if (!rawStateCookie) {
    return redirectToSetup(request, 'state_missing')
  }

  let parsedState: { state?: string; userId?: string } | null = null

  try {
    parsedState = JSON.parse(rawStateCookie) as { state?: string; userId?: string }
  } catch {
    return redirectToSetup(request, 'state_invalid')
  }

  if (!parsedState?.state || parsedState.state !== returnedState || !parsedState.userId) {
    return redirectToSetup(request, 'state_invalid')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== parsedState.userId) {
    return redirectToSetup(request, 'auth_required')
  }

  const profile = await ensureProfileAndRole(user)
  if (profile.role !== 'trainer') {
    return redirectToSetup(request, 'unauthorized')
  }

  try {
    const admin = createServiceRoleClient()
    const { data: trainer, error: trainerError } = await admin
      .from('trainers')
      .select('id, password_updated_at, onboarding_completed_at')
      .eq('user_id', user.id)
      .single()

    if (trainerError) {
      throw trainerError
    }

    const connection = await exchangeTrainerGoogleCode(code)
    const now = new Date().toISOString()

    const { error: connectionError } = await admin
      .from('trainer_calendar_connections')
      .upsert(
        {
          trainer_id: trainer.id,
          google_refresh_token: connection.googleRefreshToken,
          google_calendar_id: connection.googleCalendarId,
          updated_at: now,
        },
        { onConflict: 'trainer_id' }
      )

    if (connectionError) {
      throw connectionError
    }

    const trainerUpdate: Record<string, string | null> = {
      google_calendar_connected_at: now,
      google_calendar_email: connection.googleCalendarEmail,
    }

    if (!trainer.onboarding_completed_at && trainer.password_updated_at) {
      trainerUpdate.onboarding_completed_at = now
    }

    const { error: trainerUpdateError } = await admin
      .from('trainers')
      .update(trainerUpdate)
      .eq('id', trainer.id)

    if (trainerUpdateError) {
      throw trainerUpdateError
    }

    const finalRedirect = new URL(trainer.password_updated_at ? '/trainer' : '/trainer-setup', request.url)
    finalRedirect.searchParams.set('google', 'connected')
    const successResponse = NextResponse.redirect(finalRedirect)
    successResponse.cookies.delete(TRAINER_GOOGLE_STATE_COOKIE)
    return successResponse
  } catch (error) {
    console.error('[GET /api/trainer/google/callback]', error)
    return redirectToSetup(request, 'connect_failed')
  }
}
