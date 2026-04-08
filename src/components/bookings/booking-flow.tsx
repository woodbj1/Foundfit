'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, format, startOfDay } from 'date-fns'
import { toast } from 'sonner'
import {
  Building2,
  ChevronRight,
  Library,
  Loader2,
  MapPin,
  Video,
} from 'lucide-react'

import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { LocationType, Profile, TimeSlot } from '@/lib/types'
import { isVirtualService, type BookableServiceOption } from '@/lib/product-access'

interface BookingTrainer {
  id: string
  user_id: string
  bio: string | null
  is_active: boolean
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

interface Props {
  trainers: BookingTrainer[]
  travelFee: number
  bookingWindowDays: number
  bookableServices: BookableServiceOption[]
}

export default function BookingFlow({
  trainers,
  travelFee,
  bookingWindowDays,
  bookableServices,
}: Props) {
  const router = useRouter()
  const [selectedService, setSelectedService] = useState<BookableServiceOption | null>(
    bookableServices.length === 1 ? bookableServices[0] : null
  )
  const [selectedTrainer, setSelectedTrainer] = useState<BookingTrainer | null>(
    trainers.length === 1 ? trainers[0] : null
  )
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [locationType, setLocationType] = useState<LocationType>('gym')
  const [travelAddress, setTravelAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)

  useEffect(() => {
    if (!selectedService || !selectedTrainer || !date) return

    const selectedDate = date
    const activeTrainer = selectedTrainer
    const activeService = selectedService

    async function loadSlots() {
      setSlotsLoading(true)
      setSelectedSlot(null)
      setSlots([])
      setSlotsMessage(null)

      try {
        const params = new URLSearchParams({
          date: format(selectedDate, 'yyyy-MM-dd'),
          trainer_id: activeTrainer.id,
          service_id: activeService.service.id,
        })
        const res = await fetch(`/api/available-slots?${params}`)
        const data = await res.json()
        if (data.slots) {
          setSlots(data.slots)
          setSlotsMessage(data.message || null)
        }
      } catch {
        toast.error('Failed to load available slots')
      } finally {
        setSlotsLoading(false)
      }
    }

    loadSlots()
  }, [date, selectedService, selectedTrainer])

  async function handleBook() {
    if (!selectedService || !selectedTrainer || !selectedSlot) return

    const virtualBooking = isVirtualService(selectedService.service)
    if (!virtualBooking && locationType === 'travel' && !travelAddress.trim()) {
      toast.error('Please enter your address for in-home training')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.service.id,
          trainer_id: selectedTrainer.id,
          start_time: selectedSlot.start,
          location_type: virtualBooking ? 'virtual' : locationType,
          travel_address: !virtualBooking && locationType === 'travel' ? travelAddress : undefined,
          notes: notes || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to book session')
      }

      toast.success("Booking request submitted! You'll be notified once it's approved.")
      router.push('/sessions')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const virtualBooking = selectedService ? isVirtualService(selectedService.service) : false
  const selectedServiceSessionsLeft = selectedService?.remainingSessions ?? 0
  const showTrainerStep = trainers.length > 0

  return (
    <div className="space-y-6">
      {bookableServices.length > 1 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              1
            </span>
            Select Service
          </h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {bookableServices.map((option) => {
              const isSelected = selectedService?.service.id === option.service.id
              const optionIsVirtual = isVirtualService(option.service)

              return (
                <button
                  key={option.service.id}
                  onClick={() => {
                    setSelectedService(option)
                    setDate(undefined)
                    setSlots([])
                    setSelectedSlot(null)
                    setLocationType('gym')
                    setTravelAddress('')
                  }}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {optionIsVirtual ? (
                      <Video className="h-5 w-5 text-primary" />
                    ) : (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{option.service.name}</p>
                      <Badge variant={optionIsVirtual ? 'secondary' : 'outline'}>
                        {optionIsVirtual ? 'Daily' : 'Studio'}
                      </Badge>
                      {!option.service.is_session && (
                        <Badge variant="outline">
                          <Library className="h-3 w-3 mr-1" />
                          Library
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {option.service.session_count
                        ? `${option.service.session_count} session${option.service.session_count !== 1 ? 's' : ''} included`
                        : option.accessType === 'subscription'
                          ? 'Active subscription access'
                          : 'Bookable service'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.remainingSessions == null
                        ? 'Unlimited access'
                        : `${option.remainingSessions} remaining`}
                    </p>
                  </div>
                  {isSelected && <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {bookableServices.length === 1 && selectedService && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg w-fit">
          {virtualBooking ? (
            <Video className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{selectedService.service.name}</span>
          <Badge variant="secondary">
            {selectedService.remainingSessions == null ? 'Unlimited' : `${selectedService.remainingSessions} left`}
          </Badge>
        </div>
      )}

      {selectedService && showTrainerStep && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              {bookableServices.length > 1 ? '2' : '1'}
            </span>
            Select Trainer
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trainers.map((trainer) => {
              const isSelected = selectedTrainer?.id === trainer.id
              const name = trainer.profile?.full_name ?? 'Trainer'

              return (
                <button
                  key={trainer.id}
                  onClick={() => {
                    setSelectedTrainer(trainer)
                    setDate(undefined)
                    setSlots([])
                    setSelectedSlot(null)
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{name}</p>
                    {trainer.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{trainer.bio}</p>
                    )}
                  </div>
                  {isSelected && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {trainers.length === 0 && (
        <p className="text-muted-foreground text-sm">No trainers are currently available.</p>
      )}

      {selectedService && selectedTrainer && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                  {bookableServices.length > 1
                    ? showTrainerStep ? '3' : '2'
                    : showTrainerStep ? '2' : '1'}
                </span>
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                Booking opens through {format(addDays(new Date(), bookingWindowDays - 1), 'MMMM d, yyyy')}.
              </p>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(day) => {
                  const dayStart = startOfDay(day)
                  const todayStart = startOfDay(new Date())
                  const lastBookableDay = startOfDay(addDays(todayStart, bookingWindowDays - 1))

                  return dayStart < todayStart || dayStart > lastBookableDay || day.getDay() === 0
                }}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                  {bookableServices.length > 1
                    ? showTrainerStep ? '4' : '3'
                    : showTrainerStep ? '3' : '2'}
                </span>
                Available Times
              </CardTitle>
              <CardDescription>
                {date ? format(date, 'EEEE, MMMM d, yyyy') : 'Select a date first'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!date ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Pick a date to see available times
                </p>
              ) : slotsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  {slotsMessage || 'No available slots for this date'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.start === slot.start

                    return (
                      <Button
                        key={slot.start}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedSlot(slot)}
                        className="text-sm"
                      >
                        {format(new Date(slot.start), 'h:mm a')}
                      </Button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                  {bookableServices.length > 1
                    ? showTrainerStep ? '5' : '4'
                    : showTrainerStep ? '4' : '3'}
                </span>
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {virtualBooking ? (
                <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                    <Video className="h-4 w-4" />
                    Daily virtual session
                  </div>
                  <p className="text-sm text-blue-700">
                    This session is delivered online. Once it is approved, FoundFit will attach a
                    Daily join link to the booking.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Location</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={locationType === 'gym' ? 'default' : 'outline'}
                      onClick={() => setLocationType('gym')}
                      className="gap-2"
                      size="sm"
                    >
                      <Building2 className="h-4 w-4" />
                      Studio
                    </Button>
                    <Button
                      variant={locationType === 'travel' ? 'default' : 'outline'}
                      onClick={() => setLocationType('travel')}
                      className="gap-2"
                      size="sm"
                    >
                      <MapPin className="h-4 w-4" />
                      My Home
                    </Button>
                  </div>
                  {locationType === 'travel' && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter your address"
                        value={travelAddress}
                        onChange={(event) => setTravelAddress(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Travel fee: ${(travelFee / 100).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Anything your trainer should know?"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                />
              </div>

              {selectedSlot && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                  <h4 className="font-medium text-sm">Booking Summary</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Service: {selectedService.service.name}</p>
                    <p>Date: {format(new Date(selectedSlot.start), 'EEE, MMM d, yyyy')}</p>
                    <p>
                      Time: {format(new Date(selectedSlot.start), 'h:mm a')} -{' '}
                      {format(new Date(selectedSlot.end), 'h:mm a')}
                    </p>
                    <p>Trainer: {selectedTrainer.profile?.full_name ?? 'Trainer'}</p>
                    <p>
                      Location: {virtualBooking
                        ? 'Daily virtual session'
                        : locationType === 'gym'
                          ? 'Studio'
                          : 'In-home training'}
                    </p>
                    {!virtualBooking && locationType === 'travel' && travelFee > 0 && (
                      <Badge variant="secondary" className="mt-1">
                        +${(travelFee / 100).toFixed(2)} travel fee
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {selectedService.accessType === 'pack' && selectedServiceSessionsLeft > 0 && selectedSlot && (
                <p className="text-xs text-muted-foreground">
                  After this booking: <strong>{selectedServiceSessionsLeft - 1}</strong> session
                  {selectedServiceSessionsLeft - 1 !== 1 ? 's' : ''} remaining
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleBook}
                disabled={!selectedSlot || loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Request Booking
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
