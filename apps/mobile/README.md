# FoundFit Mobile

This is the dedicated Expo client app for FoundFit.

## Current V1 scope

- Client login and signup
- Dashboard overview
- Book, reschedule, and cancel sessions
- Join Daily virtual sessions
- Add approved sessions to the device calendar
- Guided virtual workout studio
- Workout of the day
- Build-for-me workout generation
- Browse-and-build workout blocks
- Surprise-me workout generation

Admin and trainer operations still stay in the web app.

## Environment

Copy `.env.example` to `.env` and fill in:

```bash
EXPO_PUBLIC_APP_URL=https://foundfit.net
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

`EXPO_PUBLIC_APP_URL` should point at the deployed Next.js app, because the mobile client calls the existing FoundFit API routes for bookings, sessions, and library access.

## Run locally

```bash
npm install
npx expo start
```

You can then open the app in:

- Expo Go
- an Android emulator
- the iOS simulator on macOS
- the Expo web preview

## Useful commands

```bash
npm run lint
npx tsc --noEmit
```

## Architecture notes

- `src/providers/auth-provider.tsx`
  Handles Supabase auth session state.
- `src/lib/api.ts`
  Sends authenticated requests to the main FoundFit backend using the Supabase access token.
- `src/app/(app)`
  Main client screens and tab navigation.
- `src/lib/workout-catalog.ts`
  Guided workout catalog powering the virtual studio.

## Important backend dependency

The mobile app relies on the web app accepting bearer-token auth on the existing API routes. That support is now added in the main FoundFit backend.
