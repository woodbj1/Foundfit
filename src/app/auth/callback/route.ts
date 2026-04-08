import { createClient } from '@/lib/supabase/server'
import { ensureProfileAndRole } from '@/lib/supabase/auth-repair'
import { getRoleHomePath } from '@/lib/role-routing'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      let redirectTarget = next

      if (data.user) {
        const profile = await ensureProfileAndRole(data.user)
        if (!redirectTarget) {
          redirectTarget = getRoleHomePath(profile.role)
        }
      }

      if (type === 'signup') {
        return NextResponse.redirect(`${origin}/login?confirmed=true`)
      }
      return NextResponse.redirect(`${origin}${redirectTarget || '/dashboard'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
