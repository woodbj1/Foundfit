'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Loader2, UserCheck, UserX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function AdminTrainersPage() {
  const [trainers, setTrainers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const supabase = createClient()

  async function loadTrainers() {
    const { data } = await supabase
      .from('trainers')
      .select('*, profile:profiles!trainers_user_id_fkey(*)')
      .order('created_at')
    if (data) setTrainers(data)
    setLoading(false)
  }

  useEffect(() => { loadTrainers() }, [])

  async function handleAddTrainer() {
    if (!email) {
      toast.error('Enter the trainer\'s email address')
      return
    }
    setAdding(true)

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (!profile) {
      toast.error('No user found with that email. They must create an account first.')
      setAdding(false)
      return
    }

    // Update role to trainer
    await supabase.from('profiles').update({ role: 'trainer' }).eq('id', profile.id)

    // Create trainer record
    const { error } = await supabase.from('trainers').insert({
      user_id: profile.id,
      is_active: true,
    })

    if (error) {
      if (error.code === '23505') {
        toast.error('This user is already a trainer')
      } else {
        toast.error('Failed to add trainer')
      }
    } else {
      toast.success(`${profile.full_name || email} added as trainer!`)
      setDialogOpen(false)
      setEmail('')
      loadTrainers()
    }
    setAdding(false)
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
      loadTrainers()
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trainers</h1>
          <p className="text-muted-foreground mt-1">Manage your training team</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
            <Plus className="h-4 w-4" />Add Trainer
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Trainer</DialogTitle>
              <DialogDescription>
                Enter the email of a registered user to make them a trainer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="trainer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">The user must have an account first</p>
              </div>
              <Button onClick={handleAddTrainer} disabled={adding} className="w-full">
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add as Trainer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {trainers.length > 0 ? (
        <div className="space-y-3">
          {trainers.map((trainer) => (
            <div key={trainer.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {(trainer.profile?.full_name || 'T').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{trainer.profile?.full_name || 'Unknown'}</h3>
                    <Badge variant={trainer.is_active ? 'default' : 'secondary'}>
                      {trainer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{trainer.profile?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleActive(trainer.id, trainer.is_active)}
                className={trainer.is_active ? 'text-destructive' : 'text-green-600'}
              >
                {trainer.is_active ? (
                  <><UserX className="h-4 w-4 mr-1" /> Deactivate</>
                ) : (
                  <><UserCheck className="h-4 w-4 mr-1" /> Activate</>
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-medium mb-1">No Trainers</h3>
            <p className="text-muted-foreground">Add your first trainer to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
