import { Permission, Role, TablesDB } from 'appwrite'
import { getClient, getSession, isCloudConfigured } from './appwrite'

const DATABASE_ID = 'main'
const TABLE_ID = 'push_subscriptions'
const APP = 'ct' as const
const LOCAL_KEY = 'ct-webpush-enabled'

function vapidPublicKey(): string | null {
  const k = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim()
  return k || null
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported()) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (err) {
    console.warn('[webPush] SW register failed', err)
    return null
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function rowIdFor(userId: string): Promise<string> {
  const data = new TextEncoder().encode(`${APP}:${userId}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

function getTables(): TablesDB | null {
  const client = getClient()
  if (!client) return null
  return new TablesDB(client)
}

function ownPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

export type PushEnableResult =
  | { ok: true; subscription: PushSubscriptionJSON }
  | { ok: false; error: string }

export async function enableWebPush(): Promise<PushEnableResult> {
  if (!isWebPushSupported()) {
    return {
      ok: false,
      error: 'Web Push is not supported in this browser. Try Chrome on Android.',
    }
  }
  const publicKey = vapidPublicKey()
  if (!publicKey) {
    return { ok: false, error: 'VITE_VAPID_PUBLIC_KEY is not set for this build.' }
  }
  if (!isCloudConfigured()) {
    return { ok: false, error: 'Appwrite is not configured.' }
  }

  const session = await getSession()
  if (!session?.user) {
    return { ok: false, error: 'Sign in with Google first so this phone can sync alerts.' }
  }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    return { ok: false, error: 'Permission denied.' }
  }

  const reg = await registerPushServiceWorker()
  if (!reg) return { ok: false, error: 'Could not register service worker.' }
  await navigator.serviceWorker.ready

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    })
  }

  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: 'Subscription incomplete.' }
  }

  const tables = getTables()
  if (!tables) return { ok: false, error: 'Appwrite TablesDB unavailable.' }

  const userId = session.user.id
  const rowId = await rowIdFor(userId)
  const data = {
    user_id: userId,
    app: APP,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    updated_at: new Date().toISOString(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 250) : '',
  }

  try {
    await tables.upsertRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId,
      data,
      permissions: ownPermissions(userId),
    })
  } catch (err) {
    const msg =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Could not save subscription.'
    return { ok: false, error: msg }
  }

  try {
    localStorage.setItem(LOCAL_KEY, '1')
  } catch {
    /* ignore */
  }

  return { ok: true, subscription: json }
}

export async function disableWebPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/')
    const sub = await reg?.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
  } catch {
    /* ignore */
  }

  try {
    const session = await getSession()
    const tables = getTables()
    if (session?.user && tables) {
      const rowId = await rowIdFor(session.user.id)
      try {
        await tables.deleteRow({
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          rowId,
        })
      } catch {
        /* ignore missing */
      }
    }
  } catch {
    /* ignore */
  }

  try {
    localStorage.removeItem(LOCAL_KEY)
  } catch {
    /* ignore */
  }
}

export function isWebPushEnabledLocally(): boolean {
  try {
    return localStorage.getItem(LOCAL_KEY) === '1'
  } catch {
    return false
  }
}

export async function sendTestPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) {
    return { ok: false, error: 'Enable notifications on this phone first.' }
  }
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    })
    if (!res.ok) {
      const text = await res.text()
      let msg = text
      try {
        msg = (JSON.parse(text) as { error?: string }).error || text
      } catch {
        /* ignore */
      }
      return { ok: false, error: msg || `Test failed (${res.status})` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Test failed' }
  }
}

/** Soft update so evening streak cron can skip when a lesson is already done today (IST). */
export async function markCtLessonDoneToday(): Promise<void> {
  try {
    const session = await getSession()
    const tables = getTables()
    if (!session?.user || !tables) return
    if (!isWebPushEnabledLocally()) return
    const rowId = await rowIdFor(session.user.id)
    const ist = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    await tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId,
      data: { ct_done_ist: ist, updated_at: new Date().toISOString() },
    })
  } catch {
    /* best-effort */
  }
}
