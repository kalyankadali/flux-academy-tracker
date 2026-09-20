# Appwrite setup (Flux Academy Tracker)

Shared project with Clear Home. Client apps use **only** the public endpoint + project ID (no API key in the browser).

- Endpoint: `https://sgp.cloud.appwrite.io/v1`
- Project ID: `6aafc3d40001cf6b0d6d`

## 1. Auth

1. Open the Appwrite console → **Auth**.
2. Enable **Email magic URL** (Email OTP / Magic URL).
3. Under **Settings → Platforms**, add **Web** platforms for your hosts, e.g.:
   - `https://flux-academy-tracker.vercel.app`
   - `http://localhost:5173` (local Vite)
4. Magic links redirect to the app origin; the client completes login with `userId` + `secret` query params (`Account.createSession`, with `updateMagicURLSession` as a fallback on older SDKs).

## 2. Database

1. Create a database with ID **`main`** (exact ID).
2. Create collection **`flux_snapshots`** (exact ID).

### Attributes

| Key         | Type   | Size / notes                          | Required |
|-------------|--------|---------------------------------------|----------|
| `sync_id`   | string | 128                                   | yes      |
| `payload`   | string | 1_000_000+ (JSON string of SyncPayload) | yes   |
| `updated_at`| string | 64 (ISO timestamp)                    | yes      |
| `user_id`   | string | 36 (optional, mirrors document `$id`) | no       |

Document **`$id`** = Appwrite user `$id` (one snapshot per user; upsert on push).

### Permissions (collection)

- **Create**: `users` (any signed-in user can create their own doc)
- **Read / Update / Delete**: document-level via `Role.user(<userId>)` set on create (the app sets these).  
  Alternatively set collection read/update/delete to `users` and rely on document ID = user id (users should only ever address their own id).

## 3. Vercel env vars

```
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6aafc3d40001cf6b0d6d
```

Defaults in code match the Singapore endpoint + this project ID if env is omitted. Do **not** set `APPWRITE_API_KEY` in Vercel for these client apps.

## 4. Local

Copy `.env.example` → `.env.local` (optional if defaults are fine).

```bash
bun install
bun run build
```
