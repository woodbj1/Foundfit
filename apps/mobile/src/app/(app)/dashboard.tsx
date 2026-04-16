import { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { Screen } from '@/components/foundfit/screen'
import {
  EmptyState,
  MetricCard,
  Pill,
  PrimaryButton,
  SectionCard,
  SectionTitle,
  SecondaryButton,
} from '@/components/foundfit/ui'
import { apiRequest } from '@/lib/api'
import { formatDateInTimeZone, formatPrice, formatTimeInTimeZone, formatTimeRangeInTimeZone } from '@/lib/format'
import { colors, spacing } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'
import type { MobileDashboardResponse, MobileLiveWorkoutResponse } from '@/types/foundfit'

export default function DashboardScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const [data, setData] = useState<MobileDashboardResponse | null>(null)
  const [liveData, setLiveData] = useState<MobileLiveWorkoutResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboard = useCallback(async (showRefresh = false) => {
    if (!session?.access_token) return

    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const [dashboardResponse, liveResponse] = await Promise.all([
        apiRequest<MobileDashboardResponse>('/api/mobile/dashboard', {
          accessToken: session.access_token,
        }),
        apiRequest<MobileLiveWorkoutResponse>('/api/mobile/live-workout', {
          accessToken: session.access_token,
        }).catch(() => null),
      ])

      setData(dashboardResponse)
      if (liveResponse) setLiveData(liveResponse)
    } catch (error) {
      Alert.alert('Could not load dashboard', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const virtualBookings = data?.bookings.filter((b) => b.locationType === 'virtual') ?? []

  return (
    <Screen
      title={data?.profile?.full_name ? `Hey, ${data.profile.full_name.split(' ')[0]}!` : 'FoundFit'}
      subtitle="Your virtual studio home."
      refreshing={refreshing}
      onRefresh={() => loadDashboard(true)}
      rightAction={
        <SecondaryButton
          label="Profile"
          onPress={() => router.push('/(app)/profile')}
        />
      }
    >
      {loading || !data ? (
        <SectionCard>
          <Text style={styles.loadingText}>Loading your dashboard…</Text>
        </SectionCard>
      ) : (
        <>
          {/* Live Workout Banner */}
          {liveData?.hasLiveWorkout ? (
            <SectionCard style={liveData.liveWorkout.status === 'live' ? styles.liveBanner : undefined}>
              <View style={styles.liveRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.liveTitle}>{liveData.liveWorkout.title}</Text>
                  <Text style={styles.liveMeta}>
                    {liveData.liveWorkout.status === 'live'
                      ? `Live now with ${liveData.liveWorkout.trainerName}`
                      : `Today at ${formatTimeInTimeZone(liveData.liveWorkout.startTime, liveData.liveWorkout.trainerTimezone)} • ${liveData.liveWorkout.durationMinutes} min`}
                  </Text>
                </View>
                <Pill
                  label={liveData.liveWorkout.status === 'live' ? '● LIVE' : 'Today'}
                  tone={liveData.liveWorkout.status === 'live' ? 'success' : 'default'}
                />
              </View>
              <PrimaryButton
                label={liveData.liveWorkout.status === 'live' ? 'Join Live Workout' : 'View Details'}
                onPress={() => router.push('/(app)/live')}
              />
            </SectionCard>
          ) : null}

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <MetricCard
              label="Virtual Sessions"
              value={String(data.summary.confirmedCount)}
              detail="Confirmed upcoming"
            />
            <MetricCard
              label="Pending"
              value={String(data.summary.pendingCount)}
              detail="Awaiting confirmation"
            />
          </View>

          {/* Quick Actions */}
          <SectionCard>
            <SectionTitle
              title="Quick Actions"
              subtitle="Jump into what you need."
            />
            <View style={styles.actionRow}>
              <PrimaryButton label="Book Virtual Session" onPress={() => router.push('/(app)/book')} />
              <SecondaryButton label="Open Studio" onPress={() => router.push('/(app)/library')} />
            </View>
          </SectionCard>

          {/* Upcoming Virtual Sessions */}
          <SectionCard>
            <SectionTitle
              title="Upcoming Virtual Sessions"
              subtitle="Your next 1-on-1 sessions with your trainer."
            />
            {virtualBookings.length === 0 ? (
              <EmptyState
                title="No upcoming sessions"
                message="Book a 1-on-1 virtual session with your trainer."
                action={<PrimaryButton label="Book a Session" onPress={() => router.push('/(app)/book')} />}
              />
            ) : (
              <View style={styles.listWrap}>
                {virtualBookings.map((booking) => (
                  <View key={booking.id} style={styles.sessionRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.sessionDate}>
                        {formatDateInTimeZone(booking.startTime, booking.trainerTimezone)}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        {formatTimeRangeInTimeZone(
                          booking.startTime,
                          booking.endTime,
                          booking.trainerTimezone
                        )}{' '}
                        • {booking.trainerName}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.statusBadge,
                        booking.status === 'approved' ? styles.statusApproved : styles.statusPending,
                      ]}
                    >
                      {booking.status === 'approved' ? 'Confirmed' : 'Pending'}
                    </Text>
                  </View>
                ))}
                <SecondaryButton label="Manage Sessions" onPress={() => router.push('/(app)/sessions')} />
              </View>
            )}
          </SectionCard>

          {/* Subscription Status */}
          <SectionCard>
            <SectionTitle
              title="Your Membership"
              subtitle="Virtual Studio access details."
            />
            {data.access.primarySubscription ? (
              <View style={styles.accessCard}>
                <Text style={styles.accessTitle}>{data.access.primarySubscription.serviceName}</Text>
                <Text style={styles.accessMeta}>
                  Renews {formatDateInTimeZone(data.access.primarySubscription.renewsAt)}
                </Text>
                {data.access.primarySubscription.unitAmountCents ? (
                  <Text style={styles.accessMeta}>
                    {formatPrice(data.access.primarySubscription.unitAmountCents)}/month
                  </Text>
                ) : null}
              </View>
            ) : (
              <EmptyState
                title="No active membership"
                message="Subscribe to the Virtual Studio to access live workouts, 1-on-1 virtual sessions, and the workout library."
              />
            )}
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
  liveBanner: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  liveMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionRow: {
    gap: spacing.sm,
  },
  listWrap: {
    gap: spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sessionMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  statusApproved: {
    backgroundColor: '#ddf7e9',
    color: colors.success,
  },
  statusPending: {
    backgroundColor: '#fff5d6',
    color: '#b7791f',
  },
  accessCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: 4,
  },
  accessTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  accessMeta: {
    color: colors.textMuted,
  },
})
