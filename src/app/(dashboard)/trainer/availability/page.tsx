'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

import { DAY_ABBREVIATIONS, TIME_SLOTS } from '@/lib/constants'
import {
  createScheduleRuleDraft,
  formatScheduleTime,
  formatSelectedDays,
  getPresetDayValues,
  getPresetLabel,
  groupScheduleRulesByDay,
  sortScheduleRules,
  type DayPreset,
} from '@/lib/trainer-schedule'
import type { DayOfWeek, TrainerScheduleRule, TrainerScheduleRuleType } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

type ModalState = {
  open: boolean
  mode: TrainerScheduleRuleType
  selectedDays: DayOfWeek[]
  preset: DayPreset
  startTime: string
  endTime: string
  label: string
}

function buildDefaultModalState(
  mode: TrainerScheduleRuleType,
  days: DayOfWeek[] = mode === 'work_hours' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5]
): ModalState {
  return {
    open: true,
    mode,
    selectedDays: days,
    preset:
      days.length === 7
        ? 'all'
        : days.length === 5 && days.every((day, index) => day === index + 1)
          ? 'weekdays'
          : days.length === 2 && days.includes(0) && days.includes(6)
            ? 'weekends'
            : 'custom',
    startTime: mode === 'work_hours' ? '08:00' : '12:00',
    endTime: mode === 'work_hours' ? '17:00' : '13:00',
    label: mode === 'blocked' ? 'Lunch' : '',
  }
}

