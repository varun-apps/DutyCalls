# ADR-0006: PWA via vite-plugin-pwa + iOS meta tags

## Status

Accepted

## Context

The app must be installable on Android and iOS and load its shell offline.

## Decision

Use **`vite-plugin-pwa`** (Workbox) to:
- precache the app shell (`globPatterns` for js/css/html/svg/png/woff2);
- generate `manifest.webmanifest` (name, icons 192/512/maskable, `display: standalone`,
  theme/background colors, `start_url: /`);
- provide `navigateFallback` to `index.html` for client-side navigation, **excluding**
  Supabase `/auth/v1`, `/rest/v1`, `/realtime/v1` so the SW never proxies API traffic.

Add iOS meta tags (`apple-mobile-web-app-capable`, status-bar style, apple-touch-icon)
in `index.html` for home-screen install on iOS.

## Rationale

- Workbox is the battle-tested SW generator; `vite-plugin-pwa` integrates it cleanly.
- Excluding Supabase paths avoids stale/cached API responses.
- iOS requires explicit meta tags for full-screen + icon behaviour.

## Consequences

- The SW precaches ~17 entries; updates are `autoUpdate` (users get new builds on reload).
- iOS background limitations (no true background sync until recent iOS) are documented in
  ADR-0007.
