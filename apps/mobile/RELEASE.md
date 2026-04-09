# FoundFit Mobile Release Runbook

This checklist is for getting the Expo mobile app from local development into TestFlight and Google Play internal testing.

## 1. One-time Expo and store setup

From [apps/mobile](C:/Users/woodb/Projects/foundfit/apps/mobile):

```bash
npx eas login
npx eas init
```

After `eas init`, Expo will attach a project id to the app config. Because this app uses `app.config.ts`, you may need to paste that generated project id into the config manually if Expo cannot write it for you.

Create these store records once:

- iOS bundle identifier: `net.foundfit.app`
- Android package: `net.foundfit.app`

## 2. Configure Expo/EAS environment variables

Add these in the Expo dashboard for the mobile app project:

- `EXPO_PUBLIC_APP_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Recommended production values:

- `EXPO_PUBLIC_APP_URL=https://foundfit.net`
- `EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>`

## 3. Preview distribution for stakeholder testing

Use preview builds when you want direct internal installs before store submission.

```bash
npm run build:ios:preview
npm run build:android:preview
```

These use the preview variant identifiers:

- `net.foundfit.app.preview`

## 4. Store-ready production builds

Use production builds when you are ready for TestFlight or Google Play internal testing:

```bash
npm run build:ios:production
npm run build:android:production
```

The production profile auto-increments build numbers remotely through EAS.

## 5. Submit to TestFlight and Play internal testing

When the store records and credentials are ready:

```bash
npm run submit:ios:production
npm run submit:android:production
```

Notes:

- iOS production submissions go to App Store Connect / TestFlight.
- Android submissions use the `internal` track from `eas.json`.

## 6. Recommended pre-submit checks

Before every store build:

```bash
npm run lint
npm run typecheck
npm run doctor
```

Also manually verify:

- login and signup
- booking, reschedule, and cancel
- virtual session join flow
- library access and guided workout flows
- add-to-calendar flow
- logout and session persistence

## 7. Credentials

Recommended default:

- let EAS manage iOS signing remotely
- let EAS manage Android keystore remotely

Only switch to local credentials if you have an existing signing process you must preserve.
