# 🔥 FoundFit

Personal training booking platform — built for trainers and their clients.

## Features

- **Client Portal** — Book sessions, view schedule, manage account, download meal plans
- **Trainer Dashboard** — Approve/decline bookings, set availability, manage clients, upload meal plans
- **Admin Panel** — Manage services, trainers, clients, settings, and all bookings
- **Stripe Payments** — Subscriptions (unlimited monthly), session packs, single sessions
- **Google Calendar** — Auto-sync approved bookings, check busy slots for availability
- **Email Notifications** — Booking requests, approvals, cancellations, payment confirmations, meal plan delivery
- **Daily Virtual Sessions** — Auto-create Daily rooms for approved virtual bookings and generate secure join links
- **Vimeo Library Access** — Support digital/video library products via per-service access URLs
- **Responsive Design** — Works on desktop & mobile with collapsible sidebar

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Database:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Payments:** Stripe (Checkout, Subscriptions, Webhooks)
- **Email:** Resend
- **Calendar:** Google Calendar API
- **UI:** Tailwind CSS 4 + shadcn/ui
- **Deployment:** Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 24.x
- Supabase project
- Stripe account
- Google Cloud project (for Calendar API)
- Resend account
- Daily.co account (for virtual sessions)
- Vimeo showcase/library URL (per product or global fallback)

### Setup

1. **Clone and install:**
   ```bash
   git clone <repo-url>
   cd foundfit
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Fill in the values required for the integrations you plan to enable
   ```

   Minimum required to boot the app:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Required before taking real payments:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL`

   Optional/feature-gated integrations:
   - `RESEND_API_KEY` + `RESEND_FROM_EMAIL` for transactional email
   - `RESEND_FROM_NAME` to override the sender brand shown in transactional email
   - `GOOGLE_ANALYTICS_PROPERTY_ID` + `GOOGLE_ANALYTICS_CLIENT_EMAIL` + `GOOGLE_ANALYTICS_PRIVATE_KEY` for the admin dashboard analytics card
   - `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` for trainer calendar connect
   - `DAILY_API_KEY` for virtual sessions (`daily` / `hybrid` services)
   - `VIMEO_LIBRARY_URL` as a fallback library link for digital products
   - `SUPABASE_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN` for the auth-branding helper script

3. **Run Supabase migration:**
   - Recommended: link the project and run `supabase db push --linked`
   - If you don't have a Supabase CLI access token handy, go to your Supabase project → SQL Editor and paste/run `supabase/migrations/00001_initial_schema.sql`
   - The migration creates the `meal-plans` bucket for you
   - If you created users or storage objects before the latest security hardening pass, run `node scripts/repair-supabase-state.mjs` to sync auth role metadata and lock down the `meal-plans` bucket

4. **Set up Stripe webhook:**
   ```bash
   # Local development
   stripe listen --forward-to localhost:3000/api/webhooks/stripe

   # Production: add webhook endpoint in Stripe Dashboard
   # URL: https://yourdomain.com/api/webhooks/stripe
   # Events: checkout.session.completed, invoice.payment_succeeded,
   #         invoice.payment_failed, customer.subscription.deleted,
   #         customer.subscription.updated
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```

6. **Create your admin account:**
   - Sign up at `/signup`
   - In Supabase SQL Editor, run the bootstrap SQL in `supabase/bootstrap/first-admin.sql` with your email
   - Add yourself as a trainer from the Admin → Trainers page

### Production integrations checklist

For `foundfit.net`, make sure these are configured before launch:

- **Runtime / hosting**
  - Use Node.js 24.x in the deployment target
  - Set `NEXT_PUBLIC_APP_URL=https://foundfit.net`
  - Build command: `npm run build`
- **Supabase**
  - Production project URL/keys are set in the host environment
  - Latest migrations applied
  - `meal-plans` storage bucket exists
  - First admin bootstrapped
  - If you want branded auth emails, run `node scripts/configure-supabase-auth-branding.mjs` with a valid `SUPABASE_ACCESS_TOKEN`
