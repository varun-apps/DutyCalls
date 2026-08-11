# Deploying DutyCalls

DutyCalls is a static **Vite PWA** — the build output in `dist/` can be hosted on
any static host. The recommended free option is **Cloudflare Pages**.

## Recommended: Cloudflare Pages (free, unlimited bandwidth)

Cloudflare Pages gives a global CDN, automatic HTTPS, a `*.pages.dev` URL,
GitHub auto-deploy on push, and rollbacks — all on the free plan
(500 builds/month).

### Option A — Git integration (auto-deploy on push)

1. Go to **https://dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git**.
2. Authorise Cloudflare for GitHub and select the **`varun-apps/DutyCalls`** repo.
3. Configure the build:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Vite |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | (leave blank) |

4. Under **Settings → Variables and Secrets**, add these **build-time** environment
   variables (Vite injects `VITE_*` at build time, so they must be set here — for
   both *Production* and *Preview*):

   | Variable | Value |
   | --- | --- |
   | `NODE_VERSION` | `22` |
   | `VITE_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | your anon/publishable key (public — RLS protects data) |
   | `VITE_VAPID_PUBLIC_KEY` | *(optional)* your VAPID public key |

5. **Save and Deploy**. Cloudflare builds and serves the site at
   `https://dutycalls.pages.dev` (project name dependent). HTTPS is automatic, so
   the **PWA is installable** from this URL.

> The anon key is intentionally baked into the client bundle — it's public by
> design; all data access is gated by Supabase **RLS**. The service-role key never
> enters the frontend.

### Option B — Direct upload with Wrangler (no Git integration)

Build locally (so `.env.local` injects the `VITE_*` vars), then upload:

```bash
npm run build                      # uses .env.local for VITE_* vars
npm i -g wrangler
wrangler login
wrangler pages project create dutycalls
wrangler pages deploy dist --project-name=dutycalls
```

### Option B (modern) — Workers + Static Assets (`wrangler deploy`)

Cloudflare is consolidating Pages into **Workers + Static Assets**. The repo ships a
`wrangler.toml` that binds `./dist` with SPA fallback, so a single command deploys:

```bash
npm run build          # .env.local injects VITE_* at build time
npx wrangler deploy    # reads wrangler.toml → uploads dist as static assets
```

The CLI shorthand `npx wrangler deploy --assets ./dist` also works, but the
`wrangler.toml` is what sets `not_found_handling = "single-page-application"` for SPA
fallback (see *SPA routing* below).

## After the first deploy: configure Supabase

1. **Redirect URLs** — Supabase Dashboard → *Authentication → URL Configuration*:
   - **Site URL**: `https://dutycalls.pages.dev` (or your custom domain)
   - **Redirect URLs**: add `https://dutycalls.pages.dev/**` and any custom domain.
   This is required for OAuth (Google/Apple) and magic-link redirects to land
   back in the app.
2. **Edge Function base URL** — the `notify-group` function builds deep links from
   the `APP_URL` env var. Set it (Cloudflare domain) with:
   `supabase secrets set APP_URL=https://dutycalls.pages.dev`
3. **Deploy the Edge Function** (Web Push): `supabase functions deploy notify-group`
   and set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` secrets.

## SPA routing

DutyCalls is a single-page app, so any non-file path should serve the app shell.
Two equivalent mechanisms are included, depending on the deploy path you choose:

- **Workers Static Assets** (`wrangler deploy`, recommended): `not_found_handling =
  "single-page-application"` in `wrangler.toml` serves `index.html` (200) for any
  path that isn't a real static file.
- **Cloudflare Pages** (`wrangler pages deploy` or Git integration): `public/_redirects`
  with `/* /index.html 200`.

Real static assets (`/sw.js`, `/manifest.webmanifest`, `/assets/*`) are served directly
and are unaffected by either. (DutyCalls currently uses state-based navigation, so this
is mostly future-proofing for when real URL routes are added.)

## Custom domain (free)

In your Pages project → **Custom domains → Set up a custom domain**. If the domain
is on Cloudflare, DNS is configured automatically; otherwise add a `CNAME` to
`dutycalls.pages.dev`. Add the custom domain to Supabase's Redirect URLs too.

## Alternatives (also free)

- **Vercel** — first-class Vite support, generous free tier, preview deploys per PR.
- **Netlify** — free tier (100 GB bandwidth/month), `netlify deploy --prod`.
- **GitHub Pages** — free but no SPA fallback without hacks and no CDN frills.

Cloudflare Pages is recommended here for its unlimited bandwidth and global edge.
