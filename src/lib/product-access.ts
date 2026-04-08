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
  expires_at?: string | null
  service?: ServiceLike | null
}

export type BookableServiceOption = {
  service: ServiceLike
  accessType: 'subscription' | 'pack'
  remainingSessions: number | null
}

export type LibraryAccessDetails = {
  accessUrl: string
  accessType: 'subscription' | 'pack'
  service: ServiceLike
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

export function isPackExpired(
  pack?: Pick<SessionPackWithService, 'expires_at'> | null,
  now = new Date()
) {
  if (!pack?.expires_at) return false

  const expiresAt = new Date(pack.expires_at)
  if (Number.isNaN(expiresAt.getTime())) return false

  return expiresAt.getTime() < now.getTime()
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

export function getActiveLibrarySubscriptions<T extends SubscriptionWithService>(
  subscriptions: ReadonlyArray<T> = []
) {
  return subscriptions.filter((subscription) => isVimeoLibraryService(subscription.service))
}

export function getActiveSessionPacks<T extends SessionPackWithService>(
  packs: ReadonlyArray<T> = []
) {
  return packs.filter(
    (pack) => !isPackExpired(pack) && isSessionService(pack.service) && remainingSessions(pack) > 0
  )
}

export function getActiveLibraryPacks<T extends SessionPackWithService>(
  packs: ReadonlyArray<T> = []
) {
  return packs.filter(
    (pack) => !isPackExpired(pack) && isVimeoLibraryService(pack.service) && remainingSessions(pack) > 0
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
  return getLibraryAccessDetails(subscriptions, [], fallbackUrl)?.accessUrl || null
}

export function getLibraryAccessDetails(
  subscriptions: ReadonlyArray<SubscriptionWithService> = [],
  packs: ReadonlyArray<SessionPackWithService> = [],
  fallbackUrl?: string | null
): LibraryAccessDetails | null {
  const librarySubscription = getActiveLibrarySubscriptions(subscriptions).find(
    (subscription) => subscription.service?.access_url || fallbackUrl
  )

  if (librarySubscription?.service) {
    const accessUrl = librarySubscription.service.access_url || fallbackUrl
    if (accessUrl) {
      return {
        accessUrl,
        accessType: 'subscription',
        service: librarySubscription.service,
        remainingSessions: null,
      }
    }
  }

  const libraryPack = getActiveLibraryPacks(packs).find(
    (pack) => pack.service?.access_url || fallbackUrl
  )

  if (libraryPack?.service) {
    const accessUrl = libraryPack.service.access_url || fallbackUrl
    if (accessUrl) {
      return {
        accessUrl,
        accessType: 'pack',
        service: libraryPack.service,
        remainingSessions: remainingSessions(libraryPack),
      }
    }
  }

  return null
}
