import { NextResponse } from 'next/server'

import { createAdminClient, createClient } from '@/lib/supabase/server'

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
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') {
    return NextResponse.json({ error: 'Client access only.' }, { status: 403 })
  }

  // Check for any active subscription
  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('id, status, current_period_end, unit_amount_cents, service:services(name)')
    .eq('client_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  const activeSub = subscriptions?.[0] ?? null

  if (!activeSub) {
    return NextResponse.json({
      isSubscribed: false,
      message: 'Subscribe to the Virtual Studio ($50/mo) to access all features.',
    })
  }

  const service = Array.isArray(activeSub.service) ? activeSub.service[0] : activeSub.service

  return NextResponse.json({
    isSubscribed: true,
    subscription: {
      id: activeSub.id,
      serviceName: service?.name || 'Virtual Studio',
      renewsAt: activeSub.current_period_end,
      pricePerMonth: activeSub.unit_amount_cents || 5000,
    },
  })
}
