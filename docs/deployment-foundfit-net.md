# FoundFit Production Deployment Checklist (`foundfit.net`)

This is the practical launch checklist for taking FoundFit live on `https://foundfit.net`.

## 1. Choose the host

### Recommended: Vercel

This repo is a standard Next.js App Router app and works cleanly on Vercel with minimal extra setup.

Use:
- Framework preset: `Next.js`
- Build command: `npm run build`
- Install command: `npm install`
- Node version: `24.x`

### Supported with extra setup: Netlify

If `foundfit.net` remains on Netlify:
- Keep Node on `24`
- Make sure the Next.js runtime/plugin is enabled
- Validate server routes, auth callback, and Stripe webhook handling in a preview deploy before launch
- Do not treat `.next` as a static export; this app uses dynamic routes and server-side APIs

## 2. Environment variables

Configure these in the production host before the first deploy.

After setting them, run `npm run readiness` in that same environment. It exits non-zero when a required launch dependency is missing and prints warnings for optional integrations that are still unset.

### Core app / Supabase
- `NEXT_PUBLIC_APP_URL=https://foundfit.net`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Stripe
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Email (Resend)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL=noreply@foundfit.net`

### Google Calendar
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Optional / feature-gated
- `DAILY_API_KEY`
- `DAILY_API_BASE_URL` (default is already in `.env.example`)
- `GOOGLE_ANALYTICS_PROPERTY_ID`
- `GOOGLE_ANALYTICS_CLIENT_EMAIL`
- `GOOGLE_ANALYTICS_PRIVATE_KEY`
- `VIMEO_LIBRARY_URL`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_AUTH_FROM_EMAIL`
- `SUPABASE_AUTH_SENDER_NAME`
- `RESEND_FROM_NAME`

## 3. Supabase production setup

Before launch:
- Apply the latest SQL migration(s)
- Confirm the `meal-plans` storage bucket exists
- Create the first admin using `supabase/bootstrap/first-admin.sql`
- Add at least one active trainer with completed onboarding
- Confirm RLS policies are active and production-safe
- In Supabase Auth URL settings, make sure the site URL is `https://foundfit.net`
- Add the production redirect URLs used by the app:
  - `https://foundfit.net/auth/callback`
  - `https://foundfit.net/api/trainer/google/callback`

Recommended validation:
- Sign up a fresh client account
- Sign in and sign out successfully
- Confirm auth callback returns to the right production URL
- Upload and download a meal plan successfully

## 4. Stripe launch checklist

Before accepting real money:
- Use live Stripe keys in production
- Confirm the publishable + secret keys are from the same Stripe mode
- Recreate or verify live products/prices in Stripe
- Ensure Supabase `services` records reference the correct live price IDs
- Add the production webhook endpoint:
  - `https://foundfit.net/api/webhooks/stripe`
- Subscribe the webhook to at least:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.deleted`
  - `customer.subscription.updated`

Recommended validation:
- Buy a single session in test first
- Buy a session pack in test first
- Buy a subscription in test first
- Verify booking entitlement updates correctly after each purchase

## 5. Google Calendar setup

Before enabling trainer calendar sync:
- Set the production Google OAuth redirect URI to `https://foundfit.net/api/trainer/google/callback`
- Verify the consent screen branding matches FoundFit
- Ensure each trainer completes the Google connect flow from FoundFit
- Confirm each trainer has a stored Google email / calendar connection in Supabase

Recommended validation:
- Connect a trainer Google account
- Create a blocking event on that calendar
- Verify blocked time is excluded from available booking slots
- Approve a booking and confirm a calendar event is created

## 6. Email / auth branding setup

If using branded auth and transactional email:
- Verify the sending domain in Resend
- Set `RESEND_FROM_EMAIL` to a verified sender
- Optional: set `RESEND_FROM_NAME=FoundFit` if you want the sender label to match the brand
- Optionally run:

```bash
node scripts/configure-supabase-auth-branding.mjs
```

That script updates Supabase Auth email settings and the confirmation email template.

## 6b. Optional analytics reporting

If you want the admin dashboard analytics card to populate in production:
- Create or reuse a Google service account with access to your GA4 property
- Set `GOOGLE_ANALYTICS_PROPERTY_ID`
- Set `GOOGLE_ANALYTICS_CLIENT_EMAIL`
- Set `GOOGLE_ANALYTICS_PRIVATE_KEY` (preserve newlines, or use `\\n` escapes)

## 7. Virtual + digital product setup

### Daily
If any service uses `daily` or `hybrid` fulfillment:
- Set `DAILY_API_KEY`
- Approve a virtual booking and confirm a Daily room/link is generated

### Vimeo / digital library
If any service unlocks a digital library:
- Set a per-service `access_url` in the admin panel, or
- Set `VIMEO_LIBRARY_URL` as the global fallback

## 8. Final smoke test before DNS / launch push

Validate the following in the production deploy preview or live environment:
- Landing page loads
- Signup works
- Login works
- Client dashboard loads
- Booking page loads with active services
- Trainer setup loads
- Google connect callback succeeds
- Admin pages load for admin users only
- Stripe checkout opens
- Stripe webhook updates are received
- Booking request creation works
- Booking approval works
- Email notifications send (if enabled)
- Daily join link appears for virtual bookings (if enabled)

## 9. Known host-specific note

The repo contains `netlify.toml`, but the app is not a static export. If Netlify is the production target, do one full end-to-end preview deploy there before launch and explicitly verify:
- middleware/auth behavior
- server API routes
- Supabase callback handling
- Stripe webhook handling

If any of those are flaky, Vercel is the safer default host for launch.
