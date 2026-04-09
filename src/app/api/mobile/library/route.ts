import { NextResponse } from 'next/server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getLibraryAccessDetails } from '@/lib/product-access'

function normalizeSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
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

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') {
    return NextResponse.json({ error: 'Client access only.' }, { status: 403 })
  }

  const [{ data: subscriptions }, { data: packs }] = await Promise.all([
    admin
      .from('subscriptions')
      .select('*, service:services(*)')
      .eq('client_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    admin
      .from('session_packs')
      .select('*, service:services(*)')
      .eq('client_id', user.id)
      .order('purchased_at', { ascending: false }),
  ])

  const normalizedSubscriptions = (subscriptions ?? []).map((subscription) => ({
    ...subscription,
    service: normalizeSingle(subscription.service),
  }))

  const normalizedPacks = (packs ?? []).map((pack) => ({
    ...pack,
    service: normalizeSingle(pack.service),
  }))

  const access = getLibraryAccessDetails(
    normalizedSubscriptions,
    normalizedPacks,
    process.env.VIMEO_LIBRARY_URL || null
  )

  if (!access) {
    return NextResponse.json({
      hasAccess: false,
      message: 'Purchase the video library product to unlock the guided virtual studio.',
    })
  }

  return NextResponse.json({
    hasAccess: true,
    access: {
      accessUrl: access.accessUrl,
      accessType: access.accessType,
      serviceName: access.service.name,
      remainingSessions: access.remainingSessions,
    },
  })
}
