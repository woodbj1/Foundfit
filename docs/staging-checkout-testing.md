# Staging Checkout Testing

Use the `staging` Netlify branch deploy for Stripe test-card testing. Keep production on live Stripe keys.

## What this setup does

- `master` stays production and continues using live Stripe keys.
- `staging` becomes the safe branch for checkout testing.
- Stripe success and cancel redirects follow the current request origin, so staging checkout returns to the staging site instead of production.
- Netlify sets `NEXT_PUBLIC_APP_URL` to `https://staging--foundfit.netlify.app` for the `staging` branch deploy context.

## Create the staging deploy

1. Push the `staging` branch to GitHub.
2. In Netlify, make sure branch deploys are enabled for `staging`.
3. Open the branch deploy URL:
   `https://staging--foundfit.netlify.app`

## Netlify environment variables for `staging`

Set these on the Netlify site for the `staging` branch context:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DAILY_API_KEY`
- `VIMEO_LIBRARY_URL`

## Recommended staging values

- Stripe:
  - use `pk_test_...`
  - use `sk_test_...`
  - use the webhook secret from the staging webhook endpoint
- App URL:
  - `https://staging--foundfit.netlify.app`
- Supabase:
  - ideally use a separate staging Supabase project

## Strong warning about Supabase

Do not point staging Stripe test checkout at the production Supabase project unless you are comfortable creating test subscriptions, test session packs, and test bookings in the live database.

The safe setup is:

- staging Netlify branch deploy
- staging Stripe test keys
- staging Supabase project

If you need to move quickly, use dedicated test users and be aware that webhook-created records will still land in whichever Supabase project is configured for staging.

## Stripe webhook for staging

Create a webhook endpoint in Stripe test mode for:

- `https://staging--foundfit.netlify.app/api/webhooks/stripe`

Subscribe it to the same events used in production, then copy that test-mode signing secret into Netlify as `STRIPE_WEBHOOK_SECRET` for the `staging` branch.

## Smoke test checklist

1. Open the staging site.
2. Sign up with a test user.
3. Purchase a package with `4242 4242 4242 4242`.
4. Confirm checkout returns to the staging dashboard.
5. Verify the webhook creates the expected subscription or session pack.
6. Book a session.
7. Open the billing portal from staging and confirm it returns to staging `/account`.
