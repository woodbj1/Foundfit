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
  getLocationLabel,
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

function isVirtualOnlyService(service?: MobileBookableService | null) {
  return service?.fulfillmentType === 'daily' || service?.fulfillmentType === 'hybrid'
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
  const [locationType, setLocationType] = useState<'gym' | 'travel' | 'virtual'>('gym')
  const [travelAddress, setTravelAddress] = useState('')
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

      const nextService =
        response.rescheduleBooking
          ? response.services.find((service) => service.serviceId === response.rescheduleBooking?.serviceId) || null
          : response.services.length === 1
            ? response.services[0]
            : null

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
      setLocationType(response.rescheduleBooking?.locationType || 'gym')
      setTravelAddress(response.rescheduleBooking?.travelAddress || '')
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
    if (isVirtualOnlyService(selectedService)) {
      setLocationType('virtual')
    } else if (!context?.virtualLocationEnabled && locationType === 'virtual') {
      setLocationType('gym')
    }
  }, [context?.virtualLocationEnabled, locationType, selectedService])

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

        const params = new URLSearchParams({
          date: selectedDate,
          trainer_id: selectedTrainer.id,
          service_id: selectedService.serviceId,
        })

        if (context?.rescheduleBooking?.id) {
          params.set('exclude_booking_id', context.rescheduleBooking.id)
        }

        const response = await apiRequest<AvailableSlotsResponse>(`/api/available-slots?${params.toString()}`, {
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

    if (locationType === 'travel' && !travelAddress.trim() && !isVirtualOnlyService(selectedService)) {
      Alert.alert('Address required', 'Please add the client-home address for this session.')
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
          location_type: isVirtualOnlyService(selectedService) ? 'virtual' : locationType,
          travel_address:
            !isVirtualOnlyService(selectedService) && locationType === 'travel'
              ? travelAddress.trim()
              : undefined,
          notes: notes.trim() || undefined,
        }),
      })

      Alert.alert(
        isReschedule ? 'Session updated' : 'Booking request submitted',
        isReschedule
          ? 'Your session has been rescheduled.'
          : 'Your trainer will be notified right away.'
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

  const supportsVirtualLocation =
    Boolean(context?.virtualLocationEnabled) && !isVirtualOnlyService(selectedService)

  return (
    <Screen
      title={context?.rescheduleBooking ? 'Reschedule Session' : 'Book a Session'}
      subtitle="Choose your trainer, an open time, and how you want to train."
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
          message="Buy or activate a session product on the web first, then your mobile booking flow will unlock here."
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

          <SectionCard>
            <SectionTitle title="1. Service" subtitle="Use your active plan or remaining sessions." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {context.services.map((service) => {
                const selected = selectedService?.serviceId === service.serviceId

                return (
                  <SegmentedButton
                    key={service.serviceId}
                    label={
                      service.remainingSessions == null
                        ? `${service.name} - Unlimited`
                        : `${service.name} - ${service.remainingSessions} left`
                    }
                    selected={selected}
                    onPress={() => setSelectedService(service)}
                  />
                )
              })}
            </ScrollView>
          </SectionCard>

          <SectionCard>
            <SectionTitle title="2. Trainer" subtitle="Every booking is tied to a trainer." />
            {trainerOptions.length === 0 ? (
              <EmptyState title="No trainers available" message="There are no bookable trainers set up yet." />
            ) : (
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
            )}
          </SectionCard>

          <SectionCard>
            <SectionTitle title="3. Date" subtitle="Booking opens within your current booking window." />
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
            <SectionTitle title="4. Time" subtitle={slotsMessage || 'Select one of the live open times below.'} />
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
            <SectionTitle title="5. Session Details" subtitle="Choose where you want the session delivered." />
            <View style={styles.chipRow}>
              <SegmentedButton
                label="Studio"
                selected={locationType === 'gym'}
                onPress={() => setLocationType('gym')}
              />
              <SegmentedButton
                label="My Home"
                selected={locationType === 'travel'}
                onPress={() => setLocationType('travel')}
              />
              {supportsVirtualLocation || isVirtualOnlyService(selectedService) ? (
                <SegmentedButton
                  label="Virtual"
                  selected={locationType === 'virtual'}
                  onPress={() => setLocationType('virtual')}
                />
              ) : null}
            </View>

            {locationType === 'travel' && !isVirtualOnlyService(selectedService) ? (
              <Field
                label="Client-home address"
                value={travelAddress}
                onChangeText={setTravelAddress}
                placeholder="Street address for in-home training"
              />
            ) : null}

            <Field
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything your trainer should know?"
              multiline
            />

            {selectedService ? (
              <Pill
                label={`${selectedService.name} • ${getLocationLabel(
                  isVirtualOnlyService(selectedService) ? 'virtual' : locationType
                )}`}
              />
            ) : null}

            <PrimaryButton
              label={context.rescheduleBooking ? 'Update Session' : 'Request Booking'}
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
