'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Loader2, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/stripe'
import type { Service, ServiceType } from '@/lib/types'

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'unlimited', label: 'Unlimited Monthly' },
  { value: 'pack', label: 'Session Pack' },
  { value: 'single', label: 'Single Session' },
  { value: 'meal_plan', label: 'Meal Plan' },
]

function ServiceForm({ service, onSave, onClose }: {
  service?: Service
  onSave: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(service?.name || '')
  const [description, setDescription] = useState(service?.description || '')
  const [type, setType] = useState<ServiceType>(service?.type as ServiceType || 'single')
  const [price, setPrice] = useState(service ? (service.price / 100).toFixed(2) : '')
  const [sessionCount, setSessionCount] = useState(service?.session_count?.toString() || '')
  const [duration, setDuration] = useState(service?.duration_minutes?.toString() || '50')
  const [maxWeekly, setMaxWeekly] = useState(service?.max_weekly_bookings?.toString() || '3')
  const [isActive, setIsActive] = useState(service?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    if (!name || !price) {
      toast.error('Name and price are required')
      return
    }

    setSaving(true)
    const data = {
      name,
      description: description || null,
      type,
      price: Math.round(parseFloat(price) * 100),
      session_count: type === 'unlimited' || type === 'meal_plan' ? null : parseInt(sessionCount) || 1,
      duration_minutes: parseInt(duration) || 50,
      max_weekly_bookings: parseInt(maxWeekly) || 3,
      is_active: isActive,
    }

    let error
    if (service) {
      ({ error } = await supabase.from('services').update(data).eq('id', service.id))
    } else {
      ({ error } = await supabase.from('services').insert(data))
    }

    if (error) {
      toast.error('Failed to save service')
    } else {
      toast.success(service ? 'Service updated!' : 'Service created!')
      onSave()
      onClose()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Unlimited Monthly" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => v && setType(v as ServiceType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Price ($)</Label>
          <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      {(type === 'pack' || type === 'single') && (
        <div className="space-y-2">
          <Label>Session Count</Label>
          <Input type="number" value={sessionCount} onChange={(e) => setSessionCount(e.target.value)} placeholder="e.g., 6" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
          <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Max Weekly Bookings</Label>
          <Input type="number" value={maxWeekly} onChange={(e) => setMaxWeekly(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>Active</Label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {service ? 'Update' : 'Create'} Service
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editService, setEditService] = useState<Service | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)
  const supabase = createClient()

  async function loadServices() {
    const { data } = await supabase.from('services').select('*').order('type').order('price')
    if (data) setServices(data as Service[])
    setLoading(false)
  }

  useEffect(() => { loadServices() }, [])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">Manage training packages and offerings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditService(undefined) }}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Service
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editService ? 'Edit Service' : 'New Service'}</DialogTitle>
              <DialogDescription>
                {editService ? 'Update this service' : 'Create a new service or package'}
              </DialogDescription>
            </DialogHeader>
            <ServiceForm
              service={editService}
              onSave={loadServices}
              onClose={() => { setDialogOpen(false); setEditService(undefined) }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{service.name}</h3>
                  {!service.is_active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">{formatPrice(service.price)}{service.type === 'unlimited' ? '/mo' : ''}</span>
                  <span>{service.type}</span>
                  {service.session_count && <span>{service.session_count} sessions</span>}
                  <span>{service.duration_minutes}min</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setEditService(service); setDialogOpen(true) }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
