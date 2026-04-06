# KickBot Frontend

Frontend dashboard for managing the KickBot Discord notification system.

This repo is the user-facing dashboard that connects to the backend API for:
- Discord OAuth login
- guild switching and settings
- streamer management
- notification history
- onboarding and invite flow
- global admin tooling

## Stack

- React 18
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS v4
- shadcn/ui-style component architecture
- Radix UI primitives

## Related Repo

The backend and Discord bot live separately in:
- `KickBot`

This frontend expects the backend API and auth flow to be available.

## Environment

Copy `.env.example` to `.env` and set:

```bash
VITE_API_BASE_URL=http://localhost:4000
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

By default the Vite dev server runs locally and talks to the backend API defined in `VITE_API_BASE_URL`.

## VPS Deployment

This repo now includes frontend deployment scripts:

- `scripts/deploy.sh`
- `scripts/update.sh`

Typical first deployment on the VPS:

```bash
cp .env.example .env
chmod +x scripts/*.sh
chmod +x scripts/lib/*.sh
./scripts/deploy.sh
```

Typical update on the VPS:

```bash
./scripts/update.sh --force
```

Optional environment variables on the VPS:

- `FRONTEND_DEPLOY_TARGET_DIR`
  - if set, built files from `dist/` are synced there with `rsync`
- `FRONTEND_POST_DEPLOY_CMD`
  - if set, this command is executed after the build/sync step

This is useful if you want to copy the Vite build into a Caddy-served directory or restart a frontend service after deployment.

## Build

Production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Type-check the app:

```bash
npm run typecheck
```

## Backend Integration

The dashboard currently integrates with:

- `GET /auth/discord/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /dashboard/guilds`
- `GET /guilds/:guildId/config`
- `PUT /guilds/:guildId/config`
- `GET /guilds/:guildId/channels`
- `GET /guilds/:guildId/streamers`
- `POST /guilds/:guildId/streamers`
- `PATCH /guilds/:guildId/streamers/:streamerId`
- `DELETE /guilds/:guildId/streamers/:streamerId`
- `GET /guilds/:guildId/notifications`
- `GET /bot/invite-link`
- global admin endpoints exposed by the backend

## Product Areas

- overview dashboard
- guild management
- tracked streamers
- notification history
- setup / onboarding
- profile and account
- global admin screens

## Notes

- Requests are sent with `credentials: include`, so backend CORS and cookie settings must allow the frontend origin.
- The frontend expects the backend OAuth callback flow to redirect users back to `FRONTEND_URL/auth/callback`.
- This repo is intentionally separate from the bot/backend so frontend and backend can be pushed and deployed independently.
- The GitHub Action deploy workflow calls `./scripts/update.sh --force` on the VPS.
