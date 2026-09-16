# AGENTS.md

This file gives AI coding agents (Claude Code, Cursor, etc.) the context needed to work correctly on this repo. Read this before making changes. **Work strictly in phase order — do not jump ahead to a later phase's tasks even if it seems convenient.**

---

## 1. What this project is

A multi-tenant **digital signage SaaS dashboard** (Screenfluence-style). Organizations upload media, build playlists ("Loops"), attach them to scheduling rules ("Campaigns"), and push them to physical screens ("Players") connected to TVs/LCDs.

---

## 2. Tech Stack (do not substitute without asking)

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router) |
| Backend | Next.js API routes / Route Handlers — same repo, no separate backend service |
| Database | Supabase (Postgres) |
| File storage | Supabase Storage (media library) |
| Realtime sync | Supabase Realtime (push updates to players — replaces MQTT for now) |
| Auth | Clerk — **Clerk Organizations = tenant/org boundary**, do not build a custom org table |
| Cache / rate limit / queues | Redis (Upstash) |
| Hosting | Vercel |
| Error tracking | Sentry |

Do not add Firebase, MongoDB, Express, or a separate backend server — everything lives in this one Next.js repo.

---

## 3. Repo structure

```
/app
  /(dashboard)              <- authenticated dashboard routes, wrapped in Clerk org context
    /overview/page.tsx
    /library/page.tsx
    /loops/page.tsx
    /campaigns/page.tsx
    /players/page.tsx
    /account/page.tsx
  /player/[playerId]/page.tsx   <- public-ish fullscreen player route, NOT part of dashboard layout
  /api
    /library/route.ts
    /library/folders/route.ts
    /loops/route.ts
    /loops/[id]/items/route.ts
    /campaigns/route.ts
    /campaigns/[id]/loops/route.ts
    /campaigns/[id]/exceptions/route.ts
    /campaigns/[id]/players/route.ts
    /players/route.ts
    /players/[id]/route.ts
    /players/pair/route.ts
/lib
  /supabase.ts               <- server + browser Supabase clients
  /redis.ts                  <- Upstash Redis client
  /clerk.ts                  <- org/session helpers
/middleware.ts                <- Clerk auth guard on (dashboard) routes
/types
  /db.ts                      <- generated Supabase types
```

Keep this structure. New features go in matching folders — don't invent parallel structures (e.g. no `/pages` dir, this is App Router only).

---

## 4. Coding conventions (apply in every phase)

- TypeScript everywhere, strict mode on
- Server Components by default; use Client Components only where interactivity is required (Loop Editor drag-drop, real-time player view, forms)
- Data fetching in API routes / route handlers, not ad-hoc client-side Supabase calls scattered around — keep a thin service layer in `/lib`
- Validate all API route inputs (zod) before touching the DB
- Tailwind CSS for styling — no separate CSS files unless truly global
- Every API route must check Clerk auth + org membership before touching data
- Every tenant-scoped table needs a `clerk_org_id` column + a Supabase **RLS policy** comparing it to `auth.jwt() ->> 'org_id'`. Never ship a table without RLS.
- Migrations go through Supabase CLI migration files — don't hand-edit the remote schema.

---

## PHASE 1 — Core Dashboard (Library → Loops → Players, no Campaigns yet)

Goal: an org can log in, upload media, build a loop, pair a player, and manually push a loop to it.

**Auth & tenancy**
- Wire up Clerk (Organizations = tenant boundary), protect `(dashboard)` routes via `middleware.ts`
- Set up Supabase project, enable RLS on every table from the start

**Library**
- `library_items`, `library_folders` tables
- Multi-file upload (images + videos) to Supabase Storage
- Grid/list view, sort by Name/Size/Duration/Date, folder nesting

**Loops**
- `loops`, `loop_items` tables (`orientation` field: landscape/portrait)
- "Create New Loop" with name + autocomplete of past names
- Loop Editor: add assets from Library, per-item duration in seconds (editable, including images), drag-to-reorder, live running-time total

**Players (basic)**
- `players` table with `rotation` field (0/90/180/270°)
- Pairing flow: device shows 6-digit code → "Add New Player" in dashboard → row created, status online
- Players list: status dot, Name, Player ID, Last Connected, Action (edit/delete)
- Edit Player modal: Name, Description, Location, Timezone, Rotation
- For Phase 1, a player can be manually assigned a `loop_id` directly (temporary — replaced by Campaigns in Phase 2)

