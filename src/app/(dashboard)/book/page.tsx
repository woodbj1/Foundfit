import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingFlow from '@/components/bookings/booking-flow'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/lib/types'

interface BookingTrainer {
  id: string
  user_id: string
  bio: string | null
  is_active: boolean
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export default async function BookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check for active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, service:services(name, max_weekly_bookings)')
    .eq('client_id', user.id)
    .eq('status', 'active')
    .single()

  // Check for active session packs
  const { data: packs } = await supabase
    .from('session_packs')
    .select('id, total_sessions, used_sessions, service:services(name)')
    .eq('client_id', user.id)

  const activePacks = packs?.filter(p => p.used_sessions < p.total_sessions) ?? []
  const totalSessionsLeft = activePacks.reduce(
    (sum, p) => sum + (p.total_sessions - p.used_sessions),
    0
  )

  const hasActiveAccess = !!subscription || activePacks.length > 0

  // Get active trainers
  const { data: trainers } = await supabase
    .from('trainers')
    .select('id, user_id, bio, is_active, profile:profiles!trainers_user_id_fkey(id, full_name, avatar_url)')
    .eq('is_active', true)

  // Get travel fee
  const { data: travelFeeSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'travel_fee')
    .single()
  const travelFee = parseInt(travelFeeSetting?.value || '0')

  if (!hasActiveAccess) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Book a Session</h1>
          <p className="text-muted-foreground mt-1">Choose a date and time that works for you</p>
        </div>
        <Card className="border-amber-200 bg-amber-50 max-w-lg">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">No active package</p>
              <p className="text-sm text-amber-700 mt-1">
                You need an active subscription or session pack to book a session. Purchase a package to get started.
              </p>
              <Link href="/account">
                <Button size="sm" className="mt-4 gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                  <ShoppingCart className="h-4 w-4" />
                  Browse Packages
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Book a Session</h1>
        <p className="text-muted-foreground mt-1">Choose a trainer, date, and time that works for you</p>
      </div>

      {/* Sessions remaining notice */}
      {!subscription && totalSessionsLeft > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5 w-fit">
          <ShoppingCart className="h-4 w-4" />
          <span>
            You have <strong>{totalSessionsLeft}</strong> session{totalSessionsLeft !== 1 ? 's' : ''} remaining in your pack
          </span>
        </div>
      )}

      <BookingFlow
        trainers={(trainers ?? []).map((trainer) => ({
          ...trainer,
          profile: Array.isArray(trainer.profile) ? trainer.profile[0] : trainer.profile,
        })) as BookingTrainer[]}
        travelFee={travelFee}
        isUnlimited={!!subscription}
        sessionsLeft={totalSessionsLeft}
      />
    </div>
  )
}
