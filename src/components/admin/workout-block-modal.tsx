'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GripVertical, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Exercise } from './exercise-modal'

export type WorkoutBlock = {
  id?: string
  slug: string
  title: string
  summary: string
  body_part: string
  goal: string
  duration_minutes: number
  equipment: string[]
  level: string
  trainer_note: string
  exercises?: BlockExercise[]
}

export type BlockExercise = {
  exercise_id: string
  exercise?: Exercise
  sort_order: number
  prescription: string
  rest: string
  note: string
}

const BODY_PART_OPTIONS = ['full-body', 'upper-body', 'lower-body', 'glutes', 'core', 'mobility']
const GOAL_OPTIONS = ['strength', 'hiit', 'sculpt', 'mobility']
const LEVEL_OPTIONS = ['beginner', 'intermediate']

interface Props {
  blockToEdit?: WorkoutBlock | null
  allExercises: Exercise[]
  onClose: () => void
  onSuccess: () => void
}

export default function WorkoutBlockModal({ blockToEdit, allExercises, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [summary, setSummary] = useState('')
  const [bodyPart, setBodyPart] = useState('full-body')
  const [goal, setGoal] = useState('strength')
  const [durationMinutes, setDurationMinutes] = useState('20')
  const [equipment, setEquipment] = useState('')
  const [level, setLevel] = useState('beginner')
  const [trainerNote, setTrainerNote] = useState('')
  const [blockExercises, setBlockExercises] = useState<BlockExercise[]>([])

  useEffect(() => {
    if (blockToEdit) {
      setTitle(blockToEdit.title)
      setSlug(blockToEdit.slug)
      setSummary(blockToEdit.summary)
      setBodyPart(blockToEdit.body_part)
      setGoal(blockToEdit.goal)
      setDurationMinutes(String(blockToEdit.duration_minutes))
      setEquipment(blockToEdit.equipment.join(', '))
      setLevel(blockToEdit.level)
      setTrainerNote(blockToEdit.trainer_note || '')
      setBlockExercises(
        (blockToEdit.exercises || []).map((ex) => ({
          exercise_id: ex.exercise_id,
          exercise: ex.exercise,
          sort_order: ex.sort_order,
          prescription: ex.prescription,
          rest: ex.rest,
          note: ex.note || '',
        }))
      )
    }
  }, [blockToEdit])

  const autoSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!blockToEdit) setSlug(autoSlug(val))
  }

  const addExercise = () => {
    if (allExercises.length === 0) {
      toast.error('No exercises available. Create exercises first.')
      return
    }
    setBlockExercises((prev) => [
      ...prev,
      {
        exercise_id: allExercises[0].id!,
        exercise: allExercises[0],
        sort_order: prev.length,
        prescription: '3 x 10',
        rest: '60 seconds',
        note: '',
      },
    ])
  }

  const removeExercise = (idx: number) => {
    setBlockExercises((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateExercise = (idx: number, field: keyof BlockExercise, value: string) => {
    setBlockExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== idx) return ex
        if (field === 'exercise_id') {
          const found = allExercises.find((e) => e.id === value)
          return { ...ex, exercise_id: value, exercise: found || ex.exercise }
        }
        return { ...ex, [field]: value }
      })
    )
  }

  const moveExercise = (from: number, to: number) => {
    if (to < 0 || to >= blockExercises.length) return
    setBlockExercises((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      return copy.map((ex, i) => ({ ...ex, sort_order: i }))
    })
  }

  const handleAiPopulate = async () => {
    if (!title.trim()) {
      toast.error('Enter a block title first.')
      return
    }
    setAiLoading(true)
    try {
      const res = await fetch('/api/admin/ai-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: title, type: 'block' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'AI generation failed')
      }
      const { result } = await res.json()
      if (result.summary) setSummary(result.summary)
      if (result.trainerNote) setTrainerNote(result.trainerNote)
      if (result.bodyPart) setBodyPart(result.bodyPart)
      if (result.goal) setGoal(result.goal)
      if (result.durationMinutes) setDurationMinutes(String(result.durationMinutes))
      if (result.equipment?.length) setEquipment(result.equipment.join(', '))
      if (result.level) setLevel(result.level)
      toast.success('AI populated block fields.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      toast.error('Title and slug are required.')
      return
    }

    setLoading(true)
    try {
      const body = {
        slug,
        title: title.trim(),
        summary: summary.trim(),
        body_part: bodyPart,
        goal,
        duration_minutes: parseInt(durationMinutes, 10) || 20,
        equipment: equipment
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        level,
        trainer_note: trainerNote.trim() || null,
        exercises: blockExercises.map((ex, i) => ({
          exercise_id: ex.exercise_id,
          sort_order: i,
          prescription: ex.prescription,
          rest: ex.rest,
          note: ex.note || null,
        })),
      }

      const url = blockToEdit?.id
        ? `/api/admin/workout-blocks/${blockToEdit.id}`
        : '/api/admin/workout-blocks'
      const method = blockToEdit?.id ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save block.')
      }

      toast.success(blockToEdit ? 'Block updated.' : 'Block created.')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save block.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {blockToEdit ? 'Edit Workout Block' : 'New Workout Block'}
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAiPopulate}
              disabled={aiLoading || !title.trim()}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {aiLoading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              AI Populate
            </Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Title + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Full-Body Strength A" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="full_body_strength_a" />
            </div>
          </div>

          {/* Summary */}
          <div>
            <Label>Summary</Label>
            <Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Block description..." />
          </div>

          {/* Body Part + Goal + Level */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Body Part</Label>
              <select
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                {BODY_PART_OPTIONS.map((bp) => (
                  <option key={bp} value={bp}>
                    {bp}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Goal</Label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                {GOAL_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Level</Label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration + Equipment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
            </div>
            <div>
              <Label>Equipment (comma-separated)</Label>
              <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="dumbbell, kettlebell" />
            </div>
          </div>

          {/* Trainer Note */}
          <div>
            <Label>Trainer Note</Label>
            <Textarea rows={2} value={trainerNote} onChange={(e) => setTrainerNote(e.target.value)} placeholder="Optional note..." />
          </div>

          {/* Exercises */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Exercises</Label>
              <Button size="sm" variant="outline" onClick={addExercise}>
                <Plus className="mr-1 h-3 w-3" />
                Add Exercise
              </Button>
            </div>
            {blockExercises.length === 0 ? (
              <p className="text-sm text-gray-400">No exercises added yet.</p>
            ) : (
              <div className="space-y-3">
                {blockExercises.map((bex, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveExercise(idx, idx - 1)}
                          disabled={idx === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <GripVertical className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="mr-1 text-xs font-bold text-gray-400">{idx + 1}.</span>
                      <select
                        value={bex.exercise_id}
                        onChange={(e) => updateExercise(idx, 'exercise_id', e.target.value)}
                        className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm"
                      >
                        {allExercises.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeExercise(idx)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Prescription</Label>
                        <Input
                          value={bex.prescription}
                          onChange={(e) => updateExercise(idx, 'prescription', e.target.value)}
                          placeholder="3 x 10"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Rest</Label>
                        <Input
                          value={bex.rest}
                          onChange={(e) => updateExercise(idx, 'rest', e.target.value)}
                          placeholder="60 seconds"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Note</Label>
                        <Input
                          value={bex.note}
                          onChange={(e) => updateExercise(idx, 'note', e.target.value)}
                          placeholder="Optional"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-purple-600 text-white hover:bg-purple-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {blockToEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}
