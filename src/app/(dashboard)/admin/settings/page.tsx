'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, Settings, DollarSign, Clock, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('settings').select('*')
      if (data) {
        const obj: Record<string, string> = {}
        data.forEach((s: any) => { obj[s.key] = s.value })
        setSettings(obj)
      }
      setLoading(false)
    }
    load()
  }, [])

  function updateSetting(key: string, value: string) {
    setSettings({ ...settings, [key]: value })
  }

  async function handleSave() {
    setSaving(true)
    const updates = Object.entries(settings).map(([key, value]) =>
      supabase.from('settings').upsert({ key, value })
    )

    try {
      await Promise.all(updates)
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your business settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Session Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Settings
            </CardTitle>
            <CardDescription>Default values for sessions and bookings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Session Duration (minutes)</Label>
              <Input
                type="number"
                value={settings.default_duration || '50'}
                onChange={(e) => updateSetting('default_duration', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Weekly Bookings (Unlimited Plan)</Label>
              <Input
                type="number"
                value={settings.max_weekly_bookings || '3'}
                onChange={(e) => updateSetting('max_weekly_bookings', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum sessions per week for unlimited subscribers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing
            </CardTitle>
            <CardDescription>Fees and pricing adjustments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Travel Fee ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={(parseInt(settings.travel_fee || '2500') / 100).toFixed(2)}
                onChange={(e) => updateSetting('travel_fee', Math.round(parseFloat(e.target.value) * 100).toString())}
              />
              <p className="text-xs text-muted-foreground">
                Fixed fee charged for in-home training sessions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Business Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={settings.business_name || ''}
                  onChange={(e) => updateSetting('business_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Email</Label>
                <Input
                  type="email"
                  value={settings.business_email || ''}
                  onChange={(e) => updateSetting('business_email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Phone</Label>
                <Input
                  value={settings.business_phone || ''}
                  onChange={(e) => updateSetting('business_phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Address</Label>
                <Input
                  value={settings.business_address || ''}
                  onChange={(e) => updateSetting('business_address', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
