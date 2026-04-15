import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { Screen } from '@/components/foundfit/screen'
import {
  EmptyState,
  Pill,
  PrimaryButton,
  SectionCard,
  SectionTitle,
  SegmentedButton,
  SecondaryButton,
} from '@/components/foundfit/ui'
import { apiRequest } from '@/lib/api'
import { colors, spacing } from '@/lib/theme'
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
import { openExternalUrl } from '@/lib/external-url'
import { useAuth } from '@/providers/auth-provider'
import type { MobileLibraryResponse } from '@/types/foundfit'

type StudioTab = 'daily' | 'guided' | 'browse' | 'random'

export default function LibraryScreen() {
  const { session } = useAuth()
  const [library, setLibrary] = useState<MobileLibraryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<StudioTab>('daily')
  const [bodyPart, setBodyPart] = useState<WorkoutBodyPart>('full-body')
  const [goal, setGoal] = useState<WorkoutGoal>('strength')
  const [minutes, setMinutes] = useState<number>(20)
  const [browseBodyPart, setBrowseBodyPart] = useState<WorkoutBodyPart | 'all'>('all')
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null)
  const [activeWorkout, setActiveWorkout] = useState<GuidedWorkout>(() => getWorkoutOfTheDay())

  const loadLibrary = useCallback(async () => {
    if (!session?.access_token) return

    try {
      setLoading(true)
      const response = await apiRequest<MobileLibraryResponse>('/api/mobile/library', {
        accessToken: session.access_token,
      })
      setLibrary(response)
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  const filteredBlocks = useMemo(() => {
    return browseBodyPart === 'all'
      ? WORKOUT_BLOCKS
      : WORKOUT_BLOCKS.filter(
          (block) => block.bodyPart === browseBodyPart || block.bodyPart === 'full-body'
        )
  }, [browseBodyPart])

  const workoutOfTheDay = useMemo(() => getWorkoutOfTheDay(), [])

  function toggleBlock(blockId: string) {
    setSelectedBlockIds((current) =>
      current.includes(blockId)
        ? current.filter((id) => id !== blockId)
        : [...current, blockId]
    )
  }

  function buildGuidedWorkout() {
    setActiveWorkout(generateWorkoutFromPreferences({ minutes, bodyPart, goal }))
    setTab('guided')
  }

  function buildFromBlocks() {
    if (!selectedBlockIds.length) return
    setActiveWorkout(buildCustomWorkoutFromBlocks(selectedBlockIds))
  }

  return (
    <Screen
      title="Virtual Studio"
      subtitle="Pick today’s guided workout, build something quick, browse by body part, or let FoundFit surprise you."
      refreshing={false}
      onRefresh={loadLibrary}
      rightAction={
        library && library.hasAccess ? (
          <SecondaryButton
            label="Full Library"
            onPress={() => openExternalUrl(library.access.accessUrl)}
          />
        ) : undefined
      }
    >
      {loading || !library ? (
        <SectionCard>
          <Text style={styles.loadingText}>Loading your virtual studio…</Text>
        </SectionCard>
      ) : !library.hasAccess ? (
        <EmptyState
          title="Video library locked"
          message={library.message}
        />
      ) : (
        <>
          <SectionCard>
            <SectionTitle
              title="Access"
              subtitle="Your guided experience is active."
              action={<Pill label={library.access.serviceName} />}
            />
            <Text style={styles.supportingCopy}>
              Use the guided flows below, or open the full library whenever you want to browse the broader catalog.
            </Text>
          </SectionCard>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            <SegmentedButton label="Workout of the Day" selected={tab === 'daily'} onPress={() => setTab('daily')} />
            <SegmentedButton label="Build for Me" selected={tab === 'guided'} onPress={() => setTab('guided')} />
            <SegmentedButton label="Browse + Build" selected={tab === 'browse'} onPress={() => setTab('browse')} />
            <SegmentedButton label="Surprise Me" selected={tab === 'random'} onPress={() => setTab('random')} />
          </ScrollView>

          {tab === 'daily' ? (
            <SectionCard>
              <SectionTitle
                title={workoutOfTheDay.title}
                subtitle={workoutOfTheDay.monthlyTheme?.summary || workoutOfTheDay.summary}
              />
              <Pill label={workoutOfTheDay.monthlyTheme?.label || 'Monthly theme'} />
              <Text style={styles.supportingCopy}>{workoutOfTheDay.summary}</Text>
              <PrimaryButton label="Load Today’s Workout" onPress={() => setActiveWorkout(workoutOfTheDay)} />
            </SectionCard>
          ) : null}

          {tab === 'guided' ? (
            <SectionCard>
              <SectionTitle title="Build for Me" subtitle="Tell us how much time you have and what you want to feel." />

              <Text style={styles.fieldTitle}>Time</Text>
              <View style={styles.optionWrap}>
                {TIME_OPTIONS.map((option) => (
                  <SegmentedButton
                    key={option}
                    label={`${option} min`}
                    selected={minutes === option}
                    onPress={() => setMinutes(option)}
                  />
                ))}
              </View>

              <Text style={styles.fieldTitle}>Body Focus</Text>
              <View style={styles.optionWrap}>
                {FOCUS_OPTIONS.map((option) => (
                  <SegmentedButton
                    key={option.value}
                    label={option.label}
                    selected={bodyPart === option.value}
                    onPress={() => setBodyPart(option.value)}
                  />
                ))}
              </View>

              <Text style={styles.fieldTitle}>Training Style</Text>
              <View style={styles.optionWrap}>
                {GOAL_OPTIONS.map((option) => (
                  <SegmentedButton
                    key={option.value}
                    label={option.label}
                    selected={goal === option.value}
                    onPress={() => setGoal(option.value)}
                  />
                ))}
              </View>

              <PrimaryButton label="Generate Workout" onPress={buildGuidedWorkout} />
            </SectionCard>
          ) : null}

          {tab === 'browse' ? (
            <SectionCard>
              <SectionTitle title="Browse + Build" subtitle="Mix blocks by body part and create your own session." />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionWrap}>
                {BODY_PART_OPTIONS.map((option) => (
                  <SegmentedButton
                    key={option.value}
                    label={option.label}
                    selected={browseBodyPart === option.value}
                    onPress={() => setBrowseBodyPart(option.value)}
                  />
                ))}
              </ScrollView>

              <View style={styles.blockList}>
                {filteredBlocks.map((block) => {
                  const selected = selectedBlockIds.includes(block.id)

                  return (
                    <View
                      key={block.id}
                      style={[styles.blockCard, selected ? styles.blockCardSelected : null]}
                    >
                      <Text style={styles.blockTitle}>{block.title}</Text>
                      <Text style={styles.blockMeta}>
                        {getBodyPartLabel(block.bodyPart)} • {getGoalLabel(block.goal)} • {block.durationMinutes} min
                      </Text>
                      <Text style={styles.blockSummary}>{block.summary}</Text>
                      <SecondaryButton
                        label={selected ? 'Remove Block' : 'Add Block'}
                        onPress={() => toggleBlock(block.id)}
                      />
                    </View>
                  )
                })}
              </View>

              <PrimaryButton
                label={selectedBlockIds.length ? `Build ${selectedBlockIds.length} Selected Block(s)` : 'Select Blocks First'}
                onPress={buildFromBlocks}
                disabled={!selectedBlockIds.length}
              />
            </SectionCard>
          ) : null}

          {tab === 'random' ? (
            <SectionCard>
              <SectionTitle title="Surprise Me" subtitle="Take the decision-making out of it and just move." />
              <Text style={styles.supportingCopy}>
                We’ll spin up a balanced session from the catalog based on a random focus, pace, and format.
              </Text>
              <PrimaryButton label="Generate Random Workout" onPress={() => setActiveWorkout(generateSurpriseWorkout())} />
            </SectionCard>
          ) : null}

          <SectionCard>
            <SectionTitle
              title={activeWorkout.title}
              subtitle={`${activeWorkout.durationMinutes} min • ${activeWorkout.bodyParts.map((part) => getBodyPartLabel(part)).join(', ')} • ${getGoalLabel(activeWorkout.goal)}`}
            />
            <Text style={styles.supportingCopy}>{activeWorkout.trainerNote}</Text>

            <View style={styles.sectionList}>
              {activeWorkout.sections.map((section) => (
                <View key={section.id} style={styles.workoutSection}>
                  <Text style={styles.workoutSectionTitle}>
                    {section.title} • {section.durationMinutes} min
                  </Text>
                  <Text style={styles.blockSummary}>{section.summary}</Text>
                  {section.exercises.map((exercisePlan) => (
                    <View key={`${section.id}-${exercisePlan.exerciseId}`} style={styles.exerciseCard}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.exerciseName}>{exercisePlan.exercise.name}</Text>
                        <Text style={styles.exerciseMeta}>
                          {exercisePlan.prescription} • Rest {exercisePlan.rest}
                        </Text>
                        {exercisePlan.note ? <Text style={styles.blockSummary}>{exercisePlan.note}</Text> : null}
                      </View>
                      <SecondaryButton label="How To" onPress={() => setSelectedExercise(exercisePlan.exercise)} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </SectionCard>

          <Modal
            visible={Boolean(selectedExercise)}
            animationType="slide"
            transparent
            onRequestClose={() => setSelectedExercise(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                {selectedExercise ? (
                  <>
                    <Text style={styles.modalTitle}>{selectedExercise.name}</Text>
                    <Text style={styles.modalSubtitle}>{selectedExercise.summary}</Text>

                    <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
                      <Text style={styles.modalLabel}>Setup</Text>
                      <Text style={styles.modalText}>{selectedExercise.setup}</Text>

                      <Text style={styles.modalLabel}>How to Perform</Text>
                      {selectedExercise.howTo.map((step, index) => (
                        <Text key={index} style={styles.modalText}>
                          {index + 1}. {step}
                        </Text>
                      ))}

                      <Text style={styles.modalLabel}>Coaching Cues</Text>
                      {selectedExercise.coachingCues.map((cue, index) => (
                        <Text key={index} style={styles.modalText}>• {cue}</Text>
                      ))}

                      <Text style={styles.modalLabel}>Common Mistakes</Text>
                      {selectedExercise.commonMistakes.map((mistake, index) => (
                        <Text key={index} style={styles.modalText}>• {mistake}</Text>
                      ))}
                    </ScrollView>

                    <View style={styles.modalActions}>
                      <SecondaryButton label="Close" onPress={() => setSelectedExercise(null)} />
                      <PrimaryButton
                        label="Open Full Library"
                        onPress={() => openExternalUrl(library.access.accessUrl)}
                      />
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          </Modal>
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  loadingText: {
    color: colors.textMuted,
  },
  supportingCopy: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  tabRow: {
    gap: spacing.sm,
  },
  fieldTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  blockList: {
    gap: spacing.md,
  },
  blockCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  blockCardSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.surfaceMuted,
  },
  blockTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  blockMeta: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  blockSummary: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  sectionList: {
    gap: spacing.md,
  },
  workoutSection: {
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  workoutSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  exerciseCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  exerciseMeta: {
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 5, 25, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  modalText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  modalActions: {
    gap: spacing.sm,
  },
})
