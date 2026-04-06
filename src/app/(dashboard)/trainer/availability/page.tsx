'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Trash2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { DAYS_OF_WEEK, TIME_SLOTS } from '@/lib/constants'
import type { AvailabilityBlock, DayOfWeek } from '@/lib/types'

type TrainerIdRow = {
  id: string
}

export default function AvailabilityPage() {
  const [supabase] = useState(() => createClient())
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [trainerId, setTrainerId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const trainerRow = trainer as TrainerIdRow | null

      if (trainerRow) {
        setTrainerId(trainerRow.id)
        const { data } = await supabase
          .from('availability_blocks')
          .select('*')
          .eq('trainer_id', trainerRow.id)
          .order('day_of_week')
          .order('start_time')

        if (data) setBlocks(data as AvailabilityBlock[])
      }
      setLoading(false)
    }

    void load()
  }, [supabase])

  function addBlock() {
    if (!trainerId) return

    const newBlock: AvailabilityBlock = {
      id: `temp-${Date.now()}`,
      trainer_id: trainerId,
      day_of_week: 1 as DayOfWeek,
      start_time: '06:00',
      end_time: '12:00',
    }
    setBlocks([...blocks, newBlock])
  }

  function removeBlock(id: string) {
    setBlocks(blocks.filter((block) => block.id !== id))
  }

  function updateBlock<K extends keyof AvailabilityBlock>(
    id: string,
    field: K,
    value: AvailabilityBlock[K]
  ) {
    setBlocks(blocks.map((block) => (block.id === id ? { ...block, [field]: value } : block)))
  }

  async function handleSave() {
    if (!trainerId) return
    setSaving(true)

    await supabase.from('availability_blocks').delete().eq('trainer_id', trainerId)

    if (blocks.length > 0) {
      const { error } = await supabase.from('availability_blocks').insert(
        blocks.map((block) => ({
          trainer_id: trainerId,
          day_of_week: block.day_of_week,
          start_time: block.start_time,
          end_time: block.end_time,
        }))
      )

      if (error) {
        toast.error('Failed to save availability')
        setSaving(false)
        return
      }
    }

    toast.success('Availability saved!')
    setSaving(false)

    const { data } = await supabase
      .from('availability_blocks')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('day_of_week')
      .order('start_time')
    if (data) setBlocks(data as AvailabilityBlock[])
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const blocksByDay = DAYS_OF_WEEK.map((day, index) => ({
    day,
    dayIndex: index,
    blocks: blocks.filter((block) => block.day_of_week === index),
  }))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Availability</h1>
          <p className="mt-1 text-muted-foreground">Set your available hours for each day</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addBlock}>
            <Plus className="mr-2 h-4 w-4" />
            Add Block
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {blocksByDay.map(({ day, dayIndex, blocks: dayBlocks }) => (
          <Card key={dayIndex} className={dayBlocks.length === 0 ? 'opacity-50' : ''}>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                {day}
                {dayBlocks.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({dayBlocks.length} block{dayBlocks.length > 1 ? 's' : ''})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            {dayBlocks.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {dayBlocks.map((block) => (
                    <div key={block.id} className="flex items-center gap-3">
                      <Select
                        value={block.start_time}
                        onValueChange={(value) => {
                          if (value) updateBlock(block.id, 'start_time', value)
                        }}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">to</span>
                      <Select
                        value={block.end_time}
                        onValueChange={(value) => {
                          if (value) updateBlock(block.id, 'end_time', value)
                        }}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBlock(block.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
