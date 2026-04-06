'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { UtensilsCrossed, Plus, Loader2, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TrainerMealPlan {
  id: string
  title: string
  created_at: string
  client?: {
    full_name: string | null
    email: string
  } | null
}

interface ClientOption {
  id: string
  full_name: string | null
  email: string
}

export default function TrainerMealPlansPage() {
  const [mealPlans, setMealPlans] = useState<TrainerMealPlan[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!trainer) {
        setMealPlans([])
        setClients([])
        setLoading(false)
        return
      }

      const [plansRes, clientsRes] = await Promise.all([
        supabase
          .from('meal_plans')
          .select('*, client:profiles!meal_plans_client_id_fkey(*)')
          .eq('trainer_id', trainer.id)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'client').order('full_name'),
      ])

      if (plansRes.data) setMealPlans(plansRes.data as TrainerMealPlan[])
      if (clientsRes.data) setClients(clientsRes.data as ClientOption[])
      setLoading(false)
    }

    void loadData()
  }, [refreshKey, supabase])

  async function handleUpload() {
    if (!title || !selectedClient || !file) {
      toast.error('Please fill in all fields and select a PDF')
      return
    }

    setUploading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!trainer) {
        toast.error('Trainer profile not found')
        setUploading(false)
        return
      }

      const fileName = `${selectedClient}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('meal-plans')
        .upload(fileName, file)

      if (uploadError) {
        toast.error('Failed to upload file')
        setUploading(false)
        return
      }

      const { data: mealPlan, error } = await supabase
        .from('meal_plans')
        .insert({
          client_id: selectedClient,
          trainer_id: trainer.id,
          title,
          file_url: fileName,
        })
        .select('id')
        .single()

      if (error) {
        toast.error('Failed to save meal plan')
      } else {
        toast.success('Meal plan uploaded!')
        setDialogOpen(false)
        setTitle('')
        setSelectedClient('')
        setFile(null)
        setRefreshKey((current) => current + 1)

        await fetch('/api/meal-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meal_plan_id: mealPlan.id,
          }),
        })
      }
    } catch {
      toast.error('Something went wrong')
    }

    setUploading(false)
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
          <h1 className="text-3xl font-bold">Meal Plans</h1>
          <p className="text-muted-foreground mt-1">Upload and manage client meal plans</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Upload Plan
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Meal Plan</DialogTitle>
              <DialogDescription>Upload a PDF meal plan for a client</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={selectedClient} onValueChange={(value) => setSelectedClient(value ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name || client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan Title</Label>
                <Input
                  placeholder="e.g., March 2026 Meal Plan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>PDF File</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button className="w-full" onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Upload
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {mealPlans.length > 0 ? (
        <div className="space-y-3">
          {mealPlans.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <UtensilsCrossed className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">{plan.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {(plan.client?.full_name || plan.client?.email || 'Client')} - {format(new Date(plan.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <a href={`/api/meal-plans/${plan.id}/download`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="gap-1">
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </a>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No Meal Plans Yet</h3>
            <p className="text-muted-foreground">Upload your first meal plan to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
