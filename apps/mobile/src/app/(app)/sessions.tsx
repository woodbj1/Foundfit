import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { Screen } from '@/components/foundfit/screen'
import {
  EmptyState,
  Pill,
  PrimaryButton,
  SectionCard,
  SegmentedButton,
  SecondaryButton,
} from '@/components/foundfit/ui'
import { apiRequest } from '@/lib/api'
import { addSessionToCalendar } from '@/lib/calendar'
import { openExternalUrl } from '@/lib/external-url'
import { formatDateInTimeZone, formatTimeRangeInTimeZone, getLocationLabel } from '@/lib/format'
import { colors, spacing } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'
import type { MobileBooking, MobileSessionsResponse } from '@/types/foundfit'

type SessionFilter = 'upcoming' | 'past' | 'cancelled'

export default function SessionsScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const [filter, setFilter] = useState<SessionFilter>('upcoming')
  const [sessions, setSessions] = useState<MobileBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadSessions = useCallback(async (showRefresh = false) => {
    if (!session?.access_token) return

    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await apiRequest<MobileSessionsResponse>('/api/mobile/sessions', {
        accessToken: session.access_token,
      })

      setSessions(response.data)
    } catch (error) {
      Alert.alert('Could not load sessions', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  const filteredSessions = useMemo(() => {
    const now = Date.now()

    return sessions.filter((sessionItem) => {
      const startTime = new Date(sessionItem.startTime).getTime()

      if (filter === 'cancelled') {
        return sessionItem.status === 'cancelled'
      }

      if (filter === 'past') {
        return startTime < now && sessionItem.status !== 'cancelled'
      }

      return startTime >= now && ['approved', 'pending'].includes(sessionItem.status)
    })
  }, [filter, sessions])

  async function handleCancel(bookingId: string) {
    if (!session?.access_token) return

    Alert.alert('Cancel session?', 'This will remove the session from your upcoming schedule.', [
      { text: 'Keep Session', style: 'cancel' },
      {
        text: 'Cancel Session',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/bookings/${bookingId}`, {
              accessToken: session.access_token,
              method: 'DELETE',
            })
            await loadSessions(true)
          } catch (error) {
            Alert.alert('Could not cancel session', error instanceof Error ? error.message : 'Please try again.')
          }
        },
      },
    ])
  }

  async function handleJoin(bookingId: string) {
    if (!session?.access_token) return

    try {
      const response = await apiRequest<{ url: string }>(`/api/bookings/${bookingId}/daily-link`, {
        accessToken: session.access_token,
      })

      await openExternalUrl(response.url, 'Could not open the join link.')
    } catch (error) {
      Alert.alert('Could not join call', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  async function handleAddToCalendar(booking: MobileBooking) {
    try {
      await addSessionToCalendar(booking)
      Alert.alert('Added to calendar', 'The session is now in your device calendar.')
    } catch (error) {
      Alert.alert('Could not add to calendar', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  return (
    <Screen
      title="My Sessions"
      subtitle="Manage upcoming appointments, rebook quickly, and keep your week moving."
      refreshing={refreshing}
      onRefresh={() => loadSessions(true)}
    >
      <View style={styles.filterRow}>
        <SegmentedButton label="Upcoming" selected={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
        <SegmentedButton label="Past" selected={filter === 'past'} onPress={() => setFilter('past')} />
        <SegmentedButton label="Cancelled" selected={filter === 'cancelled'} onPress={() => setFilter('cancelled')} />
      </View>

      {loading ? (
        <SectionCard>
          <Text style={styles.loadingText}>Loading your sessions…</Text>
        </SectionCard>
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          message="Once you have sessions in this category, they will appear here."
          action={filter === 'upcoming' ? <PrimaryButton label="Book a Session" onPress={() => router.push('/(app)/book')} /> : undefined}
        />
      ) : (
        <View style={styles.listWrap}>
          {filteredSessions.map((booking) => (
            <SectionCard key={booking.id}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.sessionTitle}>
                    {formatDateInTimeZone(booking.startTime, booking.trainerTimezone)}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    {formatTimeRangeInTimeZone(booking.startTime, booking.endTime, booking.trainerTimezone)} •{' '}
                    {booking.trainerName}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    {booking.serviceName} • {getLocationLabel(booking.locationType)}
                  </Text>
                </View>
                <Pill
                  label={booking.status === 'approved' ? 'Confirmed' : booking.status}
                  tone={
                    booking.status === 'approved'
                      ? 'success'
                      : booking.status === 'pending'
                        ? 'warning'
                        : booking.status === 'cancelled'
                          ? 'danger'
                          : 'default'
                  }
                />
              </View>

              {filter !== 'cancelled' && new Date(booking.startTime).getTime() >= Date.now() ? (
                <View style={styles.actionWrap}>
                  <SecondaryButton label="Reschedule" onPress={() => router.push(`/book?reschedule=${booking.id}`)} />
                  <SecondaryButton label="Cancel" onPress={() => handleCancel(booking.id)} />
                  {booking.status === 'approved' ? (
                    <SecondaryButton label="Add to Calendar" onPress={() => handleAddToCalendar(booking)} />
                  ) : null}
                  {booking.status === 'approved' && booking.locationType === 'virtual' ? (
                    <PrimaryButton label="Join Call" onPress={() => handleJoin(booking.id)} />
                  ) : null}
                </View>
              ) : null}
            </SectionCard>
          ))}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
  },
  listWrap: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sessionMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  actionWrap: {
    gap: spacing.sm,
  },
})
