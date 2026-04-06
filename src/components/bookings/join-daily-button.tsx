'use client'

import { useState } from 'react'
import { Video, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

export default function JoinDailyButton({
  bookingId,
  label = 'Join call',
  variant = 'outline',
  size = 'sm',
}: {
  bookingId: string
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
}) {
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    setLoading(true)

    try {
      const response = await fetch(`/api/bookings/${bookingId}/daily-link`)
      const data = await response.json()

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Could not open the Daily session.')
      }

      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not open the Daily session.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleJoin} disabled={loading} variant={variant} size={size} className="gap-2">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
      {label}
    </Button>
  )
}
