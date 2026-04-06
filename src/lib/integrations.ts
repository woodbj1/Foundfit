import type { Service } from '@/lib/types'

export type IntegrationStatusLevel = 'ready' | 'warning' | 'error' | 'optional'

export type IntegrationStatus = {
  id: string
  label: string
  level: IntegrationStatusLevel
  summary: string
  details: string
}

type ServiceIntegrationShape = Pick<Service, 'title' | 'fulfillment_type' | 'access_url' | 'is_active'>

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim())
}

function looksLikePlaceholder(value: string | undefined) {
  if (!hasValue(value)) {
    return false
  }

  const normalized = value!.trim().toLowerCase()
  return (
    normalized === 'placeholder' ||
    normalized.includes('your-') ||
    normalized.includes('your_') ||
    normalized.includes('changeme') ||
    normalized.includes('replace-me') ||
    normalized.includes('example')
  )
}

function isConfigured(value: string | undefined) {
  return hasValue(value) && !looksLikePlaceholder(value)
}

function getStripeMode(key: string | undefined) {
  if (!isConfigured(key)) {
    return null
  }

  if (key!.startsWith('pk_live_') || key!.startsWith('sk_live_')) {
    return 'live'
  }

  if (key!.startsWith('pk_test_') || key!.startsWith('sk_test_')) {
    return 'test'
  }

  return 'unknown'
}

export function getIntegrationStatuses(services: ServiceIntegrationShape[]): IntegrationStatus[] {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFromEmail = process.env.RESEND_FROM_EMAIL
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  const dailyApiKey = process.env.DAILY_API_KEY
  const vimeoLibraryUrl = process.env.VIMEO_LIBRARY_URL

  const activeServices = services.filter((service) => service.is_active)
  const bookableServices = activeServices.filter((service) =>
    service.fulfillment_type === 'booking' ||
    service.fulfillment_type === 'daily' ||
    service.fulfillment_type === 'hybrid' ||
    !service.fulfillment_type
  )
  const virtualServices = activeServices.filter((service) =>
    service.fulfillment_type === 'daily' || service.fulfillment_type === 'hybrid'
  )
  const vimeoServices = activeServices.filter((service) =>
    service.fulfillment_type === 'vimeo' || service.fulfillment_type === 'hybrid'
  )
  const missingServiceAccessUrls = vimeoServices.filter((service) => !isConfigured(service.access_url ?? undefined))

  const stripePublishableMode = getStripeMode(publishableKey)
  const stripeSecretMode = getStripeMode(stripeSecretKey)
  const stripeModeMismatch =
    stripePublishableMode &&
    stripeSecretMode &&
    stripePublishableMode !== 'unknown' &&
    stripeSecretMode !== 'unknown' &&
    stripePublishableMode !== stripeSecretMode

  const statuses: IntegrationStatus[] = [
    {
      id: 'stripe',
      label: 'Stripe',
      level:
        isConfigured(publishableKey) && isConfigured(stripeSecretKey) && isConfigured(stripeWebhookSecret)
          ? stripeModeMismatch
            ? 'warning'
            : 'ready'
          : 'error',
      summary:
        isConfigured(publishableKey) && isConfigured(stripeSecretKey) && isConfigured(stripeWebhookSecret)
          ? stripeModeMismatch
            ? 'Stripe keys are set, but publishable and secret keys use different modes.'
            : `Stripe checkout and webhook secrets are configured (${stripeSecretMode || 'unknown'} mode).`
          : 'Stripe is missing one or more required keys.',
      details:
        'Required for purchases, subscriptions, billing portal access, and webhook reconciliation.',
    },
    {
      id: 'email',
      label: 'Resend Email',
      level:
        isConfigured(resendApiKey) && isConfigured(resendFromEmail)
          ? 'ready'
          : 'warning',
      summary:
        isConfigured(resendApiKey) && isConfigured(resendFromEmail)
          ? `Transactional email is configured with ${resendFromEmail}.`
          : 'Email notifications are not fully configured.',
      details:
        'Used for booking requests, approvals, payment confirmations, trainer invites, and meal plan delivery.',
    },
    {
      id: 'google-calendar',
      label: 'Google Calendar',
      level:
        isConfigured(googleClientId) &&
        isConfigured(googleClientSecret)
          ? 'ready'
          : bookableServices.length > 0
            ? 'error'
            : 'warning',
      summary:
        isConfigured(googleClientId) &&
        isConfigured(googleClientSecret)
          ? 'Trainer-specific Google Calendar OAuth is configured. Each trainer connects their own calendar during setup.'
          : bookableServices.length > 0
            ? 'Google Calendar OAuth is not configured, so trainer calendars cannot be connected yet.'
            : 'Google Calendar OAuth is not configured yet.',
      details:
        'Used to block busy times in slot selection and create calendar events against each trainer’s own calendar.',
    },
    {
      id: 'daily',
      label: 'Daily Video',
      level: virtualServices.length === 0
        ? isConfigured(dailyApiKey)
          ? 'ready'
          : 'optional'
        : isConfigured(dailyApiKey)
          ? 'ready'
          : 'error',
      summary:
        virtualServices.length === 0
          ? isConfigured(dailyApiKey)
            ? 'Daily is configured and ready for virtual services.'
            : 'No active services currently require Daily.'
          : isConfigured(dailyApiKey)
            ? `Daily is configured for ${virtualServices.length} active virtual service(s).`
            : `${virtualServices.length} active service(s) require Daily, but DAILY_API_KEY is missing.`,
      details:
        'Required when a service uses Daily or hybrid fulfillment for live virtual sessions.',
    },
    {
      id: 'vimeo',
      label: 'Vimeo Library',
      level: vimeoServices.length === 0
        ? isConfigured(vimeoLibraryUrl)
          ? 'ready'
          : 'optional'
        : missingServiceAccessUrls.length === 0 || isConfigured(vimeoLibraryUrl)
          ? 'ready'
          : 'warning',
      summary:
        vimeoServices.length === 0
          ? isConfigured(vimeoLibraryUrl)
            ? 'A fallback Vimeo library URL is configured.'
            : 'No active services currently require Vimeo access.'
          : missingServiceAccessUrls.length === 0
            ? 'Every active Vimeo service has an access URL.'
            : isConfigured(vimeoLibraryUrl)
              ? `${missingServiceAccessUrls.length} Vimeo service(s) will use the global fallback URL.`
              : `${missingServiceAccessUrls.length} active Vimeo service(s) are missing an access URL and no fallback is set.`,
      details:
        'Used for on-demand library products when a service-level access URL is not provided.',
    },
  ]

  return statuses
}
