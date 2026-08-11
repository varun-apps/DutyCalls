# DutyCalls

A shared daily todo-list **PWA** for families and teams. Create tasks per day, share a
list with your partner, and stay in sync in real time. Installable on Android and iOS.

> Wife creates a task → it appears on her husband's screen instantly. Both can move it
> through `start → in_progress → complete`.

## Features

- 📅 **Daily todos on a date** — navigate day by day; today is shown by default.
- 👥 **Shared lists** — invite people by email; everyone in a group sees the same tasks
  (enforced by Postgres Row-Level Security).
- 🔁 **Real-time sync** — Supabase Realtime broadcasts task changes between collaborators.
- ✅ **Three statuses** — `start`, `in_progress`, `complete` (with `completed_at` tracking).
- 📲 **Installable PWA** — service worker + manifest, works offline for the app shell.
- 🔔 **Web Push notifications** (optional) — other members get a push when a task changes.
- 🔐 **Supabase Auth** — email/password, magic link, Google, and Sign in with Apple.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React + Vite (TypeScript) |
| Data | TanStack Query (server state + optimistic updates) |
| Backend | Supabase (Postgres + Auth + Realtime + RLS + Edge Functions) |
| UI | Tailwind CSS v4 + shadcn-style components + Radix primitives |
| PWA | `vite-plugin-pwa` (Workbox) |
| Validation | Zod (planned at boundaries) |

## Architecture

See [`docs/adr/`](docs/adr/README.md) for the recorded decisions. In short:

```
PWA (Vite + React + TanStack Query)
        │  supabase-js (HTTPS)
        ▼
Supabase ── Postgres (RLS) · Auth · Realtime · Edge Functions (notify-group)
```

- **Sharing model:** a *group* is the sharing boundary; membership + RLS enforce access.
- **Offline:** online-first with optimistic UI + cache fallback (no local DB / sync engine).
- **Notifications:** Realtime for live in-app updates; Web Push for background (iOS 16.4+).

## Prerequisites

- Node.js 20+ (developed on Node 22) — use [nvm](https://github.com/nvm-sh/nvm)
- A Supabase project (Dashboard → create project)
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#   fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project

# 3. Apply the database schema + RLS + RPCs to your project
supabase login
supabase link --project-ref <your-project-ref>
supabase db push

# 4. (Optional) Generate typed client from your schema
npm run supabase:types

# 5. Run the app
npm run dev        # http://localhost:5173
```

### Authentication providers (optional)

Enable Google / Sign in with Apple under **Supabase Dashboard → Authentication → Providers**.

### Web Push (optional)

```bash
npx web-push generate-vapid-keys          # get a public + private key
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
```

Put the **public** key in `.env.local` as `VITE_VAPID_PUBLIC_KEY`. Deploy the
`notify-group` Edge Function: `supabase functions deploy notify-group`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript only |
| `npm run icons` | Regenerate PWA icons from `public/icon.svg` |
| `npm run supabase:types` | Generate `src/types/database.types.ts` from the linked project |


## License

[MIT](LICENSE) © Varun Arya
