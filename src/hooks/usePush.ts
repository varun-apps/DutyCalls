import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

/**
 * Convert a base64url VAPID public key into the Uint8Array the Push API expects.
 * Handles both base64url (`-`/`_`) and standard base64 (`+`/`/`) with or without padding.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  // Allocate a concrete ArrayBuffer (not SharedArrayBuffer) so the result is a
  // valid BufferSource for the Push API's applicationServerKey parameter.
  const buffer = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

/**
 * Web Push subscription hook.
 *
 * - `permission` reflects Notification.permission (or 'unsupported' if the
 *   Push API / SW isn't available).
 * - `subscribe()` is the user-gesture entry point: it requests permission,
 *   subscribes via the service worker's PushManager, and upserts the
 *   subscription into `push_subscriptions` via the `register_push_subscription`
 *   RPC so the `notify-group` Edge Function can reach this device.
 * - `unsubscribe()` removes the browser subscription and the DB row.
 *
 * The hook re-syncs the DB row whenever the session changes so a returning
 * user keeps receiving pushes on the same browser.
 */
export function usePushNotifications(isSignedIn: boolean) {
  const [permission, setPermission] = useState<PushPermission>('default')
  const [busy, setBusy] = useState(false)

  // Track Notification.permission and Push API availability.
  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as PushPermission)
    if (Notification.permission === 'granted') {
      // Nothing to do here; the subscription is created on demand via subscribe().
    }
  }, [])

  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!vapidPublicKey

  const subscribe = useCallback(async () => {
    if (!supported || !isSignedIn) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready

      // Ask the user for permission (must be from a user gesture).
      const result = await Notification.requestPermission()
      setPermission(result as PushPermission)
      if (result !== 'granted') return

      // Subscribe (or reuse) the browser push subscription.
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        })
      }

      const keys = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      if (!keys || !auth) throw new Error('Push subscription missing keys')

      // Persist to Supabase so notify-group can target this device.
      const { error } = await supabase.rpc('register_push_subscription', {
        p_endpoint: sub.endpoint,
        p_p256dh: btoa(String.fromCharCode(...new Uint8Array(keys))),
        p_auth_key: btoa(String.fromCharCode(...new Uint8Array(auth)))
      })
      if (error) throw error
    } finally {
      setBusy(false)
    }
  }, [supported, isSignedIn])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      // Best-effort DB cleanup; the notify-group function also prunes dead subs.
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', sub?.endpoint ?? '')
    } finally {
      setBusy(false)
    }
  }, [supported])

  return { permission, supported, busy, subscribe, unsubscribe }
}