- **Stripe**
  - Production publishable key, secret key, and webhook secret are all set
  - Publishable and secret keys use the same mode (`live` for launch)
  - Webhook endpoint points to `https://foundfit.net/api/webhooks/stripe`
  - Products/prices match service records in Supabase
- **Google Calendar**
  - OAuth client ID/secret are set for production
  - Each trainer completes the Google connect flow from FoundFit; calendar IDs are stored per trainer in Supabase
- **Resend**
  - `RESEND_FROM_EMAIL` uses a verified domain/email for `foundfit.net`
  - Optional: set `RESEND_FROM_NAME=FoundFit` (or your preferred sender label)
- **Google Analytics**
  - Optional: add `GOOGLE_ANALYTICS_PROPERTY_ID`, `GOOGLE_ANALYTICS_CLIENT_EMAIL`, and `GOOGLE_ANALYTICS_PRIVATE_KEY` if you want the admin dashboard analytics snapshot to work in production
- **Daily**
  - `DAILY_API_KEY` is set for any active `daily` or `hybrid` service
- **Vimeo library products**
  - Each Vimeo/digital service has a valid `access_url`, or `VIMEO_LIBRARY_URL` is set as the global fallback

### Deployment notes

- `netlify.toml` is now set up for a Next.js runtime/plugin-based Netlify deploy, but it still needs a real preview deployment test before launch.
- If `foundfit.net` stays on Netlify, explicitly validate auth callbacks, middleware, server routes, and Stripe webhooks there before going live.
- Vercel remains the easiest default for this repo because the app is a standard Next.js App Router project.
- A GitHub Actions workflow now runs web lint/typecheck/build plus mobile lint/typecheck on pushes and pull requests; treat that as the minimum deploy gate.
- Run `npm run readiness` in the target host environment to get a quick pass/fail summary of required production env plus warnings for optional integrations.
- See `docs/deployment-foundfit-net.md` for the full production checklist.

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Authenticated routes
│   │   ├── admin/            # Admin pages
│   │   ├── trainer/          # Trainer pages
│   │   ├── dashboard/        # Client dashboard
│   │   ├── book/             # Booking page
│   │   ├── sessions/         # Client sessions
│   │   ├── meal-plans/       # Client meal plans
│   │   └── account/          # Account & billing
│   ├── api/                  # API routes
│   │   ├── available-slots/  # Slot availability
│   │   ├── bookings/         # Booking CRUD
│   │   ├── checkout/         # Stripe checkout
│   │   ├── meal-plans/       # Meal plan notifications
│   │   └── webhooks/stripe/  # Stripe webhooks
│   ├── auth/callback/        # Supabase auth callback
│   ├── login/                # Login page
│   └── signup/               # Signup page
├── components/
│   ├── nav/                  # Sidebar navigation
│   ├── bookings/             # Booking components
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── supabase/             # Supabase client/server
│   ├── constants.ts          # App constants
│   ├── email.ts              # Resend email templates
│   ├── google-calendar.ts    # Google Calendar integration
│   ├── stripe.ts             # Stripe client
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Utility functions
└── middleware.ts              # Auth middleware
```

## Services / Pricing

| Plan | Price | Details |
|------|-------|---------|
| Unlimited Monthly | $299/mo | Up to 3 sessions/week, auto-renew |
| 12-Pack | $699 | $58.25/session, no expiration |
| 6-Pack | $399 | $66.50/session, no expiration |
| Single Session | $75 | One-time, book instantly |
| Monthly Meal Plan | $99/mo | Custom nutrition plan |

Travel fee for in-home training: $25 (configurable in admin settings).

## Deployment (Vercel)

1. Push to GitHub
2. Confirm the `FoundFit CI` workflow is green
3. Run `npm run readiness` against the production env values and clear any required failures
4. Import project in Vercel
5. Add all environment variables
6. Set Node version to `24.x`
7. Set up Stripe webhook pointing to your Vercel URL
8. Run the smoke-test checklist in `docs/deployment-foundfit-net.md`

## License

Private — All rights reserved.

