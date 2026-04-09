import { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'

import { Screen } from '@/components/foundfit/screen'
import {
  EmptyState,
  MetricCard,
  PrimaryButton,
  SectionCard,
  SectionTitle,
  SecondaryButton,
} from '@/components/foundfit/ui'
import { apiRequest } from '@/lib/api'
import { formatDateInTimeZone, formatPrice, formatTimeRangeInTimeZone, getLocationLabel } from '@/lib/format'
import { colors, spacing } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'
import type { MobileDashboardResponse } from '@/types/foundfit'

export default function DashboardScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const [data, setData] = useState<MobileDashboardResponse | null>(null)
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

      const response = await apiRequest<MobileDashboardResponse>('/api/mobile/dashboard', {
        accessToken: session.access_token,
      })

      setData(response)
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

  return (
    <Screen
      title={data?.profile?.full_name ? `Hey, ${data.profile.full_name.split(' ')[0]}!` : 'FoundFit'}
      subtitle="Your training home for sessions, progress, and your virtual studio."
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
          <View style={styles.metricsRow}>
            <MetricCard
              label="Active Plan"
              value={data.summary.activePlanName || 'None'}
              detail={data.access.primarySubscription ? 'Recurring subscription active' : 'Ready when you are'}
            />
            <MetricCard
              label="Sessions Left"
              value={data.summary.sessionsLeft == null ? 'Unlimited' : String(data.summary.sessionsLeft)}
              detail="Available for studio, in-home, or virtual booking"
            />
          </View>

          <View style={styles.metricsRow}>
            <MetricCard
              label="Confirmed"
              value={String(data.summary.confirmedCount)}
              detail="Upcoming sessions already on the calendar"
            />
            <MetricCard
              label="Pending"
              value={String(data.summary.pendingCount)}
              detail="Waiting on trainer review"
            />
          </View>

          <SectionCard>
            <SectionTitle
              title="Quick Actions"
              subtitle="Jump into what you need next."
            />
            <View style={styles.actionRow}>
              <PrimaryButton label="Book a Session" onPress={() => router.push('/(app)/book')} />
              <SecondaryButton label="View Sessions" onPress={() => router.push('/(app)/sessions')} />
            </View>
            {data.access.libraryAccess ? (
              <View style={{ marginTop: spacing.sm }}>
                <SecondaryButton label="Open Virtual Studio" onPress={() => router.push('/(app)/library')} />
              </View>
            ) : null}
          </SectionCard>

          <SectionCard>
            <SectionTitle
              title="Upcoming Sessions"
              subtitle="Your next confirmed and pending sessions."
            />
            {data.bookings.length === 0 ? (
              <EmptyState
                title="No upcoming sessions"
                message="As soon as you book a session, it will show up here."
                action={<PrimaryButton label="Book Your First Session" onPress={() => router.push('/(app)/book')} />}
              />
            ) : (
              <View style={styles.listWrap}>
                {data.bookings.map((booking) => (
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
                      <Text style={styles.sessionMeta}>
                        {booking.serviceName} • {getLocationLabel(booking.locationType)}
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

          <SectionCard>
            <SectionTitle
              title="Current Access"
              subtitle="What is active on your account right now."
            />
            {data.access.primarySubscription ? (
              <View style={styles.accessCard}>
                <Text style={styles.accessTitle}>{data.access.primarySubscription.serviceName}</Text>
                <Text style={styles.accessMeta}>
                  Renews {formatDateInTimeZone(data.access.primarySubscription.renewsAt)}
                </Text>
                {data.access.primarySubscription.unitAmountCents ? (
                  <Text style={styles.accessMeta}>
                    {formatPrice(data.access.primarySubscription.unitAmountCents)} billed monthly
                  </Text>
                ) : null}
              </View>
            ) : null}

            {data.access.activePacks.map((pack) => (
              <View key={pack.id} style={styles.accessCard}>
                <Text style={styles.accessTitle}>{pack.serviceName}</Text>
                <Text style={styles.accessMeta}>{pack.remainingSessions} sessions remaining</Text>
                {pack.expiresAt ? (
                  <Text style={styles.accessMeta}>Expires {formatDateInTimeZone(pack.expiresAt)}</Text>
                ) : null}
              </View>
            ))}

            {data.access.libraryAccess ? (
              <View style={styles.accessCard}>
                <Text style={styles.accessTitle}>{data.access.libraryAccess.serviceName}</Text>
                <Text style={styles.accessMeta}>Virtual studio access is active.</Text>
                <View style={{ marginTop: spacing.sm }}>
                  <SecondaryButton
                    label="Open Full Library"
                    onPress={() => WebBrowser.openBrowserAsync(data.access.libraryAccess!.accessUrl)}
                  />
                </View>
              </View>
            ) : null}
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
