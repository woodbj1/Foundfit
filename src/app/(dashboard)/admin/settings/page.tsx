'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, DollarSign, Clock, Building2, ShieldAlert, CheckCircle2, AlertTriangle, CircleDashed, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { IntegrationStatus, IntegrationStatusLevel } from '@/lib/integrations'
import { toast } from 'sonner'

const DEFAULT_SETTINGS: Record<string, string> = {
  default_duration: '50',
  max_weekly_bookings: '3',
  travel_fee: '1000',
  booking_window_days: '14',
  cancellation_penalty_enabled: 'false',
  cancellation_penalty_hours: '0',
  cancellation_penalty_fee: '0',
  business_name: 'FoundFit',
  business_email: 'info@foundfit.net',
  business_phone: '',
  business_address: 'Acworth, GA',
}

type SettingRow = {
  key: string
  value: string
}

type IntegrationStatusResponse = {
  statuses: IntegrationStatus[]
}

function centsToDollars(value: string | undefined) {
  return (parseInt(value || '0', 10) / 100).toFixed(2)
}

function getIntegrationLevelClasses(level: IntegrationStatusLevel) {
  switch (level) {
    case 'ready':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-700'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600'
  }
}

function getIntegrationIcon(level: IntegrationStatusLevel) {
  switch (level) {
    case 'ready':
      return CheckCircle2
    case 'warning':
      return AlertTriangle
    case 'error':
      return XCircle
    default:
      return CircleDashed
  }
}

export default function AdminSettingsPage() {
  const [supabase] = useState(() => createClient())
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS)
  const [integrationStatuses, setIntegrationStatuses] = useState<IntegrationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [integrationsLoading, setIntegrationsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [{ data }, integrationResponse] = await Promise.all([
          supabase.from('settings').select('*'),
          fetch('/api/admin/integrations/status', { cache: 'no-store' }),
        ])

        const merged = { ...DEFAULT_SETTINGS }
        if (data) {
          ;(data as SettingRow[]).forEach((setting) => {
            merged[setting.key] = setting.value
          })
        }
        setSettings(merged)

        if (!integrationResponse.ok) {
          throw new Error('Failed to load integration status')
        }

        const integrationData = (await integrationResponse.json()) as IntegrationStatusResponse
        setIntegrationStatuses(integrationData.statuses || [])
      } catch {
        toast.error('Failed to load admin settings')
      } finally {
        setLoading(false)
        setIntegrationsLoading(false)
      }
    }

    void load()
  }, [supabase])

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
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
    } finally {
      setSaving(false)
    }
  }

  const cancellationPenaltyEnabled = settings.cancellation_penalty_enabled === 'true'
  const bookingWindowWeeks = useMemo(() => {
    const days = parseInt(settings.booking_window_days || '14', 10)
    return (days / 7).toFixed(days % 7 === 0 ? 0 : 1)
  }, [settings.booking_window_days])

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
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Configure business rules, booking limits, and customer policies.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Integration Readiness</CardTitle>
            <CardDescription>
              Quick launch check for payments, notifications, calendar sync, and virtual delivery.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {integrationsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {integrationStatuses.map((status) => {
                  const Icon = getIntegrationIcon(status.level)
                  return (
                    <div
                      key={status.id}
                      className={`rounded-xl border p-4 ${getIntegrationLevelClasses(status.level)}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                        <div className="space-y-1">
                          <p className="font-semibold">{status.label}</p>
                          <p className="text-sm">{status.summary}</p>
                          <p className="text-xs opacity-80">{status.details}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Settings
            </CardTitle>
            <CardDescription>Default values that affect booking behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Session Duration (minutes)</Label>
              <Input
                type="number"
                min="1"
                value={settings.default_duration}
                onChange={(e) => updateSetting('default_duration', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Weekly Bookings (Unlimited Plan)</Label>
              <Input
                type="number"
                min="1"
                value={settings.max_weekly_bookings}
                onChange={(e) => updateSetting('max_weekly_bookings', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum sessions per week for unlimited subscribers.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Booking Window (days ahead)</Label>
              <Input
                type="number"
                min="1"
                value={settings.booking_window_days}
                onChange={(e) => updateSetting('booking_window_days', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Clients can book up to {bookingWindowWeeks} week(s) in advance.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing & Fees
            </CardTitle>
            <CardDescription>Business-level fees applied automatically during booking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Travel Fee ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={centsToDollars(settings.travel_fee)}
                onChange={(e) =>
                  updateSetting('travel_fee', Math.round(parseFloat(e.target.value || '0') * 100).toString())
                }
              />
              <p className="text-xs text-muted-foreground">
                Flat fee charged for in-home training sessions.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Cancellation Policy
            </CardTitle>
            <CardDescription>Keep this open for now, or switch on penalties later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">Enable cancellation penalty</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  When enabled, clients cancelling too close to a session can be charged a fee.
                </p>
              </div>
              <Button
                type="button"
                variant={cancellationPenaltyEnabled ? 'default' : 'outline'}
                onClick={() =>
                  updateSetting(
                    'cancellation_penalty_enabled',
                    cancellationPenaltyEnabled ? 'false' : 'true'
                  )
                }
              >
                {cancellationPenaltyEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Penalty cutoff (hours before session)</Label>
                <Input
                  type="number"
                  min="0"
                  value={settings.cancellation_penalty_hours}
                  onChange={(e) => updateSetting('cancellation_penalty_hours', e.target.value)}
                  disabled={!cancellationPenaltyEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Penalty fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={centsToDollars(settings.cancellation_penalty_fee)}
                  onChange={(e) =>
                    updateSetting(
                      'cancellation_penalty_fee',
                      Math.round(parseFloat(e.target.value || '0') * 100).toString()
                    )
                  }
                  disabled={!cancellationPenaltyEnabled}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Current policy:{' '}
              {cancellationPenaltyEnabled
                ? `charge $${centsToDollars(settings.cancellation_penalty_fee)} if cancelled within ${settings.cancellation_penalty_hours || '0'} hour(s).`
                : 'clients can cancel any time without penalty.'}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input value={settings.business_name} onChange={(e) => updateSetting('business_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Business Email</Label>
                <Input
                  type="email"
                  value={settings.business_email}
                  onChange={(e) => updateSetting('business_email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Phone</Label>
                <Input value={settings.business_phone} onChange={(e) => updateSetting('business_phone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Business Address</Label>
                <Input value={settings.business_address} onChange={(e) => updateSetting('business_address', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
