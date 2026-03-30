# Client Dashboard Spec — Foundation Fitness

## Goal
Rebuild the client dashboard and booking flow to match the existing foundfit.net client portal behavior.

## Reference
Use the existing Hostinger export at `C:\Users\woodb\Downloads\foundfit-export\` as the behavioral/design reference.

## Required Features

### 1. Client Dashboard Landing Page
Show:
- **Pending sessions**
- **Confirmed sessions**
- **Cancelled sessions**
- **Current subscriptions**
- **Sessions left** if client purchased a non-unlimited package
- **Meal plan download** if purchased

### 2. Browse Services
- Client can browse currently active services/packages
- This should be driven from the `services` table
- If services are updated by admin, client view should reflect changes automatically

### 3. Billing Management
- Client can manage their billing in Stripe
- Use/create Stripe customer portal flow

### 4. Booking Flow
- Client selects trainer
- Client selects available times based on trainer calendar/availability
- Availability should respect:
  - trainer availability bounds (`trainer_availability`)
  - Google Calendar busy times
  - booking preference (approval required vs instant confirm)

### 5. Booking Restrictions
- If client has **no active subscription/package**, they should **not** be allowed to book
- UI should clearly explain why
- If they have a session pack, show remaining sessions
- If unlimited subscription is active, allow booking

## Existing App Files to Inspect First
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/book/page.tsx`
- `src/app/(dashboard)/sessions/page.tsx`
- `src/app/(dashboard)/meal-plans/page.tsx`
- `src/app/api/bookings/route.ts`
- `src/app/api/checkout/route.ts`
- `src/lib/stripe.ts`
- `src/lib/types.ts`

## Deliverables
1. Reworked client dashboard UI
2. Updated booking page behavior
3. Billing management button/link
4. Service browsing section
5. Session/package gating logic
6. Meal plan download surface if purchased

## Notes
- Keep Next.js App Router + TypeScript
- Reuse existing shadcn/ui components where possible
- Match the Foundation Fitness styling/theme already added
- When finished, run:
  openclaw system event --text 'Done: Rebuilt client dashboard and booking flow for Foundation Fitness' --mode now
