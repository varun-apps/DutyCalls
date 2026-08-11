# ADR-0004: Online-first data with optimistic UI + cache fallback

## Status

Accepted

## Context

A collaborative todo app should feel instant and stay usable on flaky connections, but
building a full offline-first sync engine (local source-of-truth + conflict resolution)
is a large undertaking.

## Decision

Adopt an **online-first** model:

- TanStack Query caches recent data for instant loads.
- Mutations are **optimistic** (status changes render immediately, rollback on error).
- Supabase **Realtime** keeps collaborators in sync while online.
- The service worker precaches the **app shell** so the UI loads offline; data still
  requires connectivity (no local database, no background sync).

## Rationale

- Fits Supabase's model naturally (Realtime + Postgres as source of truth).
- Dramatically simpler than offline-first: no local SQLite, no sync, no conflict policy.
- Covers the common case (mobile data/Wi-Fi) well; the app shell still installs offline.

## Considered alternatives

- **Full offline-first** (local SQLite + background sync): works fully offline but adds a
  sync engine, conflict resolution, larger bundle, and operational complexity. Deferred.
- **Minimal PWA** (no data caching): too brittle on poor connections.

## Consequences

- Editing requires connectivity; if offline, optimistic edits roll back on failure.
- A future upgrade to offline-first is additive (add a local cache layer + sync), not a
  rewrite.
