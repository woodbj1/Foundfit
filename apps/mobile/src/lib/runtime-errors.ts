type Listener = (message: string | null) => void

let latestRuntimeError: string | null = null
const listeners = new Set<Listener>()

type GlobalErrorUtils = {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void
  setGlobalHandler?: (
    handler: (error: unknown, isFatal?: boolean) => void
  ) => void
}

const errorUtils =
  ((globalThis as typeof globalThis & { ErrorUtils?: GlobalErrorUtils }).ErrorUtils as
    | GlobalErrorUtils
    | undefined) ?? undefined

function notifyListeners() {
  for (const listener of listeners) {
    listener(latestRuntimeError)
  }
}

if (errorUtils?.setGlobalHandler) {
  errorUtils.setGlobalHandler((error, isFatal) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown runtime error'

    latestRuntimeError = `${isFatal ? 'Fatal' : 'Runtime'} error: ${message}`
    notifyListeners()
  })
}

export function getLatestRuntimeError() {
  return latestRuntimeError
}

export function subscribeToRuntimeErrors(listener: Listener) {
  listeners.add(listener)
  listener(latestRuntimeError)

  return () => {
    listeners.delete(listener)
  }
}