function ScheduleRuleModal({
  state,
  onClose,
  onApply,
}: {
  state: ModalState
  onClose: () => void
  onApply: (nextState: Omit<ModalState, 'open'>) => void
}) {
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(state.selectedDays)
  const [preset, setPreset] = useState<DayPreset>(state.preset)
  const [startTime, setStartTime] = useState(state.startTime)
  const [endTime, setEndTime] = useState(state.endTime)
  const [label, setLabel] = useState(state.label)

  useEffect(() => {
    setSelectedDays(state.selectedDays)
    setPreset(state.preset)
    setStartTime(state.startTime)
    setEndTime(state.endTime)
    setLabel(state.label)
  }, [state])

  function applyPreset(nextPreset: DayPreset) {
    setPreset(nextPreset)
    if (nextPreset === 'custom') {
      return
    }
    setSelectedDays(getPresetDayValues(nextPreset))
  }

  function toggleDay(day: DayOfWeek) {
    setPreset('custom')
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((left, right) => left - right) as DayOfWeek[]
    )
  }

  function handleApply() {
    if (selectedDays.length === 0) {
      toast.error('Select at least one day.')
      return
    }

    if (!startTime || !endTime || endTime <= startTime) {
      toast.error('Choose a valid start and end time.')
      return
    }

    onApply({
      mode: state.mode,
      selectedDays,
      preset,
      startTime,
      endTime,
      label,
    })
  }

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{state.mode === 'work_hours' ? 'Set Work Hours' : 'Add Block'}</DialogTitle>
          <DialogDescription>
            {state.mode === 'work_hours'
              ? 'Clients will only see booking times inside these work hours. Applying this will replace existing work hours for the selected days.'
              : 'Use blocks for lunch, school pickup, meetings, or any repeated unavailable time inside your work hours.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Apply to</Label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'weekdays', 'weekends', 'custom'] as DayPreset[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={preset === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyPreset(value)}
                >
                  {getPresetLabel(value)}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {DAY_ABBREVIATIONS.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(index as DayOfWeek)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    selectedDays.includes(index as DayOfWeek)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {formatSelectedDays(selectedDays)}
            </p>
          </div>

          {state.mode === 'blocked' ? (
            <div className="space-y-2">
              <Label htmlFor="block-label">Block label</Label>
              <Input
                id="block-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Lunch, school pickup, meeting..."
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start time</Label>
              <Select
                value={startTime}
                onValueChange={(value) => {
                  if (value) setStartTime(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue>{(value) => formatScheduleTime(String(value ?? ''))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End time</Label>
              <Select
                value={endTime}
                onValueChange={(value) => {
                  if (value) setEndTime(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue>{(value) => formatScheduleTime(String(value ?? ''))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            {state.mode === 'work_hours' ? 'Apply Work Hours' : 'Add Block'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AvailabilityPage() {
  const [rules, setRules] = useState<TrainerScheduleRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialSnapshot, setInitialSnapshot] = useState('[]')
  const [modalState, setModalState] = useState<ModalState | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/trainer/availability', { cache: 'no-store' })
        const payload = (await response.json()) as { data?: TrainerScheduleRule[]; error?: string }

        if (!response.ok) {
          throw new Error(payload.error || 'Could not load your schedule.')
        }

        const nextRules = payload.data ?? []
        setRules(nextRules)
        setInitialSnapshot(JSON.stringify(nextRules))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not load your schedule.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const groupedRules = useMemo(() => groupScheduleRulesByDay(rules), [rules])
  const configuredDays = useMemo(
    () => groupedRules.filter((day) => day.workHours.length > 0).length,
    [groupedRules]
  )
  const blockedRuleCount = useMemo(
    () => rules.filter((rule) => rule.rule_type === 'blocked').length,
    [rules]
  )
  const hasChanges = JSON.stringify(rules) !== initialSnapshot

  function openWorkHoursModal(days?: DayOfWeek[]) {
    setModalState(buildDefaultModalState('work_hours', days && days.length > 0 ? days : [1, 2, 3, 4, 5]))
  }

  function openBlockModal(days?: DayOfWeek[]) {
    setModalState(buildDefaultModalState('blocked', days && days.length > 0 ? days : [1, 2, 3, 4, 5]))
  }

  function applyModal(nextState: Omit<ModalState, 'open'>) {
    if (nextState.mode === 'work_hours') {
      setRules((current) => {
        const remaining = current.filter(
          (rule) => !(rule.rule_type === 'work_hours' && nextState.selectedDays.includes(rule.day_of_week))
        )

        return sortScheduleRules([
          ...remaining,
          ...nextState.selectedDays.map((day) =>
            createScheduleRuleDraft('', 'work_hours', day, nextState.startTime, nextState.endTime)
          ),
        ])
      })
    } else {
      setRules((current) => sortScheduleRules([
        ...current,
        ...nextState.selectedDays.map((day) =>
          createScheduleRuleDraft('', 'blocked', day, nextState.startTime, nextState.endTime, nextState.label)
        ),
      ]))
    }

    setModalState(null)
  }

  function removeRule(ruleId: string) {
    setRules((current) => sortScheduleRules(current.filter((rule) => rule.id !== ruleId)))
  }

  function clearDayWorkHours(day: DayOfWeek) {
    setRules((current) =>
      sortScheduleRules(
        current.filter((rule) => !(rule.rule_type === 'work_hours' && rule.day_of_week === day))
      )
    )
  }

  async function handleSave() {
    setSaving(true)

    try {
      const response = await fetch('/api/trainer/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: rules.map((rule) => ({
            day_of_week: rule.day_of_week,
            start_time: rule.start_time,
            end_time: rule.end_time,
            rule_type: rule.rule_type,
            label: rule.rule_type === 'blocked' ? rule.label || null : null,
          })),
        }),
      })

      const payload = (await response.json()) as { data?: TrainerScheduleRule[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Could not save your schedule.')
      }

      const nextRules = payload.data ?? []
      setRules(nextRules)
      setInitialSnapshot(JSON.stringify(nextRules))
      toast.success('Availability saved!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your schedule.')
    } finally {
      setSaving(false)
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Availability</h1>
          <p className="mt-1 text-muted-foreground">
            Set work hours for each day, then layer in blocked times like lunch or appointments.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => openWorkHoursModal()}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Set Work Hours
          </Button>
          <Button variant="outline" onClick={() => openBlockModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Block
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Configured days</CardDescription>
            <CardTitle>{configuredDays} of 7</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blocked intervals</CardDescription>
            <CardTitle>{blockedRuleCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Booking logic</CardDescription>
            <CardTitle className="text-base">Work hours minus blocks</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        {groupedRules.map(({ day, dayIndex, workHours, blocked }) => (
          <Card key={dayIndex}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-4 w-4" />
                    {day}
                  </CardTitle>
                  <CardDescription>
                    {workHours.length > 0
                      ? `${workHours.length} work hour window${workHours.length === 1 ? '' : 's'} configured`
                      : 'No work hours set yet'}
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => openWorkHoursModal([dayIndex])}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    {workHours.length > 0 ? 'Change Hours' : 'Set Hours'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openBlockModal([dayIndex])}>
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Add Block
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Work hours</p>
                  {workHours.length > 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => clearDayWorkHours(dayIndex)}>
                      Clear
                    </Button>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {workHours.length > 0 ? (
                    workHours.map((rule) => (
                      <Badge key={rule.id} variant="secondary" className="px-3 py-1">
                        {formatScheduleTime(rule.start_time)} - {formatScheduleTime(rule.end_time)}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Clients will not see booking times for this day until you set work hours.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Blocked times</p>
                {blocked.length > 0 ? (
                  <div className="space-y-2">
                    {blocked.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{rule.label || 'Blocked time'}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatScheduleTime(rule.start_time)} - {formatScheduleTime(rule.end_time)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeRule(rule.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No blocks for this day. Add lunch, meetings, pickups, or other repeating unavailable time.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {modalState ? (
        <ScheduleRuleModal
          state={modalState}
          onClose={() => setModalState(null)}
          onApply={applyModal}
        />
      ) : null}
    </div>
  )
}
