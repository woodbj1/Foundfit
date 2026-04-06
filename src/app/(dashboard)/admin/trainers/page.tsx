'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Loader2, UserCheck, UserX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Profile, Trainer } from '@/lib/types'

type TrainerWithProfile = Trainer & { profile?: Profile | null }
type AddTrainerResponse = {
  createdUser?: boolean
  emailedCredentials?: boolean
  error?: string
}

export default function AdminTrainersPage() {
  const [supabase] = useState(() => createClient())
  const [trainers, setTrainers] = useState<TrainerWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [adding, setAdding] = useState(false)

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
        data = raw ? JSON.parse(raw) as AddTrainerResponse : null
      } catch {
        data = { error: raw || 'Unexpected server response' }
      }

      if (!res.ok) throw new Error(data?.error || 'Failed to create trainer')

      toast.success(
        data?.createdUser
          ? `${fullName} added.${data?.emailedCredentials ? ' Login details were emailed.' : ' Account created, but email delivery is not configured.'}`
          : `${fullName} promoted to trainer and activated.`
      )

      setDialogOpen(false)
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
    const { error } = await supabase
      .from('trainers')
      .update({ is_active: !currentActive })
      .eq('id', trainerId)

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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                      <p className="text-xs text-muted-foreground mt-1">
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
