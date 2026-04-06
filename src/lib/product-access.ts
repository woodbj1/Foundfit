import type { FulfillmentType, Service } from '@/lib/types'

type ServiceLike = Pick<
  Service,
  'id' | 'name' | 'is_session' | 'fulfillment_type' | 'access_url' | 'session_count'
>

type SubscriptionWithService = {
  id: string
  service_id: string
  service?: ServiceLike | null
}

type SessionPackWithService = {
  id: string
  service_id: string
  total_sessions: number
  used_sessions: number
  service?: ServiceLike | null
}

export type BookableServiceOption = {
  service: ServiceLike
  accessType: 'subscription' | 'pack'
  remainingSessions: number | null
}

export function normalizeFulfillmentType(
  fulfillmentType?: FulfillmentType | string | null
): FulfillmentType {
  switch (fulfillmentType) {
    case 'daily':
    case 'vimeo':
    case 'hybrid':
      return fulfillmentType
    default:
      return 'booking'
  }
}

export function isSessionService(service?: Pick<ServiceLike, 'is_session'> | null) {
  return service?.is_session !== false
}

export function isVirtualService(
  service?: Pick<ServiceLike, 'fulfillment_type'> | null
) {
  const fulfillmentType = normalizeFulfillmentType(service?.fulfillment_type)
  return fulfillmentType === 'daily' || fulfillmentType === 'hybrid'
}

export function isVimeoLibraryService(
  service?: Pick<ServiceLike, 'fulfillment_type'> | null
) {
  const fulfillmentType = normalizeFulfillmentType(service?.fulfillment_type)
  return fulfillmentType === 'vimeo' || fulfillmentType === 'hybrid'
}

export function remainingSessions(
  pack?: Pick<SessionPackWithService, 'total_sessions' | 'used_sessions'> | null
) {
  if (!pack) return 0
  return Math.max(pack.total_sessions - pack.used_sessions, 0)
}

export function getActiveSessionSubscriptions<T extends SubscriptionWithService>(
  subscriptions: ReadonlyArray<T> = []
) {
  return subscriptions.filter((subscription) => isSessionService(subscription.service))
}

export function getActiveDigitalSubscriptions<T extends SubscriptionWithService>(
  subscriptions: ReadonlyArray<T> = []
) {
  return subscriptions.filter((subscription) => !isSessionService(subscription.service))
}

export function getActiveSessionPacks<T extends SessionPackWithService>(
  packs: ReadonlyArray<T> = []
) {
  return packs.filter(
    (pack) => isSessionService(pack.service) && remainingSessions(pack) > 0
  )
}

export function getPrimarySessionSubscription<T extends SubscriptionWithService>(
  subscriptions: ReadonlyArray<T> = []
) {
  return getActiveSessionSubscriptions(subscriptions)[0] ?? null
}

export function getBookableServiceOptions(
  subscriptions: ReadonlyArray<SubscriptionWithService> = [],
  packs: ReadonlyArray<SessionPackWithService> = []
): BookableServiceOption[] {
  const options = new Map<string, BookableServiceOption>()

  for (const subscription of getActiveSessionSubscriptions(subscriptions)) {
    if (!subscription.service) continue

    options.set(subscription.service.id, {
      service: subscription.service,
      accessType: 'subscription',
      remainingSessions: null,
    })
  }

  for (const pack of getActiveSessionPacks(packs)) {
    if (!pack.service) continue

    const existing = options.get(pack.service.id)
    if (existing) {
      if (existing.accessType === 'pack') {
        existing.remainingSessions =
          (existing.remainingSessions ?? 0) + remainingSessions(pack)
      }
      continue
    }

    options.set(pack.service.id, {
      service: pack.service,
      accessType: 'pack',
      remainingSessions: remainingSessions(pack),
    })
  }

  return Array.from(options.values())
}

export function getTotalRemainingSessions(
  packs: ReadonlyArray<SessionPackWithService> = []
) {
  return getActiveSessionPacks(packs).reduce(
    (sum, pack) => sum + remainingSessions(pack),
    0
  )
}

export function getLibraryAccessUrl(
  subscriptions: ReadonlyArray<SubscriptionWithService> = [],
  fallbackUrl?: string | null
) {
  const libraryService = getActiveDigitalSubscriptions(subscriptions).find(
    (subscription) => isVimeoLibraryService(subscription.service)
  )

  return libraryService?.service?.access_url || fallbackUrl || null
}
