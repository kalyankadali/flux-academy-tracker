import {
  assertCronAuth,
  json,
  sendSlot,
  vapidConfigured,
} from '../_lib/push.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }
  if (!assertCronAuth(req)) {
    return json(res, 401, { error: 'Unauthorized' })
  }
  if (!vapidConfigured()) {
    return json(res, 503, { error: 'VAPID not configured' })
  }
  if (!process.env.APPWRITE_API_KEY) {
    return json(res, 503, { error: 'APPWRITE_API_KEY not configured' })
  }
  try {
    const results = await sendSlot('ct', 'streak', () => ({
      title: 'Calm Tracker',
      body: 'One Calm Tracker lesson keeps the streak',
      url: '/',
      tag: 'ct-streak',
    }))
    return json(res, 200, { ok: true, slot: 'streak', ...results })
  } catch (err) {
    console.error('[cron streak-nudge]', err)
    return json(res, 500, { error: err?.message || 'Send failed' })
  }
}
