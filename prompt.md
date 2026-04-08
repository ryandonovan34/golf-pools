# Golf Pool Web App — Build Prompt

## Project Overview

Build a full-stack web application for running **golf pools** among friends. The app allows users to create and join pools tied to real professional golf tournaments. Pool scoring is based on live stroke-play data polled from the ESPN API via Vercel Serverless Functions.

---

## Tech Stack

- **Frontend:** Next.js (App Router) with TypeScript and Tailwind CSS
- **Backend:** Vercel Serverless Functions (API routes under `/app/api/`)
- **Database:** Supabase (PostgreSQL) via the `@supabase/supabase-js` client
- **Hosting:** Vercel
- **Data Source:** ESPN Golf Leaderboard API (`https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga`)

---

## Data Model (Supabase Schema)

```sql
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  espn_event_id text not null unique,   -- ESPN's event ID for API polling
  name text not null,                   -- e.g. "The Masters 2026"
  course text,
  start_date date,
  end_date date,
  status text default 'upcoming',       -- upcoming | in_progress | complete
  created_at timestamptz default now()
);

create table pools (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  creator_name text not null,           -- display name of whoever created the pool
  admin_code text unique not null,      -- secret code for the creator to manage the pool
  name text not null,
  invite_code text unique not null,     -- short code for members to join
  is_locked boolean default false,      -- locks picks once tournament begins
  created_at timestamptz default now()
);

create table tiers (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references pools(id) on delete cascade,
  tier_number int not null,             -- 1 = best players, higher = lesser
  label text,                           -- optional custom label e.g. "Tier 1"
  constraint unique_tier_per_pool unique (pool_id, tier_number)
);

create table tier_players (
  id uuid primary key default gen_random_uuid(),
  tier_id uuid references tiers(id) on delete cascade,
  espn_player_id text not null,
  player_name text not null
);

create table pool_members (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references pools(id) on delete cascade,
  display_name text not null,           -- entered by the user when joining
  participant_token uuid not null,      -- generated server-side, stored in browser localStorage to identify returning users
  joined_at timestamptz default now(),
  constraint unique_token_per_pool unique (pool_id, participant_token)
);

create table picks (
  id uuid primary key default gen_random_uuid(),
  pool_member_id uuid references pool_members(id) on delete cascade,
  tier_id uuid references tiers(id) on delete cascade,
  espn_player_id text not null,
  player_name text not null,
  constraint one_pick_per_tier unique (pool_member_id, tier_id)
);

create table player_scores (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  espn_player_id text not null,
  player_name text not null,
  total_strokes int,                    -- cumulative strokes for the tournament
  to_par int,                           -- score relative to par (for display)
  rounds jsonb,                         -- e.g. [70, 68, null, null]
  made_cut boolean default true,
  position text,                        -- e.g. "T3", "MC"
  last_updated timestamptz default now(),
  constraint unique_score_per_tournament unique (tournament_id, espn_player_id)
);

create table cut_score (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade unique,
  sat_field_avg numeric(5,2),           -- field average strokes on Saturday (R3)
  sun_field_avg numeric(5,2)            -- field average strokes on Sunday (R4)
);
```

---

## Application Features

### Identity (No Authentication Required)
- No accounts, no login. Users are identified by a **`participant_token`** (a UUID) that is generated server-side when they create or join a pool and stored in the browser's `localStorage`.
- When creating a pool, the user provides their display name. The server returns an **`admin_code`** (a separate short secret) stored in `localStorage` so the creator can lock/manage their pool later.
- When joining a pool, the user provides the invite code and a display name. The server returns their `participant_token`, which is stored in `localStorage` so they can return to view their picks and the leaderboard.
- If a user clears their `localStorage`, they can re-join the pool with the same invite code under a new display name — no recovery mechanism is needed for this version.

---

### Home Page (`/`)
- Show two CTAs: **Create a Pool** and **Join a Pool**.
- On load, read any `participant_token` / `admin_code` entries stored in `localStorage` and display links to the pools the user has previously joined or created.

---

### Create a Pool (`/pools/new`)
1. Enter your **display name** (stored as `creator_name`).
2. Select (or auto-populate) a tournament from the `tournaments` table. Seed the Masters 2026 as the first entry.
3. Enter a pool name.
4. Define tiers:
   - Add/remove tiers dynamically.
   - For each tier, search for and assign PGA Tour players (fetched from the ESPN event roster) to that tier.
   - At least 2 players per tier are required (so every member has a meaningful choice).
5. On submit:
   - Insert the pool, tiers, and `tier_players` rows into Supabase.
   - Generate a unique 6-character alphanumeric `invite_code` and a separate `admin_code`.
   - Return both codes to the client; store `admin_code` in `localStorage`.
   - Redirect to the pool's management page. Display the `invite_code` prominently for sharing and remind the creator to save the page URL.

---

### Join a Pool (`/pools/join`)
- Two input fields: **invite code** and **your display name**.
- On submit:
  - Look up the pool by `invite_code`.
  - Generate a `participant_token` (UUID) server-side and insert a `pool_members` row.
  - Return the `participant_token` and pool `id` to the client; store both in `localStorage`.
  - Redirect to the pool detail page (`/pools/[id]?token=[participant_token]`).
- Show an error if the code is invalid, the pool is locked, or the display name is already taken in that pool.

---

### Pool Detail / Picks Page (`/pools/[id]`)
- The page reads the `participant_token` from `localStorage` (or a query param on first visit) to identify the current user.
- If the pool is **not locked** and no picks exist for this `participant_token` yet:
  - Display each tier with its assigned players.
  - User selects exactly one player per tier via radio buttons or a dropdown.
  - Submit button sends picks along with the `participant_token` to the API, which verifies the token belongs to the pool before saving.
  - After submission, show a confirmation and the current leaderboard.
