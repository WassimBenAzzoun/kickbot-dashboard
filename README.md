# KickBot Dashboard

Static React/Vite dashboard for the KickBot NestJS backend. The repositories and deployments remain separate: Vercel serves only this SPA, while Heroku runs the HTTP API and Discord bot.

## Local development

Requirements: Node.js 24 and the backend listening on port `4000`.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Browser calls always use `/api/v1`; Vite proxies `/api` to `BACKEND_PROXY_TARGET` (default `http://localhost:4000`). This mirrors production and requires no browser-visible API environment variable.

Useful checks:

```bash
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

## Vercel deployment

1. Create a Vercel project from this repository and keep the framework preset as Vite.
2. The committed `/api` rewrite targets the `discord-notifications` Heroku production app.
3. Keep the production branch as `main`. The committed Git configuration disables automatic deployments for every other branch, including previews.
4. No Vercel environment variable is needed for the API URL. The ordered CDN rewrites proxy `/api/*` to Heroku first and send all other deep links to `index.html`.

Vercel builds `dist/` with Node 24. There are no SSR routes, Serverless Functions, or middleware.

## Backend and Discord production settings

After the final Vercel hostname is known, configure the Heroku app:

```text
FRONTEND_URL=https://<VERCEL_PROJECT>.vercel.app
CORS_ORIGINS=https://<VERCEL_PROJECT>.vercel.app
DISCORD_REDIRECT_URI=https://<VERCEL_PROJECT>.vercel.app/api/v1/auth/discord/callback
COOKIE_SECURE=true
```

Leave `COOKIE_DOMAIN` unset so the proxied session cookie belongs to the Vercel origin. Register these Discord OAuth redirects:

```text
http://localhost:3000/api/v1/auth/discord/callback
https://<VERCEL_PROJECT>.vercel.app/api/v1/auth/discord/callback
```

The backend remains authoritative for authentication, guild permissions, and global-admin access. Hiding admin routes in this SPA is only a user-interface convenience.

## Discord Instants

The guild workspace includes an Instants page for voice-channel selection, Myinstants search, pasted page links, and live queue control. Global admins configure the disabled-by-default kill switch, `EVERYONE`/`ALLOWLIST_ONLY` mode, and Discord-user allowlist under **Admin → Instants**. Queue polling uses the existing same-origin `/api/v1` proxy and adds no Vercel compute.

## API contract

The canonical prefix is `/api/v1`. The client consumes direct entity responses, `{ items, page: { nextCursor, hasMore } }` collections, normalized error objects, and cursor-based notification history. The live backend OpenAPI contract is available at `/api/docs-json` through the same proxy.
