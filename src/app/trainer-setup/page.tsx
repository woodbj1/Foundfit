'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Dumbbell,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SITE } from '@/lib/site-config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type TrainerSetupStatus = {
  id: string
  user_id: string
  password_updated_at: string | null
  google_calendar_connected_at: string | null
  google_calendar_email: string | null
  onboarding_completed_at: string | null
}

type TrainerProfile = {
  full_name: string | null
  email: string | null
  role: 'client' | 'trainer' | 'admin'
}

function getGoogleMessage(value: string | null) {
  switch (value) {
    case 'connected':
      return {
        type: 'success' as const,
        text: 'Google Calendar connected successfully.',
      }
    case 'connect_failed':
      return {
        type: 'error' as const,
        text: 'We could not connect your Google Calendar. Please try again.',
      }
    case 'auth_required':
      return {
        type: 'error' as const,
        text: 'Your session expired while connecting Google Calendar. Sign in again and retry.',
      }
    case 'missing_code':
    case 'state_missing':
    case 'state_invalid':
      return {
        type: 'error' as const,
        text: 'The Google Calendar connection link was invalid or expired. Please try again.',
      }
    case 'unauthorized':
      return {
        type: 'error' as const,
        text: 'Only trainer accounts can connect a Google Calendar.',
      }
    default:
      return null
  }
}

function TrainerSetupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase] = useState(() => createClient())

  const [checkingSession, setCheckingSession] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<TrainerProfile | null>(null)
  const [trainer, setTrainer] = useState<TrainerSetupStatus | null>(null)

  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [tempPassword, setTempPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)

  const googleMessage = getGoogleMessage(searchParams.get('google'))

  const loadTrainerState = useCallback(async (currentUserId: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', currentUserId)
      .single()

    if (profileError) {
      throw profileError
    }

    const normalizedProfile = profileData as TrainerProfile
    setProfile(normalizedProfile)

    if (normalizedProfile.role !== 'trainer') {
      router.replace('/dashboard')
      return
    }

    const { data: trainerData, error: trainerError } = await supabase
      .from('trainers')
      .select('id, user_id, password_updated_at, google_calendar_connected_at, google_calendar_email, onboarding_completed_at')
      .eq('user_id', currentUserId)
      .single()

    if (trainerError) {
      throw trainerError
    }

    const normalizedTrainer = trainerData as TrainerSetupStatus
    setTrainer(normalizedTrainer)

    if (normalizedTrainer.onboarding_completed_at) {
      router.replace('/trainer')
    }
  }, [router, supabase])

  useEffect(() => {
    let active = true

    async function initialize() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!active) {
          return
        }

        if (!user) {
          setUserId(null)
          setProfile(null)
          setTrainer(null)
          return
        }

        setUserId(user.id)
        setEmail(user.email ?? searchParams.get('email') ?? '')
        await loadTrainerState(user.id)
      } catch (error) {
        console.error('Failed to load trainer setup state:', error)
        toast.error('Could not load your trainer setup.')
      } finally {
        if (active) {
          setCheckingSession(false)
        }
      }
    }

    void initialize()

    return () => {
      active = false
    }
  }, [loadTrainerState, router, searchParams, supabase])

  useEffect(() => {
    if (!googleMessage) {
      return
    }

    if (googleMessage.type === 'success') {
      toast.success(googleMessage.text)
    } else {
      toast.error(googleMessage.text)
    }
  }, [googleMessage])

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSigningIn(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword,
      })

      if (error) {
        throw error
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Could not load your account after signing in.')
      }

      setUserId(user.id)
      await loadTrainerState(user.id)
      toast.success('Signed in. Finish your setup below.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign in with the temporary password.')
    } finally {
      setSigningIn(false)
    }
  }

  async function handlePasswordUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setSavingPassword(true)

    try {
      const response = await fetch('/api/trainer/setup/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Could not update your password.')
      }

      if (!userId) {
        throw new Error('Your session expired. Sign in again.')
      }

      setNewPassword('')
      setConfirmPassword('')
      await loadTrainerState(userId)
      toast.success('Password updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update your password.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleConnectGoogle() {
    setConnectingGoogle(true)

    try {
      const response = await fetch('/api/trainer/google/connect', {
        method: 'POST',
      })

      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Could not start Google Calendar setup.')
      }

      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start Google Calendar setup.')
      setConnectingGoogle(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUserId(null)
    setProfile(null)
    setTrainer(null)
    setTempPassword('')
    router.refresh()
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center">
            <Link href="/" className="flex items-center justify-center gap-2 mb-4">
              <Dumbbell className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                {SITE.name}
              </span>
            </Link>
            <CardTitle className="text-2xl">Finish Trainer Setup</CardTitle>
            <CardDescription>
              Sign in with the temporary password from your email to create your permanent password and connect your Google Calendar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {googleMessage ? (
              <div className={`mb-4 rounded-lg border p-3 text-sm ${googleMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                <div className="flex items-start gap-2">
                  {googleMessage.type === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                  <p>{googleMessage.text}</p>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="trainer@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp-password">Temporary Password</Label>
                <Input
                  id="temp-password"
                  type="password"
                  value={tempPassword}
                  onChange={(event) => setTempPassword(event.target.value)}
                  placeholder="Enter the password from your email"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white"
                disabled={signingIn}
              >
                {signingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue Setup
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const passwordDone = Boolean(trainer?.password_updated_at)
  const googleDone = Boolean(trainer?.google_calendar_connected_at)
  const onboardingDone = Boolean(trainer?.onboarding_completed_at)

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-white/90 p-6 shadow-xl backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600">Trainer onboarding</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Finish your FoundFit setup</h1>
            <p className="mt-2 text-sm text-slate-600">
              {profile?.full_name ? `Hi ${profile.full_name},` : 'Hi there,'} complete these two steps before you start taking bookings.
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </div>

        {googleMessage ? (
          <div className={`rounded-xl border p-4 text-sm ${googleMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
            <div className="flex items-start gap-2">
              {googleMessage.type === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
              <p>{googleMessage.text}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className={passwordDone ? 'border-green-200 bg-green-50/70' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-lg">1. Create Your Password</CardTitle>
                </div>
                <Badge variant={passwordDone ? 'default' : 'secondary'}>
                  {passwordDone ? 'Done' : 'Required'}
                </Badge>
              </div>
              <CardDescription>
                Replace the temporary password from your email with one you&apos;ll keep using.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordDone ? (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-white p-4 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  <p>Your password is set. You can update it again later from Supabase auth settings if needed.</p>
                </div>
              ) : (
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="At least 8 characters with letters and numbers"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your new password"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={savingPassword} className="w-full">
                    {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Password
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className={googleDone ? 'border-green-200 bg-green-50/70' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-lg">2. Connect Google Calendar</CardTitle>
                </div>
                <Badge variant={googleDone ? 'default' : 'secondary'}>
                  {googleDone ? 'Connected' : 'Required'}
                </Badge>
              </div>
              <CardDescription>
                We use your own calendar to block busy times and create booking events only for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {googleDone ? (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-white p-4 text-sm text-slate-700">
                  <Mail className="mt-0.5 h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium">Connected calendar</p>
                    <p className="text-slate-600">{trainer?.google_calendar_email || 'Primary Google Calendar connected'}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">
                  Connect the Google account you use to manage your availability. We&apos;ll use its primary calendar for busy-time checks and approved booking events.
                </div>
              )}

              <Button
                type="button"
                onClick={handleConnectGoogle}
                disabled={connectingGoogle}
                className="w-full"
                variant={googleDone ? 'outline' : 'default'}
              >
                {connectingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {googleDone ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className={onboardingDone ? 'border-green-200 bg-green-50/70' : ''}>
          <CardHeader>
            <CardTitle>Ready to go</CardTitle>
            <CardDescription>
              Once both steps are done, you&apos;ll land in your trainer dashboard and your calendar will start affecting your available booking slots.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              {onboardingDone
                ? 'Setup is complete. You can start managing availability and booking requests now.'
                : 'Finish both steps above to unlock the trainer dashboard.'}
            </div>
            <Button onClick={() => router.push('/trainer')} disabled={!onboardingDone}>
              Go to Trainer Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function TrainerSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      }
    >
      <TrainerSetupPageContent />
    </Suspense>
  )
}
