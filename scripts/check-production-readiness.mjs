#!/usr/bin/env node

const appUrl = process.env.NEXT_PUBLIC_APP_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const resendApiKey = process.env.RESEND_API_KEY
const resendFromEmail = process.env.RESEND_FROM_EMAIL
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const googleAnalyticsPropertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID
const googleAnalyticsClientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL
const googleAnalyticsPrivateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY
const dailyApiKey = process.env.DAILY_API_KEY
const vimeoLibraryUrl = process.env.VIMEO_LIBRARY_URL

function hasValue(value) {
  return Boolean(value && value.trim())
}

function looksLikePlaceholder(value) {
  if (!hasValue(value)) {
    return false
  }

  const normalized = value.trim().toLowerCase()
  return (
    normalized === 'placeholder' ||
    normalized.includes('your-') ||
    normalized.includes('your_') ||
    normalized.includes('changeme') ||
    normalized.includes('replace-me') ||
    normalized.includes('example')
  )
}

function isConfigured(value) {
  return hasValue(value) && !looksLikePlaceholder(value)
}

function getStripeMode(key) {
  if (!isConfigured(key)) {
    return null
  }

  if (key.startsWith('pk_live_') || key.startsWith('sk_live_')) {
    return 'live'
  }

  if (key.startsWith('pk_test_') || key.startsWith('sk_test_')) {
    return 'test'
  }

  return 'unknown'
}

const checks = [
  {
    label: 'NEXT_PUBLIC_APP_URL',
    required: true,
    ok: isConfigured(appUrl),
    details: isConfigured(appUrl)
      ? `set to ${appUrl}`
      : 'missing or still using a placeholder value',
  },
  {
    label: 'Supabase core env',
    required: true,
    ok: isConfigured(supabaseUrl) && isConfigured(supabaseAnonKey) && isConfigured(supabaseServiceRoleKey),
    details:
      isConfigured(supabaseUrl) && isConfigured(supabaseAnonKey) && isConfigured(supabaseServiceRoleKey)
        ? 'public + service role credentials are configured'
        : 'one or more of NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY is missing',
  },
  {
    label: 'Stripe core env',
    required: true,
    ok:
      isConfigured(stripePublishableKey) &&
      isConfigured(stripeSecretKey) &&
      isConfigured(stripeWebhookSecret),
    details:
      isConfigured(stripePublishableKey) &&
      isConfigured(stripeSecretKey) &&
      isConfigured(stripeWebhookSecret)
        ? 'publishable, secret, and webhook credentials are configured'
        : 'one or more of NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET is missing',
  },
  {
    label: 'Resend email',
    required: false,
    ok: isConfigured(resendApiKey) && isConfigured(resendFromEmail),
    details:
      isConfigured(resendApiKey) && isConfigured(resendFromEmail)
        ? `configured with sender ${resendFromEmail}`
        : 'transactional email is not fully configured',
  },
  {
    label: 'Google Calendar OAuth',
    required: false,
    ok: isConfigured(googleClientId) && isConfigured(googleClientSecret),
    details:
      isConfigured(googleClientId) && isConfigured(googleClientSecret)
        ? 'trainer calendar connect can be enabled'
        : 'trainer calendar connect is not fully configured',
  },
  {
    label: 'Google Analytics reporting',
    required: false,
    ok:
      isConfigured(googleAnalyticsPropertyId) &&
      isConfigured(googleAnalyticsClientEmail) &&
      isConfigured(googleAnalyticsPrivateKey),
    details:
      isConfigured(googleAnalyticsPropertyId) &&
      isConfigured(googleAnalyticsClientEmail) &&
      isConfigured(googleAnalyticsPrivateKey)
        ? 'admin analytics snapshot is configured'
        : 'admin analytics snapshot is not configured',
  },
  {
    label: 'Daily video',
    required: false,
    ok: isConfigured(dailyApiKey),
    details: isConfigured(dailyApiKey)
      ? 'virtual session room creation is configured'
      : 'virtual session room creation is not configured',
  },
  {
    label: 'Vimeo fallback library',
    required: false,
    ok: isConfigured(vimeoLibraryUrl),
    details: isConfigured(vimeoLibraryUrl)
      ? `fallback URL set to ${vimeoLibraryUrl}`
      : 'no global Vimeo fallback URL is configured',
  },
]

const stripePublishableMode = getStripeMode(stripePublishableKey)
const stripeSecretMode = getStripeMode(stripeSecretKey)
const stripeModeMismatch =
  stripePublishableMode &&
  stripeSecretMode &&
  stripePublishableMode !== 'unknown' &&
  stripeSecretMode !== 'unknown' &&
  stripePublishableMode !== stripeSecretMode

console.log('FoundFit production readiness check')
console.log('==================================')

for (const check of checks) {
  const icon = check.ok ? '[ok]' : check.required ? '[!!]' : '[--]'
  console.log(`${icon} ${check.label}: ${check.details}`)
}

if (stripeModeMismatch) {
  console.log(
    `[!!] Stripe mode mismatch: publishable key is ${stripePublishableMode}, secret key is ${stripeSecretMode}`
  )
}

const requiredFailures = checks.filter((check) => check.required && !check.ok)
const warningCount = checks.filter((check) => !check.required && !check.ok).length + (stripeModeMismatch ? 1 : 0)

console.log('')
if (requiredFailures.length > 0) {
  console.log(`Result: FAIL (${requiredFailures.length} required issue(s), ${warningCount} warning(s))`)
  process.exitCode = 1
} else if (warningCount > 0) {
  console.log(`Result: PASS WITH WARNINGS (${warningCount} warning(s))`)
} else {
  console.log('Result: PASS')
}
