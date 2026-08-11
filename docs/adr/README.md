# Architecture Decision Records

This directory holds the Architecture Decision Records (ADRs) for **DutyCalls**.

## Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-tanstack-start-vite-react.md) | Use Vite + React (TypeScript) + TanStack Query | Accepted | 2026-08-11 |
| [0002](0002-supabase-as-baas.md) | Use Supabase as the Backend-as-a-Service | Accepted | 2026-08-11 |
| [0003](0003-group-based-sharing-rls.md) | Group-based sharing model enforced by RLS | Accepted | 2026-08-11 |
| [0004](0004-online-first-realtime-cache.md) | Online-first data with optimistic UI + cache fallback | Accepted | 2026-08-11 |
| [0005](0005-task-status-enum.md) | Task status enum: start / in_progress / complete | Accepted | 2026-08-11 |
| [0006](0006-pwa-vite-plugin-pwa.md) | PWA via vite-plugin-pwa + iOS meta tags | Accepted | 2026-08-11 |
| [0007](0007-notification-strategy.md) | Realtime + Web Push notification strategy | Accepted | 2026-08-11 |

## Creating a new ADR

1. Copy an existing ADR to `NNNN-kebab-title.md`.
2. Fill in Context → Decision → Consequences.
3. Update this index.
4. Open a PR for review.
