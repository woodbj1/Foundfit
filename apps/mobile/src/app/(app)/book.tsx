import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { addDays, format } from 'date-fns'

import { Screen } from '@/components/foundfit/screen'
import {
  EmptyState,
  Field,
  Pill,
  PrimaryButton,
  SectionCard,
  SectionTitle,
  SegmentedButton,
} from '@/components/foundfit/ui'
import { apiRequest } from '@/lib/api'
import {
  formatDateInTimeZone,
  formatRelativeMonthLabel,
  formatTimeInTimeZone,
  formatTimeRangeInTimeZone,
} from '@/lib/format'
import { colors, spacing } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'
import type { MobileBookingContextResponse, MobileBookableService, MobileTrainerOption } from '@/types/foundfit'

type TimeSlot = {
  start: string
  end: string
}

type AvailableSlotsResponse = {
  slots: TimeSlot[]
  message?: string | null
}

export default function BookScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ reschedule?: string }>()
  const { session } = useAuth()
  const [context, setContext] = useState<MobileBookingContextResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [selectedService, setSelectedService] = useState<MobileBookableService | null>(null)
  const [selectedTrainer, setSelectedTrainer] = useState<MobileTrainerOption | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null)

  const loadContext = useCallback(async () => {
    if (!session?.access_token) return

    try {
      setLoading(true)
      const query = params.reschedule ? `?reschedule=${params.reschedule}` : ''
      const response = await apiRequest<MobileBookingContextResponse>(`/api/mobile/booking-context${query}`, {
        accessToken: session.access_token,
      })

      setContext(response)

      // Auto-select service (prefer virtual/daily services)
      const virtualServices = response.services.filter(
        (s) => s.fulfillmentType === 'daily' || s.fulfillmentType === 'hybrid' || s.fulfillmentType === 'booking'
      )

      const nextService =
        response.rescheduleBooking
          ? response.services.find((service) => service.serviceId === response.rescheduleBooking?.serviceId) || null
          : virtualServices.length === 1
            ? virtualServices[0]
            : virtualServices[0] || null

      setSelectedService(nextService)

      const nextTrainer =
        response.rescheduleBooking
          ? response.trainers.find((trainer) => trainer.id === response.rescheduleBooking?.trainerId) || null
          : nextService?.trainerId
            ? response.trainers.find((trainer) => trainer.id === nextService.trainerId) || null
            : response.trainers.length === 1
              ? response.trainers[0]
              : null

      setSelectedTrainer(nextTrainer)
      setSelectedDate(
        response.rescheduleBooking
          ? response.rescheduleBooking.startTime.slice(0, 10)
          : format(new Date(), 'yyyy-MM-dd')
      )
      setNotes(response.rescheduleBooking?.notes || '')
    } catch (error) {
      Alert.alert('Could not load booking options', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }, [params.reschedule, session?.access_token])

  useEffect(() => {
    void loadContext()
  }, [loadContext])

  const trainerOptions = useMemo(() => {
    if (!context || !selectedService?.trainerId) return context?.trainers || []
    return context.trainers.filter((trainer) => trainer.id === selectedService.trainerId)
  }, [context, selectedService?.trainerId])

  useEffect(() => {
    if (!selectedService) return

    if (selectedService.trainerId) {
      const pinnedTrainer = context?.trainers.find((trainer) => trainer.id === selectedService.trainerId) || null
      setSelectedTrainer(pinnedTrainer)
      return
    }

    if (selectedTrainer && trainerOptions.some((trainer) => trainer.id === selectedTrainer.id)) {
      return
    }

    setSelectedTrainer(trainerOptions.length === 1 ? trainerOptions[0] : null)
  }, [context?.trainers, selectedService, selectedTrainer, trainerOptions])

  useEffect(() => {
    async function loadSlots() {
      if (!session?.access_token || !selectedService || !selectedTrainer || !selectedDate) {
        return
      }

      try {
        setSlotsLoading(true)
        setSlots([])
        setSelectedSlot(null)
        setSlotsMessage(null)

        const searchParams = new URLSearchParams({
          date: selectedDate,
          trainer_id: selectedTrainer.id,
          service_id: selectedService.serviceId,
        })

        if (context?.rescheduleBooking?.id) {
          searchParams.set('exclude_booking_id', context.rescheduleBooking.id)
        }

        const response = await apiRequest<AvailableSlotsResponse>(`/api/available-slots?${searchParams.toString()}`, {
          accessToken: session.access_token,
        })

        setSlots(response.slots || [])
        setSlotsMessage(response.message || null)

        if (
          context?.rescheduleBooking &&
          context.rescheduleBooking.startTime.slice(0, 10) === selectedDate
        ) {
          const existingSlot = response.slots.find((slot) => slot.start === context.rescheduleBooking?.startTime)
          if (existingSlot) {
            setSelectedSlot(existingSlot)
          }
        }
      } catch (error) {
        setSlotsMessage(error instanceof Error ? error.message : 'Could not load time slots.')
      } finally {
        setSlotsLoading(false)
      }
    }

    loadSlots()
  }, [context?.rescheduleBooking, selectedDate, selectedService, selectedTrainer, session?.access_token])

  async function handleSubmit() {
    if (!session?.access_token || !selectedService || !selectedTrainer || !selectedSlot) {
      return
    }

    try {
      setBookingLoading(true)
      const isReschedule = Boolean(context?.rescheduleBooking)
      const path = isReschedule
        ? `/api/bookings/${context?.rescheduleBooking?.id}`
        : '/api/bookings'

      await apiRequest(path, {
        accessToken: session.access_token,
        method: isReschedule ? 'PUT' : 'POST',
        body: JSON.stringify({
          service_id: selectedService.serviceId,
          trainer_id: selectedTrainer.id,
          start_time: selectedSlot.start,
          location_type: 'virtual',
          notes: notes.trim() || undefined,
        }),
      })

      Alert.alert(
        isReschedule ? 'Session updated' : 'Virtual session booked',
        isReschedule
          ? 'Your session has been rescheduled.'
          : 'Your trainer will be notified. You\'ll get a video link once confirmed.'
      )
      router.replace('/(app)/sessions')
    } catch (error) {
      Alert.alert('Could not save booking', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setBookingLoading(false)
    }
  }

  const availableDates = useMemo(() => {
    if (!context) return []
    return Array.from({ length: context.bookingWindowDays }, (_, index) => {
      const date = addDays(new Date(), index)
      return {
        key: format(date, 'yyyy-MM-dd'),
        label: formatRelativeMonthLabel(date),
      }
    })
  }, [context])

  return (
    <Screen
      title={context?.rescheduleBooking ? 'Reschedule Session' : 'Book Virtual Session'}
      subtitle="Schedule a 1-on-1 virtual session with your trainer. $50/hour."
      refreshing={false}
      onRefresh={() => {
        void loadContext()
      }}
    >
      {loading || !context ? (
        <SectionCard>
          <Text style={styles.loadingText}>Loading booking options…</Text>
        </SectionCard>
      ) : context.services.length === 0 && !context.rescheduleBooking ? (
        <EmptyState
          title="No active booking access"
          message="Your Virtual Studio subscription includes access to book 1-on-1 virtual sessions. Contact your trainer if you're having trouble."
        />
      ) : (
        <>
          {context.rescheduleBooking ? (
            <SectionCard>
              <SectionTitle
                title="Current Session"
                subtitle={`${context.rescheduleBooking.serviceName} with ${context.rescheduleBooking.trainerName}`}
              />
              <Text style={styles.sessionMeta}>
                {formatTimeRangeInTimeZone(
                  context.rescheduleBooking.startTime,
                  context.rescheduleBooking.endTime,
                  selectedTrainer?.timezone || 'America/New_York'
                )}{' '}
                on {formatDateInTimeZone(context.rescheduleBooking.startTime, selectedTrainer?.timezone || 'America/New_York')}
              </Text>
            </SectionCard>
          ) : null}

          {/* Service selection - show if multiple services */}
          {context.services.length > 1 ? (
            <SectionCard>
              <SectionTitle title="1. Service" subtitle="Select your session type." />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {context.services.map((service) => {
                  const selected = selectedService?.serviceId === service.serviceId
                  return (
                    <SegmentedButton
                      key={service.serviceId}
                      label={
                        service.remainingSessions == null
                          ? `${service.name}`
                          : `${service.name} - ${service.remainingSessions} left`
                      }
                      selected={selected}
                      onPress={() => setSelectedService(service)}
                    />
                  )
                })}
              </ScrollView>
            </SectionCard>
          ) : selectedService ? (
            <SectionCard>
              <Pill label={`${selectedService.name} • Virtual`} />
            </SectionCard>
          ) : null}

          {/* Trainer selection - show if multiple trainers */}
          {trainerOptions.length > 1 ? (
            <SectionCard>
              <SectionTitle title="Trainer" subtitle="Select your trainer." />
              <View style={styles.optionList}>
                {trainerOptions.map((trainer) => (
                  <PressableRow
                    key={trainer.id}
                    selected={selectedTrainer?.id === trainer.id}
                    title={trainer.fullName}
                    subtitle={trainer.bio || trainer.timezone}
                    onPress={() => setSelectedTrainer(trainer)}
                  />
                ))}
              </View>
            </SectionCard>
          ) : null}

          <SectionCard>
            <SectionTitle title="Date" subtitle="Pick your preferred day." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {availableDates.map((date) => (
                <SegmentedButton
                  key={date.key}
                  label={date.label}
                  selected={selectedDate === date.key}
                  onPress={() => setSelectedDate(date.key)}
                />
              ))}
            </ScrollView>
          </SectionCard>

          <SectionCard>
            <SectionTitle title="Time" subtitle={slotsMessage || 'Select an available time slot.'} />
            {slotsLoading ? (
              <Text style={styles.loadingText}>Checking availability…</Text>
            ) : slots.length === 0 ? (
              <EmptyState
                title="No open slots"
                message={slotsMessage || 'Try another date or trainer.'}
              />
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((slot) => (
                  <SegmentedButton
                    key={slot.start}
                    label={formatTimeInTimeZone(slot.start, selectedTrainer?.timezone || 'America/New_York')}
                    selected={selectedSlot?.start === slot.start}
                    onPress={() => setSelectedSlot(slot)}
                  />
                ))}
              </View>
            )}
          </SectionCard>

          <SectionCard>
            <Field
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything your trainer should know?"
              multiline
            />

            <PrimaryButton
              label={context.rescheduleBooking ? 'Update Session' : 'Book Virtual Session'}
              onPress={handleSubmit}
              disabled={!selectedService || !selectedTrainer || !selectedSlot}
              loading={bookingLoading}
            />
          </SectionCard>
        </>
      )}
    </Screen>
  )
}

function PressableRow({
  selected,
  title,
  subtitle,
  onPress,
}: {
  selected: boolean
  title: string
  subtitle: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pressableRow,
        selected ? styles.pressableRowSelected : null,
      ]}
    >
      <Text style={styles.pressableTitle}>
        {title}
      </Text>
      <Text style={styles.pressableSubtitle}>
        {subtitle}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  loadingText: {
    color: colors.textMuted,
  },
  chipRow: {
    gap: spacing.sm,
    flexDirection: 'row',
  },
  optionList: {
    gap: spacing.sm,
  },
  pressableRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 4,
  },
  pressableRowSelected: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primaryDark,
  },
  pressableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  pressableSubtitle: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sessionMeta: {
    color: colors.textMuted,
    lineHeight: 22,
  },
})
