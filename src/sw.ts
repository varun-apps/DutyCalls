/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

// Auto-update behavior: take over immediately on new SW activation.
self.skipWaiting()
clientsClaim()

// Precache the app shell manifest injected by vite-plugin-pwa.
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ---------------------------------------------------------------------------
// Web Push: show a notification when a push arrives.
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let payload: { title?: string; body?: string; data?: { url?: string } } = {}
  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { body: event.data?.text() ?? '' }
  }
  const title = payload.title ?? 'DutyCalls'
  const options: NotificationOptions = {
    body: payload.body ?? '',
    data: payload.data ?? {},
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png'
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// ---------------------------------------------------------------------------
// notificationclick: focus an existing app tab or open a new one at the
// deep link carried in the push payload (data.url).
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string) ?? '/'
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      // Prefer a tab already at the deep link, else any app tab.
      const match =
        allClients.find((c) => c.url.includes(targetUrl)) ?? allClients[0]
      if (match) {
        await match.focus()
        if ('navigate' in match && targetUrl !== '/') {
          // Best-effort navigation (client.navigate is not universally supported).
          try {
            await (match as WindowClient).navigate(targetUrl)
          } catch {
            /* ignore */
          }
        }
        return
      }
      await self.clients.openWindow(targetUrl)
    })()
  )
})
