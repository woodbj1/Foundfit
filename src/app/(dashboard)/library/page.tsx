import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, Library } from 'lucide-react'

import VirtualWorkoutExperience from '@/components/library/virtual-workout-experience'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getLibraryAccessDetails } from '@/lib/product-access'
import { createClient } from '@/lib/supabase/server'
import type { Service, SessionPack, Subscription } from '@/lib/types'

type LibrarySubscription = Subscription & { service?: Service | null }
type LibraryPack = SessionPack & { service?: Service | null }

const fallbackLibraryUrl = process.env.VIMEO_LIBRARY_URL || null

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, service:services(*)')
    .eq('client_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: packs } = await supabase
    .from('session_packs')
    .select('*, service:services(*)')
    .eq('client_id', user.id)
    .order('purchased_at', { ascending: false })

  const normalizedSubscriptions = ((subscriptions as LibrarySubscription[] | null) ?? []).map((subscription) => ({
    ...subscription,
    service: Array.isArray(subscription.service) ? subscription.service[0] : subscription.service,
  }))

  const normalizedPacks = ((packs as LibraryPack[] | null) ?? []).map((pack) => ({
    ...pack,
    service: Array.isArray(pack.service) ? pack.service[0] : pack.service,
  }))

  const accessDetails = getLibraryAccessDetails(
    normalizedSubscriptions,
    normalizedPacks,
    fallbackLibraryUrl
  )

  if (!accessDetails?.accessUrl) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Video Library</h1>
            <p className="text-muted-foreground mt-1">
              Your on-demand FoundFit workouts, mobility, and recovery sessions.
            </p>
          </div>
          <Link href="/account">
            <Button variant="outline" className="gap-2">
              <Library className="h-4 w-4" />
              Back to Account
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No library available yet</CardTitle>
            <CardDescription>
              This account does not currently have an active virtual catalog destination configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Purchase the on-demand library product first, or add the shared <code>VIMEO_LIBRARY_URL</code> in
                  deployment settings so the guided workout studio has somewhere to send you.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/account">
                <Button>Browse products</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Back to dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <VirtualWorkoutExperience
      accessUrl={accessDetails.accessUrl}
      accessType={accessDetails.accessType}
      serviceName={accessDetails.service.name}
      remainingSessions={accessDetails.remainingSessions}
      checkoutSuccess={resolvedSearchParams.checkout === 'success'}
    />
  )
}
