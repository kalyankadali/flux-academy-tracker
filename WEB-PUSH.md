# Web Push (Android Chrome spare)

## Enable on the spare phone
1. Chrome → open https://clear-home-rbwc-alpha.vercel.app (Better Home) or https://flux-academy-tracker.vercel.app (Calm Tracker)
2. Menu → **Add to Home Screen** / Install
3. Open from the home-screen icon
4. Sign in with Google
5. Settings (BH) or Sync (CT) → **Enable notifications on this phone** → Allow
6. **Send test notification**

## Server crons (Vercel Hobby = 2/day)
Configured on **clear-home-rbwc**:
- `0 5 * * *` → `/api/cron/tick` (morning meds ~10:30 IST)
- `0 13 * * *` → `/api/cron/tick` (evening meds ~18:30 IST)

For soft-wake (~07:00 IST) and Calm Tracker streak (~20:30 IST), either:
- Upgrade Vercel so more daily crons are allowed, or
- Hit `GET /api/cron/tick` on Better Home with header `Authorization: Bearer $CRON_SECRET` (or `x-vercel-cron: 1`) from an external scheduler at `30 1 * * *` and `30 14 * * *` UTC.

CT also exposes `GET /api/cron/streak-nudge` with the same auth.

## Env vars (already set on both Vercel projects)
`VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
`CRON_SECRET`, `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID`
