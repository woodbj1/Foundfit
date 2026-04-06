const STORAGE_PREFIX_PATTERN = /^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/meal-plans\//

export function normalizeMealPlanStoragePath(value: string) {
  if (!value) return value

  if (STORAGE_PREFIX_PATTERN.test(value)) {
    return value.replace(STORAGE_PREFIX_PATTERN, '').split('?')[0]
  }

  return value
}
