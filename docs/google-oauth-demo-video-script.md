# Google OAuth Demo Video Script

Use this to record the OAuth verification demo video for FoundFit's Google Calendar integration.

## Goal

Show Google exactly how FoundFit uses the requested Google scopes during the trainer onboarding and booking flow.

Requested scopes currently used by the app:

- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/userinfo.email`

## Recording Settings

- Record in English
- Keep browser zoom high enough to clearly show the address bar and OAuth consent screen
- Set the finished YouTube video to `Unlisted`
- Target length: 3 to 5 minutes

## What Google Expects To See

- The real FoundFit app and branding
- The complete OAuth grant flow
- The OAuth consent screen with the requested scopes
- The browser address bar during the consent flow
- How the granted Google Calendar data is actually used in the product

## Accounts To Use

- `Trainer test account`
  Use a real trainer account in FoundFit that can access `/trainer-setup`
- `Client test account`
  Use a client account that can buy/book a session
- `Google account for the trainer`
  Use the Google Calendar account the trainer will connect

## Suggested Video Title

`FoundFit Google Calendar OAuth Scope Demo`

## Script And Shot List

### Scene 1: Start on FoundFit

Say:

`This is FoundFit. Trainers use FoundFit to connect their own Google Calendar so the platform can read busy times and create calendar events for approved sessions.`

Show:

- Open `https://foundfit.net`
- Briefly show the site header and branding

### Scene 2: Go to trainer setup

Say:

`In FoundFit, each trainer connects their own calendar during setup. This is where the Google access begins.`

Show:

- Sign in as a trainer
- Open `https://foundfit.net/trainer-setup`
- Show the card that says `Connect Google Calendar`

### Scene 3: Start the OAuth flow

Say:

`When the trainer clicks Connect Google Calendar, FoundFit sends them to Google’s OAuth consent screen.`

Show:

- Click `Connect Google Calendar`
- Pause on the Google consent screen
- Make sure the browser address bar is visible
- Zoom enough so the app name and scopes are readable

### Scene 4: Show the consent screen details

Say:

`On this screen, Google shows the FoundFit app name and the permissions being requested. FoundFit requests calendar access so it can check trainer availability and create approved booking events, and email access so it can identify which Google account was connected.`

Show:

- The FoundFit app name on the consent screen
- The requested permissions
- The browser address bar with the OAuth request visible

### Scene 5: Approve access

Say:

`The trainer grants access to their calendar, and Google returns them to FoundFit.`

Show:

- Click through the Google approval flow
- Return to FoundFit
- Show the setup success state
- Show the connected Google email in the UI

### Scene 6: Show how the calendar connection is stored in product UX

Say:

`After approval, FoundFit marks the trainer’s calendar as connected. This connection is only used for that trainer’s availability and bookings.`

Show:

- Trainer setup page success state
- Trainer dashboard settings card showing `Connected`

### Scene 7: Demonstrate busy-time checking

Say:

`FoundFit reads the trainer’s Google Calendar busy times to avoid offering booking slots when the trainer is already occupied.`

Show:

- Open the trainer’s Google Calendar in another tab
- Create or point to an existing event during a visible time block
- Switch to FoundFit
- Go through a client booking flow for that trainer
- Open available slots for that same day
- Show that the busy calendar time is not offered

### Scene 8: Demonstrate event creation from approved booking

Say:

`When a client books a session and the booking is approved, FoundFit creates a Google Calendar event on that trainer’s calendar.`

Show:

- As a client, book a session with the connected trainer
- As the trainer or admin, approve the booking
- Return to Google Calendar
- Show the newly created booking event

### Scene 9: Close

Say:

`That is how FoundFit uses the requested Google scopes: to connect a trainer’s Google account, read busy times for availability, and create Google Calendar events for approved bookings.`

Show:

- Final view of the created Google Calendar event
- Final view of the FoundFit booking or trainer dashboard

## Fast Recording Checklist

- Show `foundfit.net`
- Show trainer setup page
- Show full Google OAuth consent screen
- Show browser address bar during OAuth
- Show the exact scopes
- Show successful return to FoundFit
- Show connected calendar status
- Show busy-time blocking in booking flow
- Show approved booking creating a Google Calendar event
- Upload to YouTube as `Unlisted`

## Helpful Notes

- If the consent screen is still in `Testing`, use a Google account listed as a test user
- If Google asks for a revised video, keep the same structure and make the consent screen portion longer and clearer
