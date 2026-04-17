'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import ExerciseModal, { type Exercise } from './exercise-modal'
import WorkoutBlockModal, { type WorkoutBlock } from './workout-block-modal'
import WeeklyPlanner from './weekly-planner'

export default function WorkoutRepository() {
  // Exercises state
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exercisesLoading, setExercisesLoading] = useState(true)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [deleteExercise, setDeleteExercise] = useState<Exercise | null>(null)

  // Blocks state
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([])
  const [blocksLoading, setBlocksLoading] = useState(true)
  const [blockSearch, setBlockSearch] = useState('')
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<WorkoutBlock | null>(null)
  const [deleteBlock, setDeleteBlock] = useState<WorkoutBlock | null>(null)

  // Seeding
  const [seeding, setSeeding] = useState(false)

  const fetchExercises = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/exercises')
      if (!res.ok) throw new Error('Failed to load exercises')
      const { data } = await res.json()
      setExercises(data || [])
    } catch {
      toast.error('Could not load exercises.')
    } finally {
      setExercisesLoading(false)
    }
  }, [])

  const fetchBlocks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workout-blocks')
      if (!res.ok) throw new Error('Failed to load blocks')
      const { data } = await res.json()
      setBlocks(data || [])
    } catch {
      toast.error('Could not load workout blocks.')
    } finally {
      setBlocksLoading(false)
    }
  }, [])

  // Auto-seed when tables are empty on first load
  const autoSeed = useCallback(async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/admin/seed-workouts', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Seeding failed')
      toast.success(`Auto-seeded ${data.exercises} exercises and ${data.blocks} blocks from the workout catalog.`)
      await fetchExercises()
      await fetchBlocks()
    } catch {
      // silently fail — user can still click Seed Defaults manually
    } finally {
      setSeeding(false)
    }
  }, [fetchExercises, fetchBlocks])

  useEffect(() => {
    const init = async () => {
      const [exRes, blkRes] = await Promise.all([
        fetch('/api/admin/exercises'),
        fetch('/api/admin/workout-blocks'),
      ])
      const exData = exRes.ok ? (await exRes.json()).data : []
      const blkData = blkRes.ok ? (await blkRes.json()).data : []
      setExercises(exData || [])
      setBlocks(blkData || [])
      setExercisesLoading(false)
      setBlocksLoading(false)

      // If both tables are empty, auto-seed from workout catalog
      if ((!exData || exData.length === 0) && (!blkData || blkData.length === 0)) {
        await autoSeed()
      }
    }
    void init()
  }, [autoSeed])

  const handleDeleteExercise = async () => {
    if (!deleteExercise?.id) return
    try {
      const res = await fetch(`/api/admin/exercises/${deleteExercise.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Delete failed')
      }
      toast.success(`${deleteExercise.name} deleted.`)
      await fetchExercises()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not delete exercise.')
    } finally {
      setDeleteExercise(null)
    }
  }

  const handleDeleteBlock = async () => {
    if (!deleteBlock?.id) return
    try {
      const res = await fetch(`/api/admin/workout-blocks/${deleteBlock.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Delete failed')
      }
      toast.success(`${deleteBlock.title} deleted.`)
      await fetchBlocks()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not delete block.')
    } finally {
      setDeleteBlock(null)
    }
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/admin/seed-workouts', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Seeding failed')
      toast.success(`Seeded ${data.exercises} exercises and ${data.blocks} blocks.`)
      await fetchExercises()
      await fetchBlocks()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not seed data.')
    } finally {
      setSeeding(false)
    }
  }

  const filteredExercises = exercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.body_parts.some((bp) => bp.includes(exerciseSearch.toLowerCase())) ||
      ex.goals.some((g) => g.includes(exerciseSearch.toLowerCase()))
  )

  const filteredBlocks = blocks.filter(
    (b) =>
      b.title.toLowerCase().includes(blockSearch.toLowerCase()) ||
      b.body_part.includes(blockSearch.toLowerCase()) ||
      b.goal.includes(blockSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <Dumbbell className="h-7 w-7 text-purple-600" />
          Workout Studio
        </h1>
        <Button
          onClick={handleSeed}
          variant="outline"
          disabled={seeding}
          className="border-dashed border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Seed Defaults
        </Button>
      </div>

      <Tabs defaultValue="exercises" className="w-full">
        <TabsList className="h-auto w-full justify-start rounded-2xl bg-muted/70 p-1 sm:w-fit">
          <TabsTrigger value="exercises" className="rounded-xl px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Exercises ({exercises.length})
          </TabsTrigger>
          <TabsTrigger value="blocks" className="rounded-xl px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Workout Blocks ({blocks.length})
          </TabsTrigger>
          <TabsTrigger value="planner" className="rounded-xl px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Weekly Planner
          </TabsTrigger>
        </TabsList>

        {/* ─── EXERCISES TAB ─── */}
        <TabsContent value="exercises" className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Search exercises..."
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => {
                setEditingExercise(null)
                setExerciseModalOpen(true)
              }}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </div>

          {exercisesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-gray-500">
              {exercises.length === 0
                ? 'No exercises yet. Click "Seed Defaults" to load the standard library or "Add Exercise" to create one.'
                : 'No exercises match your search.'}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-sm font-medium text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Body Parts</th>
                      <th className="px-4 py-3">Goals</th>
                      <th className="px-4 py-3">Equipment</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredExercises.map((ex) => (
                      <tr key={ex.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{ex.name}</p>
                          <p className="max-w-xs truncate text-xs text-gray-400">{ex.summary}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {ex.body_parts.map((bp) => (
                              <Badge key={bp} variant="outline" className="text-[10px]">
                                {bp}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {ex.goals.map((g) => (
                              <Badge key={g} variant="secondary" className="text-[10px]">
                                {g}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {ex.equipment.length > 0 ? ex.equipment.join(', ') : 'none'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingExercise(ex)
                                setExerciseModalOpen(true)
                              }}
                              className="text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteExercise(ex)}
                              className="text-gray-600 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── WORKOUT BLOCKS TAB ─── */}
        <TabsContent value="blocks" className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={blockSearch}
                onChange={(e) => setBlockSearch(e.target.value)}
                placeholder="Search blocks..."
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => {
                setEditingBlock(null)
                setBlockModalOpen(true)
              }}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Block
            </Button>
          </div>

          {blocksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-gray-500">
              {blocks.length === 0
                ? 'No workout blocks yet. Click "Seed Defaults" to load or "Add Block" to create one.'
                : 'No blocks match your search.'}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-sm font-medium text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Focus</th>
                      <th className="px-4 py-3">Goal</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Exercises</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBlocks.map((block) => (
                      <tr key={block.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{block.title}</p>
                          <p className="max-w-xs truncate text-xs text-gray-400">{block.summary}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">
                            {block.body_part}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {block.goal}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{block.duration_minutes} min</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {block.exercises?.length || 0} exercises
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingBlock(block)
                                setBlockModalOpen(true)
                              }}
                              className="text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteBlock(block)}
                              className="text-gray-600 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── WEEKLY PLANNER TAB ─── */}
        <TabsContent value="planner" className="mt-6">
          <WeeklyPlanner allBlocks={blocks} />
        </TabsContent>
      </Tabs>

      {/* ─── MODALS ─── */}
      {exerciseModalOpen && (
        <ExerciseModal
          exerciseToEdit={editingExercise}
          onClose={() => {
            setExerciseModalOpen(false)
            setEditingExercise(null)
          }}
          onSuccess={fetchExercises}
        />
      )}

      {blockModalOpen && (
        <WorkoutBlockModal
          blockToEdit={editingBlock}
          allExercises={exercises}
          onClose={() => {
            setBlockModalOpen(false)
            setEditingBlock(null)
          }}
          onSuccess={fetchBlocks}
        />
      )}

      {/* ─── DELETE CONFIRMATION (Exercise) ─── */}
      {deleteExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800">Delete Exercise</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteExercise.name}</strong>? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteExercise(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteExercise}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION (Block) ─── */}
      {deleteBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800">Delete Workout Block</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteBlock.title}</strong>? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteBlock(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteBlock}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
