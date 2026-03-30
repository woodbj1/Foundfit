'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CreditCard, Loader2, Package, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/stripe'
import type { Profile, Service } from '@/lib/types'

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [packs, setPacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, servicesRes, subRes, packsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('services').select('*').eq('is_active', true).order('price'),
        supabase.from('subscriptions').select('*, service:services(*)').eq('client_id', user.id).eq('status', 'active').single(),
        supabase.from('session_packs').select('*, service:services(*)').eq('client_id', user.id).order('purchased_at', { ascending: false }),
      ])

      if (profileRes.data) {
        setProfile(profileRes.data as Profile)
        setFullName(profileRes.data.full_name || '')
        setPhone(profileRes.data.phone || '')
        setAddress(profileRes.data.address || '')
      }
      if (servicesRes.data) setServices(servicesRes.data as Service[])
      if (subRes.data) setSubscription(subRes.data)
      if (packsRes.data) setPacks(packsRes.data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSaveProfile() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, address })
      .eq('id', profile.id)
    if (error) {
      toast.error('Failed to save profile')
    } else {
      toast.success('Profile updated!')
    }
    setSaving(false)
  }

  async function handlePurchase(serviceId: string) {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: serviceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to create checkout session')
      }
    } catch {
      toast.error('Something went wrong')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sessionServices = services.filter(s => s.type !== 'meal_plan')
  const activePacks = packs.filter(p => p.used_sessions < p.total_sessions)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and billing</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="For in-home training" />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{subscription.service?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(subscription.service?.price || 0)}/month
                      </p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Auto-renew is {subscription.auto_renew ? 'enabled' : 'disabled'}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground mb-4">No active subscription</p>
            )}

            {activePacks.length > 0 && (
              <>
                <Separator className="my-4" />
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Session Packs
                </h4>
                <div className="space-y-2">
                  {activePacks.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">{pack.service?.name}</span>
                      <Badge variant="secondary">
                        {pack.total_sessions - pack.used_sessions} remaining
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchase Section */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase a Package</CardTitle>
          <CardDescription>Choose a training package to get started or add more sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sessionServices.map((service) => (
              <div
                key={service.id}
                className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <h4 className="font-semibold">{service.name}</h4>
                <p className="text-2xl font-bold text-primary mt-1">
                  {formatPrice(service.price)}
                  {service.type === 'unlimited' && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                </p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">{service.description}</p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handlePurchase(service.id)}
                >
                  Purchase
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
