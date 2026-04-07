const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>()

function getCachedFormatter(cacheKey: string, factory: () => Intl.DateTimeFormat) {
  const existing = FORMATTER_CACHE.get(cacheKey)
  if (existing) {
    return existing
  }

  const formatter = factory()
  FORMATTER_CACHE.set(cacheKey, formatter)
  return formatter
}

function getDateTimeFormatter(timeZone: string) {
  return getCachedFormatter(`datetime:${timeZone}`, () =>
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    })
  )
}

function getDateFormatter(timeZone: string) {
  return getCachedFormatter(`date:${timeZone}`, () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  )
}

function getPartsRecord(parts: Intl.DateTimeFormatPart[]) {
  return parts.reduce<Record<string, string>>((record, part) => {
    if (part.type !== 'literal') {
      record[part.type] = part.value
    }
    return record
  }, {})
}

export function getDayOfWeekFromDateString(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

export function getCurrentDateInTimeZone(timeZone: string) {
  return getDateFormatter(timeZone).format(new Date())
}

export function getNextDateString(date: string) {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

export function zonedDateTimeToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const parts = getPartsRecord(getDateTimeFormatter(timeZone).formatToParts(utcGuess))
  const resolvedHour = Number(parts.hour ?? hour)

  const zonedAsUtc = Date.UTC(
    Number(parts.year ?? year),
    Number(parts.month ?? month) - 1,
    Number(parts.day ?? day),
    resolvedHour === 24 ? 0 : resolvedHour,
    Number(parts.minute ?? minute),
    Number(parts.second ?? 0)
  )

  return new Date(utcGuess.getTime() - (zonedAsUtc - utcGuess.getTime()))
}

export function getUtcRangeForDateInTimeZone(date: string, timeZone: string) {
  return {
    start: zonedDateTimeToUtc(date, '00:00', timeZone),
    end: zonedDateTimeToUtc(getNextDateString(date), '00:00', timeZone),
  }
}
