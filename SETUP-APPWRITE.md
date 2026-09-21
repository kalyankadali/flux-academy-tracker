# Appwrite setup (Flux Academy Tracker)

Shared project with Clear Home. Client apps use **only** the public endpoint + project ID (no API key in the browser).

- Endpoint: `https://sgp.cloud.appwrite.io/v1`
- Project ID: `6aafc3d40001cf6b0d6d`

## 1. Auth (Google OAuth2)

1. Open the Appwrite console → **Auth** → **Settings**.
2. Enable **Google** as an OAuth2 provider.
3. In [Google Cloud Console](https://console.cloud.google.com/) create an **OAuth 2.0 Client ID** of type **Web application**.
4. Paste the **Client ID** and **Client Secret** into the Appwrite Google provider fields (secret stays in Appwrite only — **never** put it in this repo or Vercel env).
5. Set the Google authorized **redirect URI** to exactly:
   ```
   https://sgp.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/6aafc3d40001cf6b0d6d
   ```
6. Under Google **Authorized JavaScript origins**, add your production Flux origin(s) and local origins (e.g. `https://flux-academy-tracker.vercel.app`, `http://localhost:5173`).
7. Under Appwrite **Settings → Platforms**, add **Web** platforms for the same production domain(s) and `http://localhost:5173`.

The app calls `Account.createOAuth2Session` with provider Google; success/failure redirect back to `window.location.origin` (+ current path). After the session exists, auto sync (push/pull) continues as before.

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

Defaults in code match the Singapore endpoint + this project ID if env is omitted. Do **not** set `APPWRITE_API_KEY` or any Google Client Secret in Vercel for these client apps.

## 4. Local

Copy `.env.example` → `.env.local` (optional if defaults are fine).

```bash
bun install
bun run build
```
