'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

export type Exercise = {
  id?: string
  slug: string
  name: string
  body_parts: string[]
  goals: string[]
  equipment: string[]
  summary: string
  setup: string
  how_to: string[]
  coaching_cues: string[]
  common_mistakes: string[]
  demo_video_url: string | null
  demo_video_storage_path: string | null
}

const BODY_PART_OPTIONS = ['full-body', 'upper-body', 'lower-body', 'glutes', 'core', 'mobility']
const GOAL_OPTIONS = ['strength', 'hiit', 'sculpt', 'mobility']

interface Props {
  exerciseToEdit?: Exercise | null
  onClose: () => void
  onSuccess: () => void
}

export default function ExerciseModal({ exerciseToEdit, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [bodyParts, setBodyParts] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [equipment, setEquipment] = useState('')
  const [summary, setSummary] = useState('')
  const [setup, setSetup] = useState('')
  const [howTo, setHowTo] = useState('')
  const [coachingCues, setCoachingCues] = useState('')
  const [commonMistakes, setCommonMistakes] = useState('')
  const [demoVideoUrl, setDemoVideoUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (exerciseToEdit) {
      setName(exerciseToEdit.name)
      setSlug(exerciseToEdit.slug)
      setBodyParts(exerciseToEdit.body_parts)
      setGoals(exerciseToEdit.goals)
      setEquipment(exerciseToEdit.equipment.join(', '))
      setSummary(exerciseToEdit.summary)
      setSetup(exerciseToEdit.setup)
      setHowTo(exerciseToEdit.how_to.join('\n'))
      setCoachingCues(exerciseToEdit.coaching_cues.join('\n'))
      setCommonMistakes(exerciseToEdit.common_mistakes.join('\n'))
      setDemoVideoUrl(exerciseToEdit.demo_video_url ?? '')
    }
  }, [exerciseToEdit])

  const autoSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')

  const handleNameChange = (val: string) => {
    setName(val)
    if (!exerciseToEdit) setSlug(autoSlug(val))
  }

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((a) => a !== item) : [...arr, item]

  const splitLines = (text: string) =>
    text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

  const handleAiPopulate = async () => {
    if (!name.trim()) {
      toast.error('Enter an exercise name first.')
      return
    }
    setAiLoading(true)
    try {
      const res = await fetch('/api/admin/ai-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: name, type: 'exercise' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'AI generation failed')
      }
      const { result } = await res.json()
      if (result.summary) setSummary(result.summary)
      if (result.setup) setSetup(result.setup)
      if (result.howTo?.length) setHowTo(result.howTo.join('\n'))
      if (result.coachingCues?.length) setCoachingCues(result.coachingCues.join('\n'))
      if (result.commonMistakes?.length) setCommonMistakes(result.commonMistakes.join('\n'))
      if (result.bodyParts?.length) setBodyParts(result.bodyParts)
      if (result.goals?.length) setGoals(result.goals)
      if (result.equipment?.length) setEquipment(result.equipment.join(', '))
      toast.success('AI populated exercise fields.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Name and slug are required.')
      return
    }
    if (bodyParts.length === 0) {
      toast.error('Select at least one body part.')
      return
    }

    setLoading(true)
    try {
      const body = {
        slug,
        name: name.trim(),
        body_parts: bodyParts,
        goals,
        equipment: equipment
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        summary: summary.trim(),
        setup: setup.trim(),
        how_to: splitLines(howTo),
        coaching_cues: splitLines(coachingCues),
        common_mistakes: splitLines(commonMistakes),
        demo_video_url: demoVideoUrl.trim() || null,
      }

      const url = exerciseToEdit?.id
        ? `/api/admin/exercises/${exerciseToEdit.id}`
        : '/api/admin/exercises'
      const method = exerciseToEdit?.id ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save exercise.')
      }

      toast.success(exerciseToEdit ? 'Exercise updated.' : 'Exercise created.')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save exercise.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {exerciseToEdit ? 'Edit Exercise' : 'New Exercise'}
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAiPopulate}
              disabled={aiLoading || !name.trim()}
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
          {/* Name + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Goblet Squat" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="goblet_squat" />
            </div>
          </div>

          {/* Body Parts */}
          <div>
            <Label>Body Parts</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {BODY_PART_OPTIONS.map((bp) => (
                <button
                  key={bp}
                  type="button"
                  onClick={() => setBodyParts(toggleArrayItem(bodyParts, bp))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    bodyParts.includes(bp)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {bp}
                </button>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div>
            <Label>Goals</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGoals(toggleArrayItem(goals, g))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    goals.includes(g)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <Label>Equipment (comma-separated)</Label>
            <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="dumbbell, kettlebell" />
          </div>

          {/* Summary */}
          <div>
            <Label>Summary</Label>
            <Textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description of the exercise..."
            />
          </div>

          {/* Setup */}
          <div>
            <Label>Setup</Label>
            <Textarea rows={2} value={setup} onChange={(e) => setSetup(e.target.value)} placeholder="Starting position..." />
          </div>

          {/* How To (one step per line) */}
          <div>
            <Label>How To (one step per line)</Label>
            <Textarea
              rows={4}
              value={howTo}
              onChange={(e) => setHowTo(e.target.value)}
              placeholder="Step 1&#10;Step 2&#10;Step 3"
            />
          </div>

          {/* Coaching Cues (one per line) */}
          <div>
            <Label>Coaching Cues (one per line)</Label>
            <Textarea
              rows={3}
              value={coachingCues}
              onChange={(e) => setCoachingCues(e.target.value)}
              placeholder="Keep your chest up&#10;Drive through your heels"
            />
          </div>

          {/* Common Mistakes (one per line) */}
          <div>
            <Label>Common Mistakes (one per line)</Label>
            <Textarea
              rows={3}
              value={commonMistakes}
              onChange={(e) => setCommonMistakes(e.target.value)}
              placeholder="Letting knees cave in&#10;Rounding the back"
            />
          </div>

          {/* Demo Video */}
          <div>
            <Label>Demo Video</Label>
            {demoVideoUrl && (
              <div className="mt-1 mb-2">
                <video
                  src={demoVideoUrl}
                  controls
                  className="h-32 w-full max-w-xs rounded-lg border bg-black object-contain"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                placeholder="https://... or upload a file"
                className="flex-1"
              />
              {exerciseToEdit?.id && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file || !exerciseToEdit?.id) return
                      setUploading(true)
                      try {
                        const form = new FormData()
                        form.append('file', file)
                        form.append('exercise_id', exerciseToEdit.id)
                        const res = await fetch('/api/admin/demo-video', { method: 'POST', body: form })
                        if (!res.ok) {
                          const err = await res.json()
                          throw new Error(err.error || 'Upload failed')
                        }
                        const { public_url } = await res.json()
                        setDemoVideoUrl(public_url)
                        toast.success('Demo video uploaded.')
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : 'Upload failed.')
                      } finally {
                        setUploading(false)
                      }
                    }}
                  />
                  <span className="inline-flex h-8 items-center rounded-md border border-input px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                    {uploading ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-4 w-4" />
                    )}
                    Upload
                  </span>
                </label>
              )}
            </div>
            {!exerciseToEdit?.id && (
              <p className="mt-1 text-xs text-gray-400">Save the exercise first to enable video upload.</p>
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
            {exerciseToEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}
