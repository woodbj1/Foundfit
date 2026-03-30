'use client'

import { useEffect, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, MapPin, Building2, Clock, ChevronRight, User } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { TimeSlot, LocationType, Profile } from '@/lib/types'
interface BookingTrainer {
  id: string
  user_id: string
  bio: string | null
  is_active: boolean
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}
import { useRouter } from 'next/navigation'

interface Props {
  trainers: BookingTrainer[]
  travelFee: number
  isUnlimited: boolean
  sessionsLeft: number
}

export default function BookingFlow({ trainers, travelFee, isUnlimited, sessionsLeft }: Props) {
  const router = useRouter()
  const [selectedTrainer, setSelectedTrainer] = useState<BookingTrainer | null>(
    trainers.length === 1 ? trainers[0] : null
  )
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [locationType, setLocationType] = useState<LocationType>('gym')
  const [travelAddress, setTravelAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Load available slots when date or trainer changes
  useEffect(() => {
    if (!date || !selectedTrainer) return
    async function loadSlots() {
      setSlotsLoading(true)
      setSelectedSlot(null)
      setSlots([])
      try {
        const params = new URLSearchParams({
          date: format(date!, 'yyyy-MM-dd'),
          trainer_id: selectedTrainer!.id,
        })
        const res = await fetch(`/api/available-slots?${params}`)
        const data = await res.json()
        if (data.slots) setSlots(data.slots)
      } catch {
        toast.error('Failed to load available slots')
      }
      setSlotsLoading(false)
    }
    loadSlots()
  }, [date, selectedTrainer])

  async function handleBook() {
    if (!selectedSlot || !selectedTrainer) return
    if (locationType === 'travel' && !travelAddress.trim()) {
      toast.error('Please enter your address for in-home training')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: selectedTrainer.id,
          start_time: selectedSlot.start,
          location_type: locationType,
          travel_address: locationType === 'travel' ? travelAddress : undefined,
          notes: notes || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to book session')
        setLoading(false)
        return
      }

      toast.success("Booking request submitted! You'll be notified once it's approved.")
      router.push('/sessions')
    } catch {
      toast.error('Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select Trainer (only shown if multiple trainers) */}
      {trainers.length > 1 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
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

      {/* Single trainer: show selected trainer name */}
      {trainers.length === 1 && selectedTrainer && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg w-fit">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{selectedTrainer.profile?.full_name ?? 'Your Trainer'}</span>
        </div>
      )}

      {trainers.length === 0 && (
        <p className="text-muted-foreground text-sm">No trainers are currently available.</p>
      )}

      {/* Steps 2 + 3: Date/Time + Details (only shown once trainer is selected) */}
      {selectedTrainer && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                  {trainers.length > 1 ? '2' : '1'}
                </span>
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < new Date() || d.getDay() === 0}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                  {trainers.length > 1 ? '3' : '2'}
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
                  No available slots for this date
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

          {/* Session Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                  {trainers.length > 1 ? '4' : '3'}
                </span>
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Location */}
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
                      onChange={(e) => setTravelAddress(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Travel fee: ${(travelFee / 100).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Anything your trainer should know?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Summary */}
              {selectedSlot && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                  <h4 className="font-medium text-sm">Booking Summary</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>📅 {format(new Date(selectedSlot.start), 'EEE, MMM d, yyyy')}</p>
                    <p>🕐 {format(new Date(selectedSlot.start), 'h:mm a')} – {format(new Date(selectedSlot.end), 'h:mm a')}</p>
                    <p>👤 {selectedTrainer.profile?.full_name ?? 'Trainer'}</p>
                    <p>📍 {locationType === 'gym' ? 'Studio' : 'In-Home Training'}</p>
                    {locationType === 'travel' && travelFee > 0 && (
                      <Badge variant="secondary" className="mt-1">
                        +${(travelFee / 100).toFixed(2)} travel fee
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Package info */}
              {!isUnlimited && sessionsLeft > 0 && selectedSlot && (
                <p className="text-xs text-muted-foreground">
                  After this booking: <strong>{sessionsLeft - 1}</strong> session{sessionsLeft - 1 !== 1 ? 's' : ''} remaining
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
