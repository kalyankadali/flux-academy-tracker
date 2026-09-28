import { json, sendToSubscription, vapidConfigured } from '../_lib/push.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }
  if (!vapidConfigured()) {
    return json(res, 503, { error: 'VAPID not configured on server' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return json(res, 400, { error: 'Invalid JSON' })
    }
  }
  const sub = body?.subscription
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return json(res, 400, { error: 'subscription required' })
  }

  try {
    await sendToSubscription(sub, {
      title: 'Calm Tracker',
      body: 'Test — notifications work on this phone.',
      url: '/',
      tag: 'ct-test',
    })
    return json(res, 200, { ok: true })
  } catch (err) {
    console.error('[push/test]', err)
    return json(res, 500, { error: err?.message || 'Send failed' })
  }
}
