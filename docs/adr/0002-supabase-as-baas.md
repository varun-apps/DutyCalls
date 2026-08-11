# ADR-0002: Use Supabase as the Backend-as-a-Service

## Status

Accepted

## Context

We need a backend providing auth, a relational database, row-level access control,
real-time change broadcast, and server-side functions — without running our own servers.

## Decision

Use **Supabase** (Postgres + Auth + Realtime + Storage + Edge Functions) as the entire
backend. All tables live in the `public` schema and use **Row-Level Security (RLS)** as
the authoritative access-control layer.

## Rationale

- Postgres + RLS is the right model for multi-user sharing: access is enforced in the
  database, not the UI, so a stolen anon key still cannot read another group's data.
- Supabase Realtime gives live collaboration with zero custom infra.
- Edge Functions (Deno) cover the few operations that must run server-side (Web Push).
- Auth supports email/password, magic link, Google, and Apple in one API.

## Consequences

- The anon key is public and safe (RLS protects data); the service-role key is secret and
  only ever an Edge Function secret — never shipped to the client.
- We are coupled to Supabase's APIs; migrating off would require re-implementing
  auth/realtime/storage (acceptable for this scope).
