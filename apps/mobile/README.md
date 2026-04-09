# FoundFit Mobile

This is the dedicated Expo client app for FoundFit. It is the client-facing mobile app for booking sessions, joining virtual workouts, and using the guided workout studio. Admin and trainer operations stay in the web app.

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

## Environment

Copy `.env.example` to `.env` and fill in:

```bash
EXPO_PUBLIC_APP_URL=https://foundfit.net
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

`EXPO_PUBLIC_APP_URL` should point at the deployed Next.js app because the mobile client uses the existing FoundFit API routes for bookings, sessions, and library access.

For cloud builds, set the same variables in Expo/EAS:

- `EXPO_PUBLIC_APP_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Local development

```bash
npm install
npm run start
```

Useful variants:

```bash
npm run start
npm run start:preview
npm run start:production
npm run start:dev-client
```

The app config reads `APP_VARIANT` and produces separate bundle identifiers and package names so the dev build can live on the same device as preview or production:

- Production: `net.foundfit.app`
- Preview: `net.foundfit.app.preview`
- Development: `net.foundfit.app.dev`

## Quality checks

```bash
npm run lint
npm run typecheck
npm run doctor
```

## EAS build profiles

This app is configured with `eas.json` in the app directory, following Expo's monorepo guidance. Run EAS commands from `apps/mobile`.

Available profiles:

- `development`
  Creates a development client for device testing.
- `simulator`
  Creates an iOS simulator build.
- `preview`
  Creates a signed internal-distribution build for stakeholder testing.
- `production`
  Creates the store-ready build for TestFlight and Google Play internal testing.

Build commands:

```bash
npm run build:ios:simulator
npm run build:ios:preview
npm run build:android:preview
npm run build:ios:production
npm run build:android:production
```

Submit commands:

```bash
npm run submit:ios:production
npm run submit:android:production
```

## Publishable-state checklist

1. Install EAS CLI or use `npx eas`.
2. Log in with your Expo account:

```bash
npx eas login
```

3. Initialize the project with Expo once:

```bash
npx eas init
```

This step will attach an Expo project id to the app config. Because this app uses `app.config.ts`, Expo may ask you to paste the generated project id into the config manually.

4. Set the public mobile env vars in Expo:
   - `EXPO_PUBLIC_APP_URL`
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

5. Create the Apple and Google app records using the production identifiers:
   - iOS bundle identifier: `net.foundfit.app`
   - Android package: `net.foundfit.app`

6. Build preview binaries for team testing.
7. Build production binaries for TestFlight and Google Play internal testing.
8. Submit the production builds when the app-store records are ready.

## App Store setup notes

### Apple / TestFlight

- Apple Developer membership is required.
- Create the App Store Connect app with bundle identifier `net.foundfit.app`.
- Let EAS manage signing credentials remotely unless you have a reason to keep them locally.
- `production` builds are the right ones for TestFlight upload.

### Google Play internal testing

- Create the Play Console app with package `net.foundfit.app`.
- `production` builds can be submitted to the `internal` testing track.
- The included submit profile already targets the internal track for Android.

## Architecture notes

- [auth-provider.tsx](C:/Users/woodb/Projects/foundfit/apps/mobile/src/providers/auth-provider.tsx)
  Handles Supabase auth session state.
- [api.ts](C:/Users/woodb/Projects/foundfit/apps/mobile/src/lib/api.ts)
  Sends authenticated requests to the main FoundFit backend using the Supabase access token.
- [src/app/(app)](C:/Users/woodb/Projects/foundfit/apps/mobile/src/app/(app))
  Main client screens and tab navigation.
- [workout-catalog.ts](C:/Users/woodb/Projects/foundfit/apps/mobile/src/lib/workout-catalog.ts)
  Guided workout catalog powering the virtual studio.

## Important backend dependency

The mobile app relies on the web app accepting bearer-token auth on the existing API routes. That support is already added in the main FoundFit backend.
