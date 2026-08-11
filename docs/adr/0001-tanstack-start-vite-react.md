# ADR-0001: Use Vite + React (TypeScript) + TanStack Query

## Status

Accepted

## Context

DutyCalls is a collaborative daily-todo PWA targeting Android and iOS. We need a
fast, type-safe frontend with good developer ergonomics, small bundle, and first-class
PWA support (service worker + manifest).

## Decision

Use **Vite + React 19 + TypeScript** for the app, with **TanStack Query** for server
state. UI is built with **Tailwind CSS v4** and shadcn-style components on Radix primitives.

## Rationale

- Vite gives instant HMR, a tiny config, and a reliable production build; `vite-plugin-pwa`
  (Workbox) is the de-facto standard for installable PWAs on both Android and iOS.
- TanStack Query handles caching, background refetch, and optimistic updates — exactly
  what a collaborative, real-time todo app needs.
- TypeScript keeps the boundary with the (typed) Supabase schema safe.

## Considered alternatives

- **TanStack Start** (full-stack React framework): considered, but for a client-side PWA
  the extra SSR machinery adds complexity without clear benefit; the file-based router
  also carries codegen/tooling risk under the newest TypeScript (7.x) toolchain. Deferred.
- **Next.js**: server components + Node runtime are overkill for this app.

## Consequences

- Routing is lightweight state-based navigation for the MVP (date + tab). Can be upgraded
  to TanStack Router later without rework.
- We depend on the Vite/Workbox PWA pipeline for installability and offline app-shell.
