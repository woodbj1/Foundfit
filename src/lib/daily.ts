const DAILY_API_BASE_URL = process.env.DAILY_API_BASE_URL || 'https://api.daily.co/v1'

type DailyRoomResponse = {
  name: string
  url: string
}

type DailyTokenResponse = {
  token: string
}

function getDailyApiKey() {
  const apiKey = process.env.DAILY_API_KEY
  if (!apiKey) {
    throw new Error('DAILY_API_KEY is not set')
  }
  return apiKey
}

function buildDailyApiUrl(path: string) {
  return `${DAILY_API_BASE_URL}${path}`
}

async function dailyRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildDailyApiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${getDailyApiKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Daily API error (${response.status}): ${errorText}`)
  }

  return response.json() as Promise<T>
}

function toUnixSeconds(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return Math.floor(date.getTime() / 1000)
}

export function isDailyConfigured() {
  return Boolean(process.env.DAILY_API_KEY)
}

export function getDailyRoomName(bookingId: string) {
  return `foundfit-${bookingId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)}`
}

export async function createDailyRoomForBooking(bookingId: string) {
  return dailyRequest<DailyRoomResponse>('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      name: getDailyRoomName(bookingId),
      privacy: 'private',
      properties: {
        enable_chat: true,
        enable_prejoin_ui: true,
        start_audio_off: true,
        start_video_off: true,
      },
    }),
  })
}

export async function createDailyMeetingToken(options: {
  roomName: string
  userName: string
  userId: string
  isOwner: boolean
  startTime: string
  endTime: string
}) {
  const nbf = toUnixSeconds(new Date(new Date(options.startTime).getTime() - 30 * 60 * 1000))
  const exp = toUnixSeconds(new Date(new Date(options.endTime).getTime() + 2 * 60 * 60 * 1000))

  return dailyRequest<DailyTokenResponse>('/meeting-tokens', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        room_name: options.roomName,
        user_name: options.userName,
        user_id: options.userId,
        is_owner: options.isOwner,
        nbf,
        exp,
        eject_at_token_exp: true,
        enable_prejoin_ui: true,
      },
    }),
  })
}

export function buildDailyJoinUrl(roomUrl: string, token: string) {
  const joinUrl = new URL(roomUrl)
  joinUrl.searchParams.set('t', token)
  return joinUrl.toString()
}

export function getDailyJoinAvailability(
  startTime: string,
  endTime: string,
  now = new Date()
) {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const opensAt = new Date(start.getTime() - 30 * 60 * 1000)
  const closesAt = new Date(end.getTime() + 2 * 60 * 60 * 1000)

  if (now < opensAt) {
    return {
      canJoin: false,
      message: 'This join link opens 30 minutes before the session starts.',
    }
  }

  if (now > closesAt) {
    return {
      canJoin: false,
      message: 'This Daily room has already closed.',
    }
  }

  return {
    canJoin: true,
    message: null,
  }
}
