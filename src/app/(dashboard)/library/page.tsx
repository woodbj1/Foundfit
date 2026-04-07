import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, ExternalLink, Library, PlayCircle } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getLibraryAccessDetails } from '@/lib/product-access'
import { getVimeoOEmbed } from '@/lib/vimeo'
import type { Service, SessionPack, Subscription } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
  const { data: { user } } = await supabase.auth.getUser()

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
  const accessUrl = accessDetails?.accessUrl ?? null

  let embedHtml: string | null = null
  let embedError: string | null = null

  if (accessUrl) {
    try {
      const oEmbed = await getVimeoOEmbed(accessUrl)
      embedHtml = oEmbed.html
    } catch (error) {
      embedError = error instanceof Error ? error.message : 'Could not load the Vimeo preview.'
    }
  }

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

      {resolvedSearchParams.checkout === 'success' ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-start gap-2">
            <PlayCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Your digital access is active. Open the library below anytime from your account.</p>
          </div>
        </div>
      ) : null}

      {accessUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>Watch now</CardTitle>
            <CardDescription>
              {accessDetails?.accessType === 'pack'
                ? `Library access is bundled with ${accessDetails.service.name} while you still have sessions remaining.`
                : `The embedded player pulls from your active ${accessDetails?.service.name || 'Vimeo-enabled'} subscription.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accessDetails ? (
              <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{accessDetails.service.name}</p>
                <p className="mt-1">
                  Access type: {accessDetails.accessType === 'subscription' ? 'Subscription' : 'Session pack'}
                  {accessDetails.remainingSessions != null
                    ? ` • ${accessDetails.remainingSessions} session${accessDetails.remainingSessions === 1 ? '' : 's'} remaining`
                    : ''}
                </p>
              </div>
            ) : null}

            {embedHtml ? (
              <div
                className="overflow-hidden rounded-xl border bg-black [&_iframe]:aspect-video [&_iframe]:w-full"
                dangerouslySetInnerHTML={{ __html: embedHtml }}
              />
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{embedError || 'The Vimeo library URL exists, but the embed could not be loaded.'}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <a href={accessUrl} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open in Vimeo
                </Button>
              </a>
              <Link href="/account">
                <Button variant="outline">Manage products</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No library available yet</CardTitle>
            <CardDescription>
              This account does not currently have an active Vimeo library destination configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              To unlock this page, either purchase a digital library product with a configured access URL,
              or set a global <code>VIMEO_LIBRARY_URL</code> fallback for deployment.
            </p>
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
      )}
    </div>
  )
}
