import Link from 'next/link'
import { Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="text-center">
        <Flame className="h-16 w-16 text-primary mx-auto mb-6 opacity-50" />
        <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          This page doesn&apos;t exist — maybe it skipped leg day.
        </p>
        <Link href="/">
          <Button size="lg">Back to Home</Button>
        </Link>
      </div>
    </div>
  )
}
