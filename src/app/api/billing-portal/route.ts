import { NextRequest, NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/app-url'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customers = await stripe.customers.list({ email: user.email!, limit: 1 })
  if (customers.data.length === 0) {
    return NextResponse.json({ error: 'No billing account found. Purchase a package first.' }, { status: 404 })
  }

  const appUrl = getAppUrl(request)

  const session = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${appUrl}/account`,
  })

  return NextResponse.json({ url: session.url })
}
