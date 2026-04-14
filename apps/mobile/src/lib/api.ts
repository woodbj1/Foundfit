import { env } from '@/lib/env'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ApiOptions = RequestInit & {
  accessToken?: string | null
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { accessToken, headers, ...rest } = options

  const response = await fetch(`${env.appUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(headers || {}),
    },
  })

  const text = await response.text()
  let data: any = null

  try {
    data = text ? JSON.parse(text) : null
  } catch (parseError) {
    throw new ApiError('Invalid JSON response from server', response.status)
  }

  if (!response.ok) {
    throw new ApiError(data?.error || 'Request failed', response.status)
  }

  return data as T
}
