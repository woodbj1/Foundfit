import { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'

import { Screen } from '@/components/foundfit/screen'
import {
  EmptyState,
  Pill,
  PrimaryButton,
  SectionCard,
  SectionTitle,
  SecondaryButton,
} from '@/components/foundfit/ui'
import { apiRequest } from '@/lib/api'
import { openExternalUrl } from '@/lib/external-url'
import { formatTimeInTimeZone } from '@/lib/format'
import { colors, spacing } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'
import type { MobileLiveWorkoutResponse } from '@/types/foundfit'

export default function LiveScreen() {
  const { session } = useAuth()
  const [data, setData] = useState<MobileLiveWorkoutResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadLiveWorkout = useCallback(
    async (showRefresh = false) => {
      if (!session?.access_token) return

      try {
        if (showRefresh) setRefreshing(true)
        else setLoading(true)

        const response = await apiRequest<MobileLiveWorkoutResponse>(
          '/api/mobile/live-workout',
          { accessToken: session.access_token }
        )
        setData(response)
      } catch (error) {
        Alert.alert(
          'Could not load live workout',
          error instanceof Error ? error.message : 'Please try again.'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [session?.access_token]
  )

  useEffect(() => {
    void loadLiveWorkout()
  }, [loadLiveWorkout])

  // Auto-refresh every 30 seconds when there's a scheduled workout
  useEffect(() => {
    if (!data || !data.hasLiveWorkout || data.liveWorkout.status === 'ended') return

    const interval = setInterval(() => {
      void loadLiveWorkout()
    }, 30000)

    return () => clearInterval(interval)
  }, [data, loadLiveWorkout])

  async function handleJoin(url: string) {
    try {
      await openExternalUrl(url, 'Could not open the live workout link.')
    } catch (error) {
      Alert.alert(
        'Could not join',
        error instanceof Error ? error.message : 'Please try again.'
      )
    }
  }

  return (
    <Screen
      title="Daily Live Workout"
      subtitle="Join your trainer for today's group workout session."
      refreshing={refreshing}
      onRefresh={() => loadLiveWorkout(true)}
    >
      {loading ? (
        <SectionCard>
          <Text style={styles.loadingText}>Checking today's schedule…</Text>
        </SectionCard>
      ) : !data || !data.hasLiveWorkout ? (
        <EmptyState
          title="No live workout today"
          message={
            data && !data.hasLiveWorkout
              ? data.message
              : 'Check back tomorrow for the next live session.'
          }
        />
      ) : (
        <>
          <SectionCard>
            <View style={styles.statusRow}>
              <Text style={styles.workoutTitle}>{data.liveWorkout.title}</Text>
              <Pill
                label={data.liveWorkout.status === 'live' ? '● LIVE NOW' : 'Scheduled'}
                tone={data.liveWorkout.status === 'live' ? 'success' : 'default'}
              />
            </View>

            {data.liveWorkout.description ? (
              <Text style={styles.description}>{data.liveWorkout.description}</Text>
            ) : null}

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Trainer</Text>
                <Text style={styles.detailValue}>{data.liveWorkout.trainerName}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {formatTimeInTimeZone(
                    data.liveWorkout.startTime,
                    data.liveWorkout.trainerTimezone
                  )}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>
                  {data.liveWorkout.durationMinutes} min
                </Text>
              </View>
            </View>
          </SectionCard>

          {data.liveWorkout.status === 'live' && data.joinUrl ? (
            <SectionCard style={styles.liveCard}>
              <SectionTitle
                title="Workout is Live!"
                subtitle="Your trainer is waiting. Tap below to join the group session."
              />
              <PrimaryButton
                label="Join Live Workout"
                onPress={() => handleJoin(data.joinUrl!)}
              />
            </SectionCard>
          ) : data.liveWorkout.status === 'live' && !data.joinUrl ? (
            <SectionCard>
              <SectionTitle
                title="Workout is Live"
                subtitle="The join link is being prepared. Pull to refresh."
              />
              <SecondaryButton
                label="Refresh"
                onPress={() => loadLiveWorkout(true)}
              />
            </SectionCard>
          ) : (
            <SectionCard>
              <SectionTitle
                title="Coming Up"
                subtitle="The trainer hasn't started yet. This page will auto-refresh when the workout goes live."
              />
              <Text style={styles.description}>
                The join button will appear once your trainer starts the session.
                You can also pull down to refresh.
              </Text>
            </SectionCard>
          )}

          <SectionCard>
            <SectionTitle
              title="About Daily Live Workouts"
              subtitle="Every day, your trainer hosts a live group workout session."
            />
            <Text style={styles.description}>
              As a Virtual Studio member, you have access to every daily live
              workout. Sessions are interactive — your trainer can see you, coach
              your form, and keep you accountable.
            </Text>
          </SectionCard>
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  loadingText: {
    color: colors.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  workoutTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  description: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailItem: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  liveCard: {
    borderColor: colors.success,
    borderWidth: 2,
  },
})
