# FoundFit — Personal Training Platform

## Overview
A full-stack web application for FoundFit (foundfit.net), a personal training business. The platform handles client accounts, payments, session booking with Google Calendar integration, and admin management.

## Tech Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes + Server Actions
- **Database:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Payments:** Stripe (subscriptions + one-time payments)
- **Calendar:** Google Calendar API
- **Email:** Resend
- **Deployment:** Vercel-ready

## User Roles
1. **Client** — books sessions, manages subscription, downloads meal plans
2. **Trainer** — manages their own schedule blocks, approves bookings
3. **Admin** (business owner) — full control: services, pricing, trainers, settings, clients

## Core Features

### 1. Services & Packages (Admin-Managed)
- Admin can create/edit/delete service types:
  - **Unlimited Monthly** — subscription via Stripe, auto-renew, max 3 sessions/week (configurable per-plan)
  - **Single Session** — one-time purchase
  - **6-Pack** — prepaid bundle, decrements on booking
  - **12-Pack** — prepaid bundle, decrements on booking
  - **Custom packs** — admin can set any quantity
- Admin can also create non-session services:
  - **Monthly Meal Plan** — PDF delivered via portal + email
- All services have configurable: name, description, price, session duration (default 50 min), session count, max weekly bookings
- Travel fee: fixed amount, configurable by admin, optionally added at booking time
- Admin can add/edit/archive services at any time via dashboard

### 2. Client Accounts & Payments
- Client registration with email/password (Supabase Auth)
- Client profile: name, email, phone, address (for travel sessions)
- **Payment flow:**
  - Client selects a package → Stripe Checkout
  - Unlimited Monthly → Stripe Subscription with auto-renew (can cancel)
  - Session packs → one-time Stripe payment
  - Travel fee added as line item when applicable
- **Session balance tracking:**
  - Unlimited: validated by active subscription status + weekly booking cap
  - Packs: `purchased_sessions - used_sessions = available`
  - Cannot book if no available sessions (unless unlimited w/ active sub)
- Stripe webhook handler for payment confirmation, subscription events

### 3. Scheduling System
- **Trainer availability:**
  - Trainer sets daily start/end time blocks (e.g., Mon 6am-12pm, Mon 3pm-7pm)
  - Multiple blocks per day supported
  - Different schedules per day of week
- **Google Calendar integration:**
  - When client views available slots, system checks:
    1. Trainer's configured availability blocks
    2. Google Calendar for conflicts (busy times, personal events)
    3. Existing booked sessions
  - Available slots = availability blocks MINUS (gcal busy + existing bookings)
  - Slot duration based on service (default 50 min)
- **Booking flow:**
  1. Client selects date → sees available time slots
  2. Client picks a slot → booking request created (status: PENDING)
  3. Trainer/Admin receives notification (email + in-app)
  4. Trainer/Admin approves or declines
  5. On approval: session confirmed, added to Google Calendar, client notified via email
  6. On decline: client notified, session credit preserved
- **Cancellation:**
  - Clients can cancel any time (no penalty for now)
  - Cancelled session credit returned (for pack users)
  - Google Calendar event removed
- **Location options:**
  - At trainer's location (default, no extra fee)
  - At client's home (travel fee applied, address required)

### 4. Meal Plans
- Admin/Trainer uploads PDF meal plan per client
- Client can download from their portal
- Email sent via Resend with PDF attachment on upload

### 5. Admin Dashboard
- **Services management:** CRUD for all service types, pricing, durations
- **Client management:** view all clients, their subscriptions, session balances, booking history
- **Trainer management:** add/remove trainers, each trainer manages their own schedule
- **Booking management:** approve/decline pending requests, view all bookings
- **Settings:**
  - Travel fee amount
  - Default session duration
  - Max weekly bookings for unlimited plans
  - Business info (name, address, contact)

### 6. Trainer Dashboard
- View and manage own availability blocks
- View pending booking requests → approve/decline
- View upcoming sessions
- Upload meal plans for clients
- View client profiles and history

