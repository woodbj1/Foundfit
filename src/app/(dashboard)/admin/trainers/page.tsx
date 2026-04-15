'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Loader2, UserCheck, UserX, Copy, MailWarning } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Profile, Trainer } from '@/lib/types'

type TrainerWithProfile = Trainer & { profile?: Profile | null }
type AddTrainerResponse = {
  createdUser?: boolean
  emailedCredentials?: boolean
  setupUrl?: string
  tempPassword?: string
  error?: string
}

type ManualTrainerAccess = {
  email: string
  fullName: string
  setupUrl: string
  tempPassword: string
}

export default function AdminTrainersPage() {
  const [supabase] = useState(() => createClient())
  const [trainers, setTrainers] = useState<TrainerWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [adding, setAdding] = useState(false)
  const [manualAccess, setManualAccess] = useState<ManualTrainerAccess | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const { data } = await supabase
        .from('trainers')
        .select('*, profile:profiles!trainers_user_id_fkey(*)')
        .order('created_at')

      if (!active) return
      if (data) setTrainers(data as TrainerWithProfile[])
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [supabase])

  async function loadTrainers() {
    const { data } = await supabase
      .from('trainers')
      .select('*, profile:profiles!trainers_user_id_fkey(*)')
      .order('created_at')

    if (data) setTrainers(data as TrainerWithProfile[])
    setLoading(false)
  }

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  async function handleAddTrainer() {
    if (!email || !fullName) {
      toast.error('Enter the trainer name and email address')
      return
    }

    setAdding(true)

    try {
      const res = await fetch('/api/admin/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName }),
      })

      const raw = await res.text()
      let data: AddTrainerResponse | null = null

      try {
        data = raw ? (JSON.parse(raw) as AddTrainerResponse) : null
      } catch {
        data = { error: raw || 'Unexpected server response' }
      }

      if (!res.ok) throw new Error(data?.error || 'Failed to create trainer')

      if (data?.createdUser && data?.tempPassword && data?.setupUrl) {
        setManualAccess({
          email,
          fullName,
          setupUrl: data.setupUrl,
          tempPassword: data.tempPassword,
        })

        toast.success(`${fullName} added. Email delivery is unavailable, so manual setup details are ready.`)
      } else {
        toast.success(
          data?.createdUser
            ? `${fullName} added.${data?.emailedCredentials ? ' Login details were emailed.' : ''}`
            : `${fullName} promoted to trainer and activated.`
        )

        setDialogOpen(false)
      }

      setEmail('')
      setFullName('')
      await loadTrainers()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to add trainer')
    } finally {
      setAdding(false)
    }
  }

  async function toggleActive(trainerId: string, currentActive: boolean) {
    const { error } = await supabase.from('trainers').update({ is_active: !currentActive }).eq('id', trainerId)

    if (error) {
      toast.error('Failed to update trainer')
    } else {
      toast.success(`Trainer ${currentActive ? 'deactivated' : 'activated'}`)
      await loadTrainers()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trainers</h1>
          <p className="mt-1 text-muted-foreground">Manage your training team</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)

            if (!open) {
              setManualAccess(null)
              setEmail('')
              setFullName('')
            }
          }}
        >
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Trainer
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Trainer</DialogTitle>
              <DialogDescription>
                Create a new trainer account or promote an existing user.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              {manualAccess ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                      <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">Email delivery is not configured.</p>
                        <p className="mt-1 text-amber-800">
                          Share these one-time setup details with {manualAccess.fullName} manually.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <div className="flex items-center gap-2">
                        <Input value={manualAccess.email} readOnly />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(manualAccess.email, 'Email')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Temporary Password</Label>
                      <div className="flex items-center gap-2">
                        <Input value={manualAccess.tempPassword} readOnly />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(manualAccess.tempPassword, 'Temporary password')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Setup Link</Label>
                      <div className="flex items-center gap-2">
                        <Input value={manualAccess.setupUrl} readOnly />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(manualAccess.setupUrl, 'Setup link')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button type="button" className="w-full" onClick={() => setDialogOpen(false)}>
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="Jordan Trainer"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="trainer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      New trainers get a setup email with temporary credentials and a link to connect their own Google Calendar.
                    </p>
                  </div>
                  <Button onClick={handleAddTrainer} disabled={adding} className="w-full">
                    {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Trainer Account
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {trainers.length > 0 ? (
        <div className="space-y-3">
          {trainers.map((trainer) => (
            <div key={trainer.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {(trainer.profile?.full_name || 'T').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{trainer.profile?.full_name || 'Unknown'}</h3>
                    <Badge variant={trainer.is_active ? 'default' : 'secondary'}>
                      {trainer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant={trainer.onboarding_completed_at ? 'default' : 'secondary'}>
                      {trainer.onboarding_completed_at ? 'Setup complete' : 'Setup pending'}
                    </Badge>
                    <Badge variant={trainer.google_calendar_connected_at ? 'default' : 'secondary'}>
                      {trainer.google_calendar_connected_at ? 'Calendar connected' : 'Calendar not connected'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{trainer.profile?.email}</p>
                  {trainer.google_calendar_email ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Google Calendar: {trainer.google_calendar_email}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleActive(trainer.id, trainer.is_active)}
                className={trainer.is_active ? 'text-destructive' : 'text-green-600'}
              >
                {trainer.is_active ? (
                  <>
                    <UserX className="mr-1 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-1 h-4 w-4" />
                    Activate
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="mb-1 text-lg font-medium">No Trainers</h3>
            <p className="text-muted-foreground">Add your first trainer to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
