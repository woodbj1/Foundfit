import type { Service } from '@/lib/types'

type TrainerAssignableService = Pick<Service, 'is_session' | 'type'>

export function requiresTrainerSelectionForService(
  service?: TrainerAssignableService | null
) {
  if (!service) return false
  return service.is_session !== false || service.type === 'meal_plan'
}

export function getEarningEntryType(serviceType?: string | null) {
  switch (serviceType) {
    case 'single':
      return 'single_session_purchase' as const
    case 'pack':
      return 'pack_purchase' as const
    case 'meal_plan':
      return 'meal_plan_purchase' as const
    default:
      return null
  }
}
