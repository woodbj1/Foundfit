'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { WorkoutBlock } from './workout-block-modal'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type PlanDay = {
  day_of_week: number
  block_id: string | null
  label: string
}

type ActivePlan = {
  id: string
  name: string
  is_active: boolean
  started_at: string
  weeks_running: number
  days: PlanDay[]
}

interface Props {
  allBlocks: WorkoutBlock[]
}

export default function WeeklyPlanner({ allBlocks }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<ActivePlan | null>(null)
  const [planName, setPlanName] = useState('Current Plan')
  const [days, setDays] = useState<PlanDay[]>(
    DAYS.map((_, i) => ({ day_of_week: i, block_id: null, label: '' }))
  )

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/weekly-plan')
      if (!res.ok) throw new Error('Failed to load plan')
      const data = await res.json()
      if (data.plan) {
        setPlan(data.plan)
        setPlanName(data.plan.name)
        const merged = DAYS.map((_, i) => {
          const existing = data.plan.days?.find((d: PlanDay) => d.day_of_week === i)
          return existing || { day_of_week: i, block_id: null, label: '' }
        })
        setDays(merged)
      }
    } catch {
      toast.error('Could not load weekly plan.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPlan()
  }, [fetchPlan])

  const updateDay = (dayIdx: number, field: 'block_id' | 'label', value: string) => {
    setDays((prev) =>
      prev.map((d) => (d.day_of_week === dayIdx ? { ...d, [field]: value || null } : d))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/weekly-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planName.trim() || 'Current Plan',
          days: days.map((d) => ({
            day_of_week: d.day_of_week,
            block_id: d.block_id || null,
            label: d.label || null,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save plan.')
      }
      toast.success('Weekly plan saved. New rotation starts now.')
      await fetchPlan()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <CalendarDays className="h-5 w-5 text-purple-600" />
            Workout of the Day — Weekly Plan
          </h3>
          {plan && (
            <p className="mt-1 text-sm text-gray-500">
              Current plan has been running for{' '}
              <Badge variant="secondary" className="mx-1">
                {plan.weeks_running} {plan.weeks_running === 1 ? 'week' : 'weeks'}
              </Badge>
              since {new Date(plan.started_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-purple-600 text-white hover:bg-purple-700">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Plan
        </Button>
      </div>

      <div>
        <Label>Plan Name</Label>
        <Input
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="e.g. Week A Rotation"
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {DAYS.map((dayName, i) => {
          const day = days.find((d) => d.day_of_week === i)!
          const assignedBlock = allBlocks.find((b) => b.id === day.block_id)

          return (
            <div
              key={i}
              className={`rounded-xl border p-3 transition-colors ${
                day.block_id ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-white'
              }`}
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{dayName}</p>
              <select
                value={day.block_id ?? ''}
                onChange={(e) => updateDay(i, 'block_id', e.target.value)}
                className="mb-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs"
              >
                <option value="">Rest Day</option>
                {allBlocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.title}
                  </option>
                ))}
              </select>
              <Input
                value={day.label}
                onChange={(e) => updateDay(i, 'label', e.target.value)}
                placeholder="Label"
                className="h-7 text-xs"
              />
              {assignedBlock && (
                <div className="mt-2 text-xs text-gray-500">
                  <Badge variant="outline" className="mr-1 text-[10px]">
                    {assignedBlock.body_part}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {assignedBlock.goal}
                  </Badge>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400">
        This plan repeats weekly until you save a new one. The week counter tracks how long the current plan has been active.
      </p>
    </div>
  )
}