### 7. Client Portal
- View active subscription/package and remaining sessions
- Book new sessions (see available slots)
- View upcoming and past sessions
- Cancel upcoming sessions
- Download meal plans
- Manage payment methods (Stripe Customer Portal)
- Auto-renew toggle for subscriptions

### 8. Notifications (Resend Email)
- Booking request submitted (to trainer)
- Booking approved/declined (to client)
- Booking cancelled (to trainer)
- Payment confirmation (to client)
- Meal plan uploaded (to client, with PDF)
- Subscription renewal reminder
- Subscription cancelled/expired

## Database Schema (Supabase/PostgreSQL)

### Tables
- `profiles` — extends Supabase auth.users (role, name, phone, address)
- `services` — service types (name, description, type[unlimited/pack/single/meal_plan], price, session_count, duration_minutes, max_weekly_bookings, is_active)
- `subscriptions` — client subscriptions (client_id, service_id, stripe_subscription_id, status, current_period_start, current_period_end)
- `session_packs` — purchased packs (client_id, service_id, total_sessions, used_sessions, stripe_payment_id, purchased_at, expires_at)
- `trainers` — trainer profiles (user_id, bio, is_active)
- `availability_blocks` — trainer schedule (trainer_id, day_of_week, start_time, end_time)
- `bookings` — session bookings (client_id, trainer_id, service_id, start_time, end_time, status[pending/approved/declined/cancelled/completed], location_type[gym/travel], travel_address, google_calendar_event_id)
- `meal_plans` — uploaded plans (client_id, trainer_id, title, file_url, created_at)
- `settings` — app-wide settings (key, value) — travel_fee, default_duration, max_weekly_bookings, etc.

## API Routes

### Auth
- Supabase Auth handles signup/login/password reset
- OAuth optional (Google login)

### Client
- `GET /api/available-slots?trainer_id=&date=` — fetch available slots (checks availability + gcal + existing bookings)
- `POST /api/bookings` — create booking request
- `DELETE /api/bookings/:id` — cancel booking
- `GET /api/bookings?status=` — list client's bookings
- `GET /api/meal-plans` — list client's meal plans
- `POST /api/checkout` — create Stripe checkout session

### Trainer/Admin
- `CRUD /api/services` — manage services
- `CRUD /api/availability` — manage schedule blocks
- `PATCH /api/bookings/:id` — approve/decline booking
- `POST /api/meal-plans` — upload meal plan
- `GET /api/clients` — list all clients
- `CRUD /api/trainers` — manage trainers
- `CRUD /api/settings` — manage app settings

### Webhooks
- `POST /api/webhooks/stripe` — handle payment/subscription events

## UI Pages

### Public
- `/` — Landing page (about, services, pricing, CTA to sign up)
- `/login` — Login
- `/signup` — Registration

### Client (protected)
- `/dashboard` — Overview (active plan, upcoming sessions, quick book)
- `/book` — Browse available slots and book
- `/sessions` — Booking history
- `/meal-plans` — Download meal plans
- `/account` — Profile and billing (Stripe portal link)

### Trainer (protected)
- `/trainer` — Dashboard (today's sessions, pending approvals)
- `/trainer/availability` — Manage schedule blocks
- `/trainer/bookings` — All bookings, approve/decline
- `/trainer/clients` — Client list and profiles
- `/trainer/meal-plans` — Upload meal plans

### Admin (protected)
- `/admin` — Dashboard (overview stats)
- `/admin/services` — Manage services and pricing
- `/admin/trainers` — Manage trainers
- `/admin/clients` — All clients
- `/admin/bookings` — All bookings
- `/admin/settings` — App settings (travel fee, defaults, etc.)

## Design Notes
- Clean, modern, mobile-first design
- Brand colors: use warm/energetic fitness palette
- shadcn/ui components for consistency
- Responsive — clients will mostly use mobile
- Fast — server components where possible
- Accessible — proper labels, contrast, keyboard nav

## Security
- Row Level Security (RLS) on all Supabase tables
- Role-based access (client/trainer/admin) enforced at DB and API level
- Stripe webhook signature verification
- CSRF protection via Next.js
- Environment variables for all secrets

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_ID=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```
