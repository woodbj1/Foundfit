'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2, Mail } from 'lucide-react'
import BrandLogo from '@/components/brand/brand-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null)
  const [submittedMessageType, setSubmittedMessageType] = useState<'error' | 'info' | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const error = searchParams.get('error')
  const confirmed = searchParams.get('confirmed')

  const urlMessage = confirmed === 'true'
    ? {
        text: 'Email confirmed. You can log in now.',
        type: 'info' as const,
      }
    : error === 'auth'
      ? {
          text: 'Your sign-in link was invalid or expired. Please try logging in again.',
          type: 'error' as const,
        }
      : null

  const message = submittedMessage ?? urlMessage?.text ?? null
  const messageType = submittedMessageType ?? urlMessage?.type ?? null

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSubmittedMessage(null)
    setSubmittedMessageType(null)

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError) {
      const normalizedMessage = loginError.message.toLowerCase()
      const needsConfirmation = normalizedMessage.includes('email not confirmed') || normalizedMessage.includes('email_not_confirmed')

      if (needsConfirmation) {
        const friendly = 'You need to confirm your email before logging in. Check your inbox for the confirmation link.'
        setSubmittedMessage(friendly)
        setSubmittedMessageType('info')
        toast.info(friendly)
      } else {
        setSubmittedMessage(loginError.message)
        setSubmittedMessageType('error')
        toast.error(loginError.message)
      }

      setLoading(false)
      return
    }

    toast.success('Logged in successfully.')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <BrandLogo iconClassName="h-9 w-9" nameClassName="text-2xl" priority />
          </Link>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Log in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {message && messageType ? (
            <div className={`mb-4 rounded-lg border p-3 text-sm ${messageType === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
              <div className="flex items-start gap-2">
                {messageType === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <Mail className="mt-0.5 h-4 w-4 shrink-0" />}
                <p>{message}</p>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Log In
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-purple-600 font-medium hover:underline">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
