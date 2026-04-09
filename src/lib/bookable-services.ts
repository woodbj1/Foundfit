import { isPackExpired } from '@/lib/product-access'
import type { Service } from '@/lib/types'

type BookableServiceLike = Pick<
  Service,
  | 'id'
  | 'name'
  | 'description'
  | 'session_count'
  | 'duration_minutes'
  | 'fulfillment_type'
  | 'access_url'
  | 'is_session'
>

export type TrainerAwareBookableServiceOption<TService extends BookableServiceLike = BookableServiceLike> = {
  service: TService
  accessType: 'subscription' | 'pack'
  remainingSessions: number | null
  trainerId?: string | null
}

export function getTrainerAwareBookableServiceOptions<
  TService extends BookableServiceLike,
  TSubscription extends {
    trainer_id?: string | null
    service: TService | null
  },
  TPack extends {
    trainer_id?: string | null
    total_sessions: number
    used_sessions: number
    expires_at?: string | null
    service: TService | null
  },
>(subscriptions: TSubscription[], packs: TPack[]): TrainerAwareBookableServiceOption<TService>[] {
  const options = new Map<string, TrainerAwareBookableServiceOption<TService>>()

  for (const subscription of subscriptions) {
    if (!subscription.service || subscription.service.is_session === false) continue

    options.set(subscription.service.id, {
      service: subscription.service,
      accessType: 'subscription',
      remainingSessions: null,
      trainerId: subscription.trainer_id || null,
    })
  }

  for (const pack of packs) {
    if (
      !pack.service ||
      pack.service.is_session === false ||
      isPackExpired(pack) ||
      pack.used_sessions >= pack.total_sessions
    ) {
      continue
    }

    const remainingSessions = Math.max(pack.total_sessions - pack.used_sessions, 0)
    const existing = options.get(pack.service.id)

    if (existing) {
      if (existing.accessType === 'pack') {
        existing.remainingSessions = (existing.remainingSessions ?? 0) + remainingSessions
      }
      if (!existing.trainerId && pack.trainer_id) {
        existing.trainerId = pack.trainer_id
      }
      continue
    }

    options.set(pack.service.id, {
      service: pack.service,
      accessType: 'pack',
      remainingSessions,
      trainerId: pack.trainer_id || null,
    })
  }

  return Array.from(options.values())
}
