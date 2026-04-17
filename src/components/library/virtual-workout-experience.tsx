'use client'

import type { ComponentType } from 'react'
import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Dices,
  Dumbbell,
  ExternalLink,
  Flame,
  Library,
  PlayCircle,
  Sparkles,
  Target,
  TimerReset,
  Wand2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BODY_PART_OPTIONS,
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  TIME_OPTIONS,
  WORKOUT_BLOCKS,
  buildCustomWorkoutFromBlocks,
  generateSurpriseWorkout,
  generateWorkoutFromPreferences,
  getBodyPartLabel,
  getGoalLabel,
  getWorkoutOfTheDay,
  type ExerciseDefinition,
  type GuidedWorkout,
  type WorkoutBodyPart,
  type WorkoutGoal,
} from '@/lib/workout-catalog'

type VirtualWorkoutExperienceProps = {
  accessUrl: string
  accessType: 'subscription' | 'pack'
  serviceName: string
  remainingSessions: number | null
  checkoutSuccess: boolean
}

function EntryCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  action: string
}) {
  return (
    <div className="rounded-2xl border bg-white/80 p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{action}</p>
    </div>
  )
}

function WorkoutSummaryCard({
  title,
  value,
  detail,
}: {
  title: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

export default function VirtualWorkoutExperience({
  accessUrl,
  accessType,
  serviceName,
  remainingSessions,
  checkoutSuccess,
}: VirtualWorkoutExperienceProps) {
  const workoutOfTheDay = useMemo(() => getWorkoutOfTheDay(), [])
  const [activeWorkout, setActiveWorkout] = useState<GuidedWorkout>(workoutOfTheDay)
  const [bodyPart, setBodyPart] = useState<WorkoutBodyPart>('full-body')
  const [goal, setGoal] = useState<WorkoutGoal>('strength')
  const [minutes, setMinutes] = useState<string>('20')
  const [browseBodyPart, setBrowseBodyPart] = useState<WorkoutBodyPart | 'all'>('all')
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null)
  const [showShowcase, setShowShowcase] = useState(false)

  const browseBlocks = useMemo(() => {
    return browseBodyPart === 'all'
      ? WORKOUT_BLOCKS
      : WORKOUT_BLOCKS.filter(
          (block) => block.bodyPart === browseBodyPart || block.bodyPart === 'full-body'
        )
  }, [browseBodyPart])

  const selectedBlocks = selectedBlockIds
    .map((blockId) => WORKOUT_BLOCKS.find((block) => block.id === blockId))
    .filter((block): block is (typeof WORKOUT_BLOCKS)[number] => Boolean(block))

  function handleGenerateWorkout() {
    const nextWorkout = generateWorkoutFromPreferences({
      minutes: parseInt(minutes, 10),
      bodyPart,
      goal,
    })

    setActiveWorkout(nextWorkout)
  }

  function handleToggleBlock(blockId: string) {
    setSelectedBlockIds((current) =>
      current.includes(blockId)
        ? current.filter((id) => id !== blockId)
        : [...current, blockId]
    )
  }

  function handleBuildFromSelectedBlocks() {
    if (!selectedBlockIds.length) return
    setActiveWorkout(buildCustomWorkoutFromBlocks(selectedBlockIds))
  }

  function handleLoadWorkoutOfTheDay() {
    setActiveWorkout(getWorkoutOfTheDay())
  }

  function handleSurpriseMe() {
    setActiveWorkout(generateSurpriseWorkout())
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{accessType === 'subscription' ? 'Subscription access' : 'Pack access'}</Badge>
              <Badge variant="secondary">{serviceName}</Badge>
              {remainingSessions != null ? (
                <Badge variant="outline">{remainingSessions} sessions remaining</Badge>
              ) : null}
            </div>
            <h1 className="mt-4 text-3xl font-bold">Virtual Workout Studio</h1>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              Move through a guided experience instead of hunting for the right workout. Pick today&apos;s
              track, build a session around your time and focus, browse by body part, or let us surprise you.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowShowcase((prev) => !prev)} className="gap-2">
              {showShowcase ? <ChevronUp className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              {showShowcase ? 'Hide Library' : 'Watch Library'}
            </Button>
            <a href={accessUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open on Vimeo
              </Button>
            </a>
          </div>
        </div>

        {checkoutSuccess ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              <PlayCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Your digital access is active. Jump into the guided library below whenever you are ready.</p>
            </div>
          </div>
        ) : null}

        {showShowcase ? (
          <div className="mt-6 overflow-hidden rounded-2xl border">
            <iframe
              src={accessUrl.includes('/embed') ? accessUrl : `${accessUrl.replace(/\/$/, '')}/embed`}
              className="w-full aspect-video"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="FoundFit Video Library"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EntryCard
          icon={BadgeCheck}
          title="Workout of the Day"
          description="Follow a fresh guided pick inside the current monthly theme and keep decision fatigue low."
          action="Load today&apos;s plan"
        />
        <EntryCard
          icon={Target}
          title="Build for Me"
          description="Tell us how much time you have, what to target, and how hard you want to work."
          action="Generate a personalized workout"
        />
        <EntryCard
          icon={Library}
          title="Browse the Catalog"
          description="Organize by body part, mix different workout blocks, and assemble your own session."
          action="Build from selected blocks"
        />
        <EntryCard
          icon={Sparkles}
          title="Surprise Me"
          description="Get a random session when you want to move now and think later."
          action="Spin up a random workout"
        />
      </div>

      <Tabs defaultValue="daily" orientation="horizontal" className="gap-6">
        <TabsList className="w-full flex-wrap justify-start">
          <TabsTrigger value="daily">Workout of the Day</TabsTrigger>
          <TabsTrigger value="guided">Build for Me</TabsTrigger>
          <TabsTrigger value="browse">Browse and Build</TabsTrigger>
          <TabsTrigger value="random">Surprise Me</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>{workoutOfTheDay.monthlyTheme?.label}</CardTitle>
              <CardDescription>{workoutOfTheDay.monthlyTheme?.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border bg-gradient-to-r from-pink-50 via-purple-50 to-cyan-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">Today&apos;s guided pick</p>
                    <h3 className="mt-1 text-2xl font-bold">{workoutOfTheDay.title}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {workoutOfTheDay.summary}
                    </p>
                  </div>
                  <Button onClick={handleLoadWorkoutOfTheDay} className="gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Load Today&apos;s Workout
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <WorkoutSummaryCard
                  title="Focus"
                  value={workoutOfTheDay.bodyParts.map((part) => getBodyPartLabel(part)).join(', ')}
                  detail="Primary muscles and movement patterns"
                />
                <WorkoutSummaryCard
                  title="Goal"
                  value={getGoalLabel(workoutOfTheDay.goal)}
                  detail="Training style for today&apos;s session"
                />
                <WorkoutSummaryCard
                  title="Time"
                  value={`${workoutOfTheDay.durationMinutes} min`}
                  detail="Realistic start-to-finish session length"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guided" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Build a workout around your day</CardTitle>
              <CardDescription>
                Set your time, focus area, and intensity. We will assemble the closest-fit guided session.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
              <div className="space-y-2">
                <p className="text-sm font-medium">How much time do you have?</p>
                <Select value={minutes} onValueChange={(value) => value && setMinutes(value)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Choose minutes" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">What area do you want to focus on?</p>
                <Select value={bodyPart} onValueChange={(value) => value && setBodyPart(value as WorkoutBodyPart)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Choose focus" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOCUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">What kind of session do you want?</p>
                <Select value={goal} onValueChange={(value) => value && setGoal(value as WorkoutGoal)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Choose goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleGenerateWorkout} className="h-10 gap-2">
                <Wand2 className="h-4 w-4" />
                Generate Workout
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="browse" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Browse by body part and stack workout blocks</CardTitle>
              <CardDescription>
                Pick one or more catalog blocks and combine them into a single guided session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {BODY_PART_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={browseBodyPart === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBrowseBodyPart(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_320px]">
                <div className="grid gap-4 md:grid-cols-2">
                  {browseBlocks.map((block) => {
                    const selected = selectedBlockIds.includes(block.id)
                    return (
                      <div key={block.id} className="rounded-2xl border bg-white/80 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">{block.title}</h3>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{block.summary}</p>
                          </div>
                          <Badge variant={selected ? 'default' : 'outline'}>
                            {selected ? 'Selected' : block.durationMinutes + ' min'}
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant="secondary">{getBodyPartLabel(block.bodyPart)}</Badge>
                          <Badge variant="outline">{getGoalLabel(block.goal)}</Badge>
                          <Badge variant="outline">{block.level}</Badge>
                        </div>
                        <p className="mt-4 text-sm text-muted-foreground">
                          {block.exercises.length} exercises - {block.equipment.join(', ')}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button
                            variant={selected ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleToggleBlock(block.id)}
                          >
                            {selected ? 'Remove Block' : 'Add Block'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveWorkout(buildCustomWorkoutFromBlocks([block.id]))}
                          >
                            Preview Alone
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="rounded-2xl border bg-muted/20 p-5">
                  <h3 className="text-lg font-semibold">Custom Workout Stack</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Combine different blocks to build your own guided session.
                  </p>
                  <div className="mt-4 space-y-3">
                    {selectedBlocks.length ? (
                      selectedBlocks.map((block) => (
                        <div key={block.id} className="rounded-xl border bg-white px-3 py-3">
                          <p className="font-medium">{block.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {block.durationMinutes} min - {getGoalLabel(block.goal)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed bg-white px-4 py-6 text-sm text-muted-foreground">
                        Select workout blocks from the catalog to build your custom flow.
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      onClick={handleBuildFromSelectedBlocks}
                      disabled={!selectedBlockIds.length}
                      className="gap-2"
                    >
                      <Dumbbell className="h-4 w-4" />
                      Build Workout
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedBlockIds([])}
                      disabled={!selectedBlockIds.length}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="random" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Let the library surprise you</CardTitle>
              <CardDescription>
                Perfect for the days you want something fresh without spending time choosing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border bg-gradient-to-r from-pink-50 via-purple-50 to-cyan-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">Need a random workout?</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      We will pull a session from the catalog that still feels curated, not chaotic.
                    </p>
                  </div>
                  <Button onClick={handleSurpriseMe} className="gap-2">
                    <Dices className="h-4 w-4" />
                    Surprise Me
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <WorkoutSummaryCard
                  title="Good for"
                  value="Low decision days"
                  detail="Press once and go"
                />
                <WorkoutSummaryCard
                  title="Style"
                  value="Mix of guided blocks"
                  detail="Balanced between variety and structure"
                />
                <WorkoutSummaryCard
                  title="Best use"
                  value="Stay consistent"
                  detail="Ideal when motivation needs a push"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_320px]">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{activeWorkout.title}</CardTitle>
              <CardDescription className="mt-1 max-w-3xl text-sm leading-6">
                {activeWorkout.summary}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{activeWorkout.durationMinutes} min</Badge>
              <Badge variant="outline">{getGoalLabel(activeWorkout.goal)}</Badge>
              {activeWorkout.bodyParts.map((part) => (
                <Badge key={part} variant="outline">
                  {getBodyPartLabel(part)}
                </Badge>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {activeWorkout.sections.map((section, sectionIndex) => (
              <div key={section.id} className="rounded-2xl border bg-white/70 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      Section {sectionIndex + 1}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">{section.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.summary}</p>
                  </div>
                  <Badge variant="secondary">{section.durationMinutes} min</Badge>
                </div>

                <div className="mt-5 space-y-3">
                  {section.exercises.map((item, exerciseIndex) => (
                    <div
                      key={`${section.id}-${item.exercise.id}`}
                      className="rounded-2xl border bg-muted/20 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{exerciseIndex + 1}</Badge>
                            <p className="text-lg font-semibold text-foreground">{item.exercise.name}</p>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{item.exercise.summary}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.exercise.bodyParts.map((part) => (
                              <Badge key={part} variant="secondary">
                                {getBodyPartLabel(part)}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="min-w-[220px] rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Prescription
                          </p>
                          <p className="mt-2 font-semibold">{item.prescription}</p>
                          <p className="mt-2 text-sm text-muted-foreground">Rest: {item.rest}</p>
                          {item.note ? <p className="mt-2 text-sm text-muted-foreground">{item.note}</p> : null}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-muted-foreground">
                          Coaching cue: <span className="font-medium text-foreground">{item.exercise.coachingCues[0]}</span>
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setSelectedExercise(item.exercise)}>
                          How to perform
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Why this workout works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-white/70 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <TimerReset className="h-4 w-4" />
                  <p className="font-medium">Realistic time block</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Every guided plan is built around a real session length, not a fantasy workout you will skip.
                </p>
              </div>
              <div className="rounded-2xl border bg-white/70 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Target className="h-4 w-4" />
                  <p className="font-medium">Specific training focus</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Your workout narrows down to the body area and training style you actually want today.
                </p>
              </div>
              <div className="rounded-2xl border bg-white/70 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Flame className="h-4 w-4" />
                  <p className="font-medium">Exercise walkthroughs</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Every exercise includes a pop-up with setup, coaching cues, and room for your dedicated demo clips.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Equipment in this plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeWorkout.equipment.map((item) => (
                <div key={item} className="rounded-xl border bg-white/70 px-3 py-2 text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(selectedExercise)} onOpenChange={(open) => !open && setSelectedExercise(null)}>
        <DialogContent className="max-w-2xl p-0">
          {selectedExercise ? (
            <>
              <div className="border-b bg-gradient-to-r from-pink-50 via-purple-50 to-cyan-50 px-6 py-5">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedExercise.name}</DialogTitle>
                  <DialogDescription className="max-w-xl text-sm leading-6">
                    {selectedExercise.summary}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Setup</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{selectedExercise.setup}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold">How to perform it</p>
                  <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {selectedExercise.howTo.map((step) => (
                      <li key={step} className="rounded-xl border bg-white px-4 py-3">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border bg-white px-4 py-4">
                    <p className="text-sm font-semibold">Coaching cues</p>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {selectedExercise.coachingCues.map((cue) => (
                        <li key={cue}>• {cue}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border bg-white px-4 py-4">
                    <p className="text-sm font-semibold">Common mistakes</p>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {selectedExercise.commonMistakes.map((mistake) => (
                        <li key={mistake}>• {mistake}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
                  {selectedExercise.demoVideoUrl ? (
                    <p>A dedicated exercise clip is available for this movement.</p>
                  ) : (
                    <p>
                      Your dedicated demo clip can live here later. For now, use the coaching notes above or open the
                      full library to review your longer-form training videos.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter showCloseButton>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setSelectedExercise(null)
                    setShowShowcase(true)
                  }}
                >
                  <PlayCircle className="h-4 w-4" />
                  Watch in Library
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
