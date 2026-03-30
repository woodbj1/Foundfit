# 🔥 FoundFit

Personal training booking platform — built for trainers and their clients.

## Features

- **Client Portal** — Book sessions, view schedule, manage account, download meal plans
- **Trainer Dashboard** — Approve/decline bookings, set availability, manage clients, upload meal plans
- **Admin Panel** — Manage services, trainers, clients, settings, and all bookings
- **Stripe Payments** — Subscriptions (unlimited monthly), session packs, single sessions
- **Google Calendar** — Auto-sync approved bookings, check busy slots for availability
- **Email Notifications** — Booking requests, approvals, cancellations, payment confirmations, meal plan delivery
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

- Node.js 20+
- Supabase project
- Stripe account
- Google Cloud project (for Calendar API)
- Resend account

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
   # Fill in all values in .env.local
   ```

3. **Run Supabase migration:**
   - Go to your Supabase project → SQL Editor
   - Paste and run `supabase/migrations/00001_initial_schema.sql`
   - Create a `meal-plans` storage bucket (public)

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
   - In Supabase, update your profile's `role` to `admin`
   - Add yourself as a trainer from the Admin → Trainers page

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
2. Import project in Vercel
3. Add all environment variables
4. Set up Stripe webhook pointing to your Vercel URL
5. Done!

## License

Private — All rights reserved.
