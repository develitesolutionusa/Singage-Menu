# Signage Menu

Multi-tenant digital signage SaaS dashboard (Phase 1: Library → Loops → Players).

## Stack

- Next.js (App Router)
- Clerk (Organizations = tenants)
- Supabase (Postgres + Storage + RLS)
- Upstash Redis (wired; used heavily from Phase 2+)
- Tailwind CSS

## Setup

1. Copy env template and fill values:

```bash
cp .env.example .env.local
```

2. In Clerk:
   - Create an application
   - Enable **Organizations**
   - Set sign-in/sign-up URLs to `/sign-in` and `/sign-up`

3. In Supabase:
   - Create a project
   - Run the migration:

```bash
npx supabase db push
# or apply supabase/migrations/20260316000000_phase1_core.sql in the SQL editor
```

4. Install & run:

```bash
npm install
npm run dev
```

## Phase 1 flow

1. Sign in and create/select a Clerk Organization
2. Upload media in **Library**
3. Create a **Loop** and add assets in the Loop Editor
4. Open `/player` on a device → note the 6-digit code
5. **Players → Add New Player** → enter the code
6. Edit the player to assign a loop
7. Confirm counts on **Overview**

## Phase 2 — Player playback

1. Open `/player` (redirects to `/player/[playerId]`)
2. Pair + assign a loop as in Phase 1
3. The player screen plays the loop fullscreen (respects item durations + rotation)
4. Edit the loop in the dashboard — player updates live (Realtime, with polling fallback)
5. Players list online/Last Connected updates via 30s heartbeat (Redis when configured, else Supabase)

Optional: set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for fast heartbeat storage.
