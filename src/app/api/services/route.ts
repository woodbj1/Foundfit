import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

function deriveServiceType(category?: string, isSession?: boolean, sessionLimit?: number | null) {
  if (category === 'meal_plan') return 'meal_plan'
  if (category === 'subscription') return 'unlimited'
  if (isSession && sessionLimit && sessionLimit > 1) return 'pack'
  if (isSession) return 'single'
  return 'single'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, price, duration_minutes, category, is_popular, is_session, session_limit } = body

    if (!title || price == null) {
      return NextResponse.json({ error: 'title and price are required' }, { status: 400 })
    }

    const serviceType = deriveServiceType(category, is_session, session_limit)
    const amountCents = Math.round(Number(price) * 100)

    const stripe = getStripe()
    const stripeProduct = await stripe.products.create({
      name: title,
      description: description || undefined,
      metadata: {
        category: category || 'session',
        duration_minutes: String(duration_minutes || ''),
        service_type: serviceType,
      },
    })

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: amountCents,
      currency: 'usd',
      ...(serviceType === 'unlimited' ? { recurring: { interval: 'month' as const } } : {}),
    })

    const { data, error } = await supabase.from('services').insert({
      name: title,
      title,
      description,
      price: amountCents,
      duration_minutes,
      category,
      type: serviceType,
      is_popular: is_popular ?? false,
      is_session: is_session ?? true,
      session_limit,
      session_count: is_session ? session_limit || 1 : null,
      max_weekly_bookings: serviceType === 'unlimited' ? (session_limit || 3) : 0,
      is_active: true,
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripePrice.id,
    }).select().single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('[POST /api/services]', err)
    return NextResponse.json({ error: err.message || 'Failed to create service' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { id, title, description, price, duration_minutes, category, is_popular, is_session, session_limit } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const serviceType = deriveServiceType(category, is_session, session_limit)
    const amountCents = Math.round(Number(price) * 100)

    const { data: existing, error: fetchErr } = await supabase
      .from('services')
      .select('stripe_product_id, stripe_price_id, price')
      .eq('id', id)
      .single()

    if (fetchErr) throw fetchErr

    const stripe = getStripe()

    if (existing?.stripe_product_id) {
      await stripe.products.update(existing.stripe_product_id, {
        name: title,
        description: description || undefined,
        metadata: {
          category: category || 'session',
          duration_minutes: String(duration_minutes || ''),
          service_type: serviceType,
        },
      })

      if (existing.stripe_price_id && existing.price !== amountCents) {
        await stripe.prices.update(existing.stripe_price_id, { active: false })
        const newStripePrice = await stripe.prices.create({
          product: existing.stripe_product_id,
          unit_amount: amountCents,
          currency: 'usd',
          ...(serviceType === 'unlimited' ? { recurring: { interval: 'month' as const } } : {}),
        })

        await supabase.from('services').update({ stripe_price_id: newStripePrice.id }).eq('id', id)
      }
    }

    const { data, error } = await supabase.from('services').update({
      name: title,
      title,
      description,
      price: amountCents,
      duration_minutes,
      category,
      type: serviceType,
      is_popular: is_popular ?? false,
      is_session: is_session ?? true,
      session_limit,
      session_count: is_session ? session_limit || 1 : null,
      max_weekly_bookings: serviceType === 'unlimited' ? (session_limit || 3) : 0,
    }).eq('id', id).select().single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('[PUT /api/services]', err)
    return NextResponse.json({ error: err.message || 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data: existing } = await supabase
      .from('services').select('stripe_product_id, stripe_price_id').eq('id', id).single()

    if (existing?.stripe_product_id) {
      const stripe = getStripe()
      if (existing.stripe_price_id) {
        await stripe.prices.update(existing.stripe_price_id, { active: false })
      }
      await stripe.products.update(existing.stripe_product_id, { active: false })
    }

    const { error } = await supabase.from('services').update({ is_active: false }).eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/services]', err)
    return NextResponse.json({ error: err.message || 'Failed to delete service' }, { status: 500 })
  }
}
