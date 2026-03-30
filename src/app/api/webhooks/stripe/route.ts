import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, paymentConfirmationEmail } from '@/lib/email'
import { formatPrice } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const serviceId = session.metadata?.service_id
        const serviceType = session.metadata?.service_type

        if (!userId || !serviceId) break

        if (serviceType === 'unlimited') {
          // Create subscription record
          const subscriptionId = session.subscription as string
          const sub = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription

          // Stripe SDK v21+: current_period_start/end removed from Subscription.
          // Use start_date + 30 days as a reasonable period estimate.
          const periodStart = new Date((sub.start_date || sub.created) * 1000)
          const periodEnd = new Date(periodStart)
          periodEnd.setMonth(periodEnd.getMonth() + 1)

          await supabase.from('subscriptions').insert({
            client_id: userId,
            service_id: serviceId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            auto_renew: true,
          })
        } else if (serviceType === 'pack' || serviceType === 'single') {
          // Create session pack record
          const sessionCount = parseInt(session.metadata?.session_count || '1')
          await supabase.from('session_packs').insert({
            client_id: userId,
            service_id: serviceId,
            total_sessions: sessionCount,
            used_sessions: 0,
            stripe_payment_id: session.payment_intent as string,
          })
        }

        // Send payment confirmation email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        const { data: service } = await supabase
          .from('services')
          .select('name, price')
          .eq('id', serviceId)
          .single()

        if (profile?.email && service) {
          const emailData = paymentConfirmationEmail(
            profile.full_name || 'there',
            service.name,
            formatPrice(service.price)
          )
          await sendEmail({ to: profile.email, ...emailData })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        // Subscription renewal
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (
          invoice.parent?.subscription_details?.subscription as string | undefined
        )

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
          const renewStart = new Date((sub.start_date || sub.created) * 1000)
          const renewEnd = new Date(renewStart)
          renewEnd.setMonth(renewEnd.getMonth() + 1)

          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: renewStart.toISOString(),
              current_period_end: renewEnd.toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (
          invoice.parent?.subscription_details?.subscription as string | undefined
        )
        if (subscriptionId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const status = subscription.cancel_at_period_end ? 'active' : 'active'
        const updatedStart = new Date((subscription.start_date || subscription.created) * 1000)
        const updatedEnd = new Date(updatedStart)
        updatedEnd.setMonth(updatedEnd.getMonth() + 1)

        await supabase
          .from('subscriptions')
          .update({
            status,
            auto_renew: !subscription.cancel_at_period_end,
            current_period_start: updatedStart.toISOString(),
            current_period_end: updatedEnd.toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
