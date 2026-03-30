# Dashboard Adaptation Spec — Trainer + Admin

## Overview
Rebuild the Trainer Dashboard and Admin Dashboard to match the reference Hostinger export design and functionality. The current Next.js app has basic scaffolding; this spec adds the full feature set.

Reference files: `C:\Users\woodb\Downloads\foundfit-export\src\pages\TrainerDashboard.jsx` and `AdminDashboard.jsx`

## CRITICAL: Keep Next.js Patterns
- Use App Router (server components where possible, 'use client' for interactive parts)
- TypeScript (TSX), NOT JSX
- Use `@supabase/ssr` via `src/lib/supabase/client.ts` and `server.ts` (NOT raw supabase-js)
- Keep the existing sidebar nav pattern from `src/components/nav/sidebar.tsx`
- Update sidebar branding: Flame → Dumbbell icon, "FoundFit" → "Foundation Fitness"

## 1. Sidebar Updates (`src/components/nav/sidebar.tsx`)
- Change `Flame` icon to `Dumbbell`
- Change "FoundFit" text to "Foundation Fitness" with gradient text styling: `bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent`
- Keep all existing nav items and structure

## 2. Trainer Dashboard (`src/app/(dashboard)/trainer/page.tsx`)
Currently has basic stats + pending/today cards. Rebuild as a TABBED dashboard matching the reference:

### Layout:
- Gradient welcome banner (pink→purple→cyan) with:
  - User avatar circle (initial letter)
  - "Welcome, {name}!" + subtitle "Manage your schedule and client sessions"
  - Google Calendar status badge (Active/Not Connected)
- Top bar: "Trainer Dashboard" gradient text + "Sync Calendar" button + "Logout" button
- 3 tabs: Bookings | My Schedule | Settings

### Tab 1: Bookings (default)
- **Pending Requests** section (yellow left-border card):
  - List session requests from `session_requests` table
  - Each row: client name, date/time, service name, notes
  - Approve/Decline buttons per request
  - Approve calls Supabase edge function `approve-session-request`
  - Decline calls edge function `decline-session-request`
- **Upcoming Sessions** section (green left-border card):
  - List from `confirmed_sessions` table
  - Each row: client name, date, time (duration), calendar sync badge, "Confirmed" badge

### Tab 2: My Schedule
- **Weekly Availability** section:
  - Shows `trainer_availability` table data
  - Each row: day of week (Sundays, Mondays, etc.), start_time - end_time
  - Clock icon in purple circle per row
  - "+ Add Time Block" button opens availability modal
  - These define the OUTER BOUNDS of the trainer's schedule
  - Within these bounds, actual availability is determined by Google Calendar (busy times excluded)

### Tab 3: Settings
- **Booking Preferences** card:
  - Toggle between "Request System" (manual approval) and "Instant Confirmation" (auto-book)
  - Stored in `profiles.booking_preference` column
  - Toggle button with status indicator
- **Google Calendar Settings** card:
  - Show connection status (Connected/Not Connected)
  - Connect/Disconnect button
  - Timezone selector (from `profiles.timezone`)
  - Auto-sync explanation text

### Important: This page needs to be a client component ('use client') because of:
- Real-time Supabase subscriptions for live updates
- Interactive tabs, modals, toggle states
- Calendar sync actions

### Data Tables Used:
- `profiles` (trainer profile, booking_preference, google_calendar_connected, timezone)
- `session_requests` (pending bookings needing approval)
- `confirmed_sessions` (approved/confirmed sessions)
- `trainer_availability` (weekly schedule bounds)
- `services` (for request service names)

## 3. Admin Dashboard (`src/app/(dashboard)/admin/page.tsx`)
Currently has stats cards + quick links. Rebuild as a TABBED dashboard:

### Layout:
- Header: Shield icon + "Admin Dashboard" + "Logout" button
- 3 tabs: Manage Trainers | Services & Pricing | Integrations

### Tab 1: Manage Trainers (default)
- Two-column layout (1/3 + 2/3):
  
  **Left column — Add New Trainer form:**
  - Full Name input
  - Email Address input
  - NO manual Temporary Password field — auto-generate a secure random password
  - On submit: call Supabase edge function `create-user-admin` with { email, password (auto-generated), fullName, role: 'trainer' }
  - After creation, send the temp password to the trainer's email via Resend (or include in the edge function)
  - Show success toast with "Account created, temporary password sent to email"

  **Right column — Current Trainers list:**
  - Header with trainer count badge + Refresh button
  - List of trainers from `profiles` where role='trainer'
  - Each row: avatar (initial), full name, email, "Trainer" badge
  - (Future: add delete/deactivate button)

### Tab 2: Services & Pricing
- Manage Services component with:
  - Add Service button → opens modal
  - Table of all services: name, duration, price, category, actions (edit/delete)
  - Edit opens same modal pre-filled
  - Delete with confirmation dialog
  - "Reset Defaults" button to seed default services
  - **Stripe sync**: When a service is created/edited/deleted, it should also create/update/archive the corresponding Stripe product+price. Use the existing API route pattern or create a new one at `/api/services/route.ts` that handles Stripe sync server-side.

### Tab 3: Integrations
- Placeholder for future integrations (custom code injection, etc.)
- Show "More Coming Soon" placeholder card

## 4. New Components Needed

### `src/components/trainer/availability-modal.tsx`
- Modal to add/edit availability time blocks
- Fields: day of week (dropdown), start time, end time
- Save to `trainer_availability` table

### `src/components/trainer/google-calendar-settings.tsx`
- Google Calendar connection status
- Connect/Disconnect buttons
- Timezone dropdown
- Reusable in trainer settings tab

### `src/components/admin/service-modal.tsx`
- Modal for creating/editing services
- Fields: title, description, price, duration_minutes, category, is_popular
- On save: upsert to `services` table + sync to Stripe

## 5. API Routes Needed

### `/api/services/route.ts` (if not exists)
- POST: Create service + create Stripe product/price
- PUT: Update service + update Stripe product/price
- DELETE: Delete service + archive Stripe product

### `/api/trainer/availability/route.ts`
- GET: Fetch trainer's availability
- POST: Create/update availability block
- DELETE: Remove availability block

### `/api/trainer/bookings/route.ts` (or extend existing)
- POST approve: Call approve logic (or proxy to edge function)
- POST decline: Call decline logic (or proxy to edge function)

## 6. Styling Guidelines
- Use the pink/purple/cyan gradient theme already in globals.css
- Welcome banner: `bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500`
- Section cards with colored left borders (yellow for pending, green for confirmed)
- Tabs with `bg-white/50 backdrop-blur` styling
- Purple accent for icons and badges
- Use existing shadcn/ui components (Card, Button, Tabs, Input, Badge, Dialog, etc.)
- Responsive: single column on mobile, multi-column on desktop

## 7. Priority Order
1. Update sidebar branding (Dumbbell + Foundation Fitness)
2. Rebuild trainer dashboard with 3 tabs (Bookings, Schedule, Settings)
3. Rebuild admin dashboard with 3 tabs (Trainers, Services, Integrations)
4. Create availability modal component
5. Create service modal component  
6. Create/update API routes for services with Stripe sync
7. Create API routes for availability management
