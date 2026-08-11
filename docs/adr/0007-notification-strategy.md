# ADR-0007: Realtime + Web Push notification strategy

## Status

Accepted

## Context

When person A changes a task, person B must learn about it — both while the app is open
and when it is closed.

## Decision

Two layers:

1. **Realtime (live, in-app).** Both clients subscribe to `postgres_changes` on `tasks`
   filtered by `group_id`. On any change, the affected TanStack Query cache is
   invalidated → the UI updates within ~100–500 ms. No polling.
2. **Web Push (background).** After a mutation, the actor calls the `notify-group` Edge
   Function, which looks up the *other* members' `push_subscriptions` and sends
   VAPID-signed Web Push notifications. Dead (410/404) subscriptions are pruned.

## Platform reality

| Platform | Background push |
| --- | --- |
| Android | Full Web Push (FCM/VAPID) ✅ |
| iOS | Only when "Added to Home Screen" and iOS 16.4+ ⚠️ |

## Considered alternatives

- **Polling**: simpler but laggy and battery-heavy. Rejected.
- **Email-only**: too slow for live collaboration. Kept as an optional digest.

## Consequences

- Realtime covers the "both online" case on every platform.
- Background push on iOS is conditional; for guaranteed iOS background push, a native
  wrapper (Capacitor) would be needed later — out of scope for the PWA build.
- An `activity_log` table is available for an optional in-app notification history.