**Overview**
- 4 stat cards (Library size, Loops count, Players count, Campaigns shows 0/placeholder for now)
- Recent Activities feed (`activity_logs`)
- Announcements panel (`announcements`)

**Exit criteria for Phase 1**: an org can upload media, build a loop, pair a player, and see it reflected in Overview + Players list.

---

## PHASE 2 — Web-based Player + Realtime

Goal: content actually plays on a screen and updates live, before any Campaign logic is added.

- Build `/player/[playerId]/page.tsx`: fullscreen, no dashboard layout
- Show pairing code fullscreen when unpaired
- Once paired, fetch assigned Loop's `loop_items` and play them in order, respecting each item's duration and the player's `rotation`
- Subscribe to Supabase Realtime so loop edits reflect on the player without refresh (fallback to polling only if the subscription drops)
- Local caching (Service Worker / IndexedDB) so playback survives brief internet loss
- Heartbeat: player pings an API route every 30s → update Redis (fast) → periodically sync to `players.last_seen_at` in Supabase → Players list status/Last Connected reflects it
- **Test on laptop/phone browser first** (kiosk mode / fullscreen), then on a Raspberry Pi + Chromium kiosk — do not move to native app work yet

**Exit criteria for Phase 2**: a loop assigned to a player visibly plays and updates live on a real screen (even just a laptop browser), survives a brief network drop, and shows correct online/offline status.

---

## PHASE 3 — Campaigns (scheduling + exceptions layer)

Goal: replace the Phase-1 direct loop-on-player assignment with the real Campaign model.

- `campaigns`, `campaign_loops` (many-to-many, ordered — a campaign can chain multiple loops), `campaign_players` (assign to one or more players/groups)
- `campaign_exceptions`: date-range / day-of-week override rules, each pointing to an override loop. Default state "No Exception" — **this is core, not optional, do not skip it**
- Campaigns list view: Name, Main Loop, Number of Loops, Players (count), Action
- Player resolution order (implement exactly this): check for an active exception today → else play the campaign's attached loop(s) in order → apply player's rotation
- Migrate Players' `loop_id` field usage to `campaign_id` — remove the Phase-1 shortcut

**Exit criteria for Phase 3**: assigning a Campaign (with an Exception active) to a player correctly overrides the normal loop on the right dates, live.

---

## PHASE 4 — Cloud Setup & Monitoring

Goal: make the product production-ready and observable.

- Deploy: Vercel (app) + Supabase (managed) + Upstash (Redis)
- Error tracking: Sentry across frontend + API routes
- Uptime monitoring: BetterStack/UptimeRobot on dashboard URL + key API routes
- Player fleet health: Redis heartbeat → alert if a player is offline beyond X minutes
- Rate limiting on public-facing routes (especially `/players/pair`)
- Run a small pilot (2-3 real players in real conditions) before full rollout

**Exit criteria for Phase 4**: the product runs unattended for real users with alerting in place if something breaks.

---

## PHASE 5 — Native Android Player App (do not start early)

Goal: replace the browser-based player with a native app for better auto-boot/remote-reboot/rotation control at scale.

- Kotlin app, WebView-wraps the same `/player/[playerId]` page (reuse Phase 2 work, don't rebuild playback logic natively)
- Add native auto-boot-on-power, remote reboot trigger, and OS-level rotation control
- Distribute via Play Store or direct APK sideload for B2B clients

**Do not scaffold any Android/React Native code before Phase 4 is complete and the web player has been tested end-to-end.**

---

## Environment variables (expected)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
```

Never commit real values. Use `.env.local` locally, Vercel env settings in deploy.

---

## What NOT to do (applies across all phases)

- Don't rename dashboard modules or reorder the sidebar (Overview → Library → Loops → Campaigns → Players → Account)
- Don't skip Campaign Exceptions as "extra" in Phase 3 — it's part of the core schema
- Don't add a custom auth/org system alongside Clerk
- Don't introduce a second backend framework/service
- Don't start Android/React Native work before Phase 5
- Don't touch production Supabase schema without a migration file
- Don't ship a new table without an RLS policy
