import { NextRequest, NextResponse } from 'next/server'
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  // Get all services that grant library access (vimeo or hybrid fulfillment)
  const { data: services, error: servicesError } = await admin
    .from('services')
    .select('id, name, description, price, type, is_active, fulfillment_type, access_url, category')
    .in('fulfillment_type', ['vimeo', 'hybrid'])
    .order('name')

  if (servicesError) {
    return NextResponse.json({ error: servicesError.message }, { status: 500 })
  }

  // Count active subscribers for library services
  const serviceIds = (services ?? []).map((s) => s.id)
  let subscriberCount = 0
  let packHolderCount = 0

  if (serviceIds.length > 0) {
    const { count: subCount } = await admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('service_id', serviceIds)
      .eq('status', 'active')

    subscriberCount = subCount ?? 0

    const { count: packCount } = await admin
      .from('session_packs')
      .select('id', { count: 'exact', head: true })
      .in('service_id', serviceIds)

    packHolderCount = packCount ?? 0
  }

  const fallbackUrl = process.env.VIMEO_LIBRARY_URL || null

  return NextResponse.json({
    services: services ?? [],
    subscriberCount,
    packHolderCount,
    fallbackUrl,
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
  const { serviceId, accessUrl } = body as { serviceId: string; accessUrl: string }

  if (!serviceId) {
    return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
  }

  // Validate the URL if provided
  if (accessUrl) {
    try {
      new URL(accessUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }
  }

  const { error } = await admin
    .from('services')
    .update({ access_url: accessUrl || null, updated_at: new Date().toISOString() })
    .eq('id', serviceId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
