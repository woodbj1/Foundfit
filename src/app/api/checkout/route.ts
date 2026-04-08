import { NextRequest, NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/app-url'
import { requiresTrainerSelectionForService } from '@/lib/purchase-attribution'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { isDailyConfigured } from '@/lib/daily'
import { isVirtualService, isVimeoLibraryService } from '@/lib/product-access'

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { service_id, trainer_id } = body

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

  let trainerId: string | null = null
  if (requiresTrainerSelectionForService(service)) {
    if (!trainer_id) {
      return NextResponse.json(
        { error: 'Please choose a trainer before purchasing this service.' },
        { status: 400 }
      )
    }

    const { data: trainer } = await supabase
      .from('trainers')
      .select('id, is_active, onboarding_completed_at')
      .eq('id', trainer_id)
      .single()

    if (!trainer?.is_active || !trainer.onboarding_completed_at) {
      return NextResponse.json(
        { error: 'That trainer is not available for new purchases right now.' },
        { status: 400 }
      )
    }

    trainerId = trainer.id
  }

  if (isVirtualService(service) && !isDailyConfigured()) {
    return NextResponse.json(
      {
        error:
          'This virtual service is not available right now because Daily is not configured yet.',
      },
      { status: 503 }
    )
  }

  if (isVimeoLibraryService(service) && !service.access_url && !process.env.VIMEO_LIBRARY_URL) {
    return NextResponse.json(
      {
        error:
          'This digital library product is not available yet because no Vimeo access URL is configured.',
      },
      { status: 503 }
    )
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

  const appUrl = getAppUrl(request)
  const successPath = service.fulfillment_type === 'vimeo'
    ? '/library?checkout=success'
    : '/dashboard?checkout=success'

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
      success_url: `${appUrl}${successPath}`,
      cancel_url: `${appUrl}/account?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        service_id: service.id,
        trainer_id: trainerId || '',
        service_type: service.type,
        fulfillment_type: service.fulfillment_type || 'booking',
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          service_id: service.id,
          trainer_id: trainerId || '',
          fulfillment_type: service.fulfillment_type || 'booking',
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
      success_url: `${appUrl}${successPath}`,
      cancel_url: `${appUrl}/account?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        service_id: service.id,
        trainer_id: trainerId || '',
        service_type: service.type,
        fulfillment_type: service.fulfillment_type || 'booking',
        session_count: service.session_count?.toString() || '1',
      },
    })

    return NextResponse.json({ url: session.url })
  }
}
