import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { formatPrice, getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, paymentConfirmationEmail } from '@/lib/email'
import type { SubscriptionStatus } from '@/lib/types'

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0]
  const periodStart = item?.current_period_start ?? subscription.start_date ?? subscription.created
  const periodEnd =
    item?.current_period_end
    ?? subscription.cancel_at
    ?? subscription.ended_at
    ?? periodStart

  return {
    currentPeriodStart: new Date(periodStart * 1000).toISOString(),
    currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
  }
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due'
    case 'canceled':
      return 'cancelled'
    case 'incomplete_expired':
    case 'paused':
      return 'expired'
    default:
      return 'active'
  }
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )
  } catch (error: unknown) {
    console.error(
      'Stripe webhook signature verification failed:',
      error instanceof Error ? error.message : error
    )
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
          const subscriptionId = session.subscription as string
          const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription
          const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriod(sub)
          const status = mapStripeSubscriptionStatus(sub.status)

          const { data: existingSubscription } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle()

          const subscriptionPayload = {
            client_id: userId,
            service_id: serviceId,
            stripe_subscription_id: subscriptionId,
            status,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            auto_renew: !sub.cancel_at_period_end,
          }

          if (existingSubscription?.id) {
            await supabase
              .from('subscriptions')
              .update(subscriptionPayload)
              .eq('id', existingSubscription.id)
              .throwOnError()
          } else {
            await supabase
              .from('subscriptions')
              .insert(subscriptionPayload)
              .throwOnError()
          }
        } else if (serviceType === 'pack' || serviceType === 'single') {
          const sessionCount = parseInt(session.metadata?.session_count || '1')
          const paymentIntentId = session.payment_intent as string | null

          const { data: existingPack } = paymentIntentId
            ? await supabase
                .from('session_packs')
                .select('id')
                .eq('stripe_payment_id', paymentIntentId)
                .maybeSingle()
            : { data: null }

          const sessionPackPayload = {
            client_id: userId,
            service_id: serviceId,
            total_sessions: sessionCount,
            used_sessions: 0,
            stripe_payment_id: paymentIntentId,
          }

          if (existingPack?.id) {
            await supabase
              .from('session_packs')
              .update(sessionPackPayload)
              .eq('id', existingPack.id)
              .throwOnError()
          } else {
            await supabase
              .from('session_packs')
              .insert(sessionPackPayload)
              .throwOnError()
          }
        }

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
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (
          invoice.parent?.subscription_details?.subscription as string | undefined
        )

        if (subscriptionId) {
          const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription
          const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriod(sub)

          await supabase
            .from('subscriptions')
            .update({
              status: mapStripeSubscriptionStatus(sub.status),
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              auto_renew: !sub.cancel_at_period_end,
            })
            .eq('stripe_subscription_id', subscriptionId)
            .throwOnError()
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
            .throwOnError()
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriod(subscription)
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            auto_renew: false,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
          })
          .eq('stripe_subscription_id', subscription.id)
          .throwOnError()
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriod(subscription)

        await supabase
          .from('subscriptions')
          .update({
            status: mapStripeSubscriptionStatus(subscription.status),
            auto_renew: !subscription.cancel_at_period_end,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
          })
          .eq('stripe_subscription_id', subscription.id)
          .throwOnError()
        break
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
