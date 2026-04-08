"use client"

import { useState, type ComponentProps, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

type CheckoutButtonProps = Omit<ComponentProps<typeof Button>, 'onClick' | 'children'> & {
  serviceId: string
  children: ReactNode
  pendingLabel?: string
}

export default function CheckoutButton({
  serviceId,
  children,
  disabled,
  pendingLabel = 'Redirecting...',
  ...buttonProps
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleCheckout() {
    try {
      setIsLoading(true)

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: serviceId }),
      })

      const data = await response.json()

      if (!response.ok || !data.url) {
        toast.error(data.error || 'Failed to create checkout session')
        setIsLoading(false)
        return
      }

      window.location.assign(data.url)
    } catch {
      toast.error('Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <Button {...buttonProps} disabled={disabled || isLoading} onClick={handleCheckout}>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {isLoading ? pendingLabel : children}
    </Button>
  )
}
