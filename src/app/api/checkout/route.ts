import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { service_id } = body

  if (!service_id) {
    return NextResponse.json({ error: 'service_id is required' }, { status: 400 })
  }

  // Get service
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', service_id)
    .eq('is_active', true)
    .single()

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  let customerId: string

  // Search for existing Stripe customer by email
  const existingCustomers = await stripe.customers.list({
    email: user.email!,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    customerId = existingCustomers.data[0].id
  } else {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: profile?.full_name || undefined,
      phone: profile?.phone || undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (service.type === 'unlimited') {
    // Create Stripe Price if needed, then subscription checkout
    let priceId = service.stripe_price_id

    if (!priceId) {
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: service.price,
        recurring: { interval: 'month' },
        product_data: {
          name: service.name,
          metadata: { service_id: service.id },
        },
      })
      priceId = price.id

      // Save price ID back to service
      await supabase
        .from('services')
        .update({ stripe_price_id: priceId })
        .eq('id', service.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/account?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        service_id: service.id,
        service_type: service.type,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          service_id: service.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } else {
    // One-time payment for packs/single/meal_plan
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: service.price,
            product_data: {
              name: service.name,
              description: service.description || undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/account?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        service_id: service.id,
        service_type: service.type,
        session_count: service.session_count?.toString() || '1',
      },
    })

    return NextResponse.json({ url: session.url })
  }
}
