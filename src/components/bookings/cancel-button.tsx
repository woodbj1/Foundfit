'use client'

import { useState } from 'react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type ButtonVariant = ComponentProps<typeof Button>['variant']
type ButtonSize = ComponentProps<typeof Button>['size']

export default function CancelBookingButton({
  bookingId,
  label,
  variant = 'ghost',
  size = 'sm',
  className,
}: {
  bookingId: string
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this session?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to cancel')
      } else {
        toast.success('Session cancelled')
        router.refresh()
      }
    } catch {
      toast.error('Something went wrong')
    }
    setLoading(false)
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCancel}
      disabled={loading}
      className={cn('text-destructive hover:text-destructive', className)}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      {label ? <span>{label}</span> : null}
    </Button>
  )
}