- If the pool **is locked** (tournament has started):
  - Show all members' picks and the pool leaderboard.
- If no `participant_token` is found in `localStorage` for this pool, prompt the user to join via the invite code.

---

### Pool Leaderboard (embedded in Pool Detail Page)

Display a ranked table of all pool members, sorted ascending by total pool score (lower is better — stroke play).

| Rank | Member | Tier 1 Pick | Tier 2 Pick | … | Total Score |
|------|--------|-------------|-------------|---|-------------|

**Pool Score Calculation:**
- Each member's score = sum of `total_strokes` for each of their picked players.
- If a picked player **missed the cut** (`made_cut = false`):
  - Their score for rounds 3 & 4 = `sat_field_avg + sun_field_avg` from the `cut_score` table for that tournament.
  - Their R1 + R2 strokes are still counted as-is.
- Highlight each member's picks with their current tournament position and score relative to par.

---

## Vercel Serverless Functions (API Routes)

### `GET /api/espn/leaderboard?eventId=401811941`
- Polls the ESPN Golf API: `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event={eventId}`
- Parses each competitor: player name, ESPN player ID, round scores, total strokes, to-par, made cut status, position.
- Upserts rows into `player_scores`.
- Calculates and upserts `cut_score` (field average for R3 and R4 among players who made the cut) once R3/R4 data is available.
- Returns the updated leaderboard data as JSON.
- **Schedule:** Call this endpoint from a Vercel Cron Job every 10 minutes during tournament rounds (configure in `vercel.json`).

### `GET /api/espn/roster?eventId=401811941`
- Polls ESPN for the list of players entered in the event.
- Returns `[{ espnPlayerId, playerName }]` for use in the pool-creation tier-builder UI.

### `GET /api/pools/[id]/leaderboard`
- Reads picks, player scores, and cut scores from Supabase.
- Computes and returns the pool leaderboard rankings as JSON.
- Used by the frontend to refresh standings without a full page reload.

---

## ESPN API Notes

- **Base leaderboard URL:** `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga`
- Append `&event={espnEventId}` to target a specific tournament.
- The Masters 2026 ESPN event ID must be confirmed at build time (look up from the API or ESPN site).
- Key fields in the response: `competitors[].athlete.id`, `competitors[].athlete.displayName`, `competitors[].linescores` (round-by-round scores), `competitors[].score` (total to par), `competitors[].status.type.name` (e.g. `"active"`, `"cut"`).
- Parse `linescores` carefully — missing rounds will have no entry or a value of `0`.

---

## Vercel Cron Job (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/espn/leaderboard?eventId=401811941",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

Protect the cron route with a `CRON_SECRET` environment variable checked against the `Authorization` header Vercel sends automatically.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # used only in serverless functions, never exposed to client
CRON_SECRET=                     # protects the cron endpoint
```

> No auth-specific environment variables are required — Supabase Auth is not used.

---

## UI / UX Guidelines

- **Color palette:** Masters-inspired — deep green (`#1a5c38`), gold (`#c9a84c`), white, and off-white.
- Mobile-first responsive layout.
- Use a sticky header with the app name and a link back to the home page.
- Tournament status badge on pool cards: `Upcoming`, `In Progress`, or `Final`.
- Animate leaderboard row position changes when scores refresh.
- Show a countdown timer to tournament start on the home page and pool detail page when the tournament is upcoming.
- Empty states and loading skeletons for all async data fetches.

---

## Project Structure

```
/app
  /api
    /espn
      /leaderboard/route.ts
      /roster/route.ts
    /pools
      /[id]
        /leaderboard/route.ts
  /page.tsx                     # Home
    /pools
      /new/page.tsx             # Create pool
      /join/page.tsx            # Join pool
      /[id]/page.tsx            # Pool detail + leaderboard
/components
  /ui                           # Shared UI primitives (Button, Card, Badge, etc.)
  /pools
    TierBuilder.tsx
    PicksForm.tsx
    PoolLeaderboard.tsx
  /espn
    PlayerSearch.tsx
/lib
  /supabase
    client.ts                   # Browser client
    server.ts                   # Server-side client (uses service role key)
  /espn
    api.ts                      # ESPN fetch helpers + parsers
  /scoring
    pool-score.ts               # Pool score calculation logic
/supabase
  /migrations                   # SQL migration files
```

---

## Seed Data

Insert the following into `tournaments` at migration time:

```sql
insert into tournaments (espn_event_id, name, course, start_date, end_date, status)
values (
  '401811941',  -- confirm this is the correct ESPN event ID for Masters 2026
  'The Masters 2026',
  'Augusta National Golf Club',
  '2026-04-09',
  '2026-04-12',
  'in_progress'
);
```

---

## Acceptance Criteria

- [ ] A user can create a pool by entering their name, defining tiers, and assigning players — receiving an invite code and an admin code with no account required.
- [ ] A user can join a pool by entering an invite code and a display name, with their identity persisted via a `participant_token` in `localStorage`.
- [ ] A user can join a pool using an invite code and submit one pick per tier before the pool is locked.
- [ ] The ESPN leaderboard API is polled every 10 minutes during the tournament and scores are persisted in Supabase.
- [ ] Missed-cut players are automatically assigned field-average scores for R3 and R4.
- [ ] The pool leaderboard correctly calculates and ranks members by total strokes, refreshing without a full page reload.
- [ ] The app is deployed on Vercel and fully functional for The Masters 2026 (April 9–12, 2026).
