import crypto from 'node:crypto'
import webpush from 'web-push'

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1'
const PROJECT =
  process.env.APPWRITE_PROJECT_ID || '6aafc3d40001cf6b0d6d'
const DATABASE = process.env.APPWRITE_DATABASE_ID || 'main'
const TABLE = 'push_subscriptions'
const APP = 'ct'

export function vapidConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  )
}

export function configureWebPush() {
  if (!vapidConfigured()) {
    throw new Error('VAPID env vars missing')
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

export function assertCronAuth(req) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.authorization || ''
  const cronHeader = req.headers['x-vercel-cron']
  if (cronHeader === '1') return true
  if (secret && auth === `Bearer ${secret}`) return true
  return false
}

function appwriteHeaders() {
  const key = process.env.APPWRITE_API_KEY
  if (!key) throw new Error('APPWRITE_API_KEY missing')
  return {
    'X-Appwrite-Project': PROJECT,
    'X-Appwrite-Key': key,
    'Content-Type': 'application/json',
  }
}

export async function listSubsByApp(app = APP) {
  const url = new URL(
    `${ENDPOINT}/tablesdb/${DATABASE}/tables/${TABLE}/rows`,
  )
  // Appwrite 1.8+/TablesDB query encoding (JSON objects)
  url.searchParams.append(
    'queries[]',
    JSON.stringify({ method: 'equal', attribute: 'app', values: [app] }),
  )
  url.searchParams.append(
    'queries[]',
    JSON.stringify({ method: 'limit', values: [100] }),
  )

  const res = await fetch(url.toString(), { headers: appwriteHeaders() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Appwrite list rows failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  return data.rows || []
}

export async function updateRow(rowId, data) {
  const res = await fetch(
    `${ENDPOINT}/tablesdb/${DATABASE}/tables/${TABLE}/rows/${rowId}`,
    {
      method: 'PATCH',
      headers: appwriteHeaders(),
      body: JSON.stringify({ data }),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Appwrite update row failed: ${res.status} ${text}`)
  }
  return res.json()
}

export async function deleteRow(rowId) {
  const res = await fetch(
    `${ENDPOINT}/tablesdb/${DATABASE}/tables/${TABLE}/rows/${rowId}`,
    { method: 'DELETE', headers: appwriteHeaders() },
  )
  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`Appwrite delete row failed: ${res.status} ${text}`)
  }
}

export function todayIstDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function parseLastSent(raw) {
  if (!raw || typeof raw !== 'string') return {}
  try {
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

export async function sendToSubscription(subscription, payload) {
  configureWebPush()
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  await webpush.sendNotification(subscription, body)
}

export async function sendSlot(app, slot, buildPayload) {
  const today = todayIstDate()
  const rows = await listSubsByApp(app)
  const results = { sent: 0, skipped: 0, gone: 0, errors: 0 }

  for (const row of rows) {
    const last = parseLastSent(row.last_sent)
    if (last[slot] === today) {
      results.skipped += 1
      continue
    }
    if (app === 'ct' && slot === 'streak' && row.ct_done_ist === today) {
      results.skipped += 1
      continue
    }

    const subscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    }
    const payload = buildPayload(row)

    try {
      await sendToSubscription(subscription, payload)
      last[slot] = today
      await updateRow(row.$id, {
        last_sent: JSON.stringify(last),
        updated_at: new Date().toISOString(),
      })
      results.sent += 1
    } catch (err) {
      const status = err?.statusCode || err?.status
      if (status === 404 || status === 410) {
        await deleteRow(row.$id)
        results.gone += 1
      } else {
        console.error('[push] send failed', row.$id, err?.message || err)
        results.errors += 1
      }
    }
  }
  return results
}

export function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export { APP, crypto }
