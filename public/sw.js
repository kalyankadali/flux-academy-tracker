/* Calm Tracker Web Push service worker */
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {
    title: 'Calm Tracker',
    body: 'Progress, calmly.',
    url: '/',
    tag: 'ct-push',
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch {
    try {
      const text = event.data && event.data.text()
      if (text) data.body = text
    } catch {
      /* ignore */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Calm Tracker', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: data.url || '/' },
      tag: data.tag || 'ct-push',
      renotify: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(target)
            } catch {
              /* ignore */
            }
          }
          return
        }
      }
      await clients.openWindow(target)
    })(),
  )
})
