# 🏌️⛳️ Golf Pools

A web app for running golf pools among friends. Create a pool for a tournament, invite friends with a code, draft players across tiers, and watch the live leaderboard update throughout the tournament.

## Features

- **Create & join pools** — share a 6-character invite code with friends
- **Tiered player drafts** — admin builds tiers; members pick one player per tier
- **Auto-lock at tee time** — picks automatically lock at the first tee time (8 AM ET Thursday)
- **Live leaderboard** — scores pulled from ESPN via client-side polling whenever someone has the app open
- **Missed-cut penalty** — players who miss the cut are assigned field-average scores for Rounds 3 & 4
- **No accounts required** — identity is managed via browser-stored participant tokens

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Framework    | [Next.js 15](https://nextjs.org/) (App Router) |
| Language     | TypeScript                          |
| Styling      | [Tailwind CSS 4](https://tailwindcss.com/) |
| Database     | [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security) |
| Scoring Data | [ESPN Golf API](https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard) |
| Hosting      | [Vercel](https://vercel.com/)       |

## Project Structure

```
app/
├── api/
│   ├── tournaments/        # GET active tournament
│   ├── espn/
│   │   ├── leaderboard/    # ESPN score refresh (client-triggered)
│   │   └── roster/         # Fetch ESPN field for tier building
│   └── pools/
│       ├── create/         # POST new pool
│       ├── join/           # POST join with invite code
│       └── [id]/
│           ├── route.ts    # GET pool detail, PATCH lock
│           ├── picks/      # POST/update member picks
│           └── leaderboard/# GET computed pool standings
├── pools/
│   ├── new/                # Create pool page
│   ├── join/               # Join pool page
│   └── [id]/               # Pool detail page
├── layout.tsx
├── page.tsx                # Home page
└── globals.css
components/
├── ui/                     # Button, Card, Badge, Input, LoadingSkeleton
└── pools/                  # PicksForm, PoolLeaderboard, CountdownTimer, etc.
lib/
├── supabase/               # Lazy-initialized Supabase clients (client + server)
├── espn/                   # ESPN API fetch helpers
├── scoring/                # Pool score calculation with missed-cut logic
├── types.ts                # Shared TypeScript interfaces
└── storage.ts              # localStorage helpers for tokens & admin codes
supabase/
└── migrations/
    └── 001_initial_schema.sql
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Supabase](https://supabase.com/) project (free tier works)
- A [Vercel](https://vercel.com/) account (for deployment)

## Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com/)

2. Open the **SQL Editor** in your Supabase dashboard

3. Paste and run the contents of `supabase/migrations/001_initial_schema.sql`

   This creates all tables, enables Row Level Security, adds RLS policies, and seeds The Masters 2026 tournament data.

4. Grab your credentials from **Settings → API**:
   - Project URL
   - `anon` public key
   - `service_role` secret key

## Local Development

1. **Clone the repo**

   ```bash
   git clone <your-repo-url>
   cd golf-pools
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase credentials:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

5. **Build for production (optional)**

   ```bash
   npm run build
   npm start
   ```

## Deploying to Vercel

1. **Push to GitHub** — connect your repo to Vercel

2. **Import the project** at [vercel.com/new](https://vercel.com/new)

3. **Add environment variables** in the Vercel dashboard (Settings → Environment Variables):

   | Variable                         | Value                        |
   | -------------------------------- | ---------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`       | Your Supabase project URL    |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Your Supabase anon key       |
   | `SUPABASE_SERVICE_ROLE_KEY`      | Your Supabase service role key |

4. **Deploy** — Vercel will build and deploy automatically

   No cron jobs needed — scores are refreshed via client-side polling whenever someone has the leaderboard open.

## How It Works

1. **Admin creates a pool** — selects the tournament, names the pool, and builds player tiers by dragging from the ESPN field roster
2. **Admin shares the invite code** — a 6-character code friends use to join
3. **Members join and pick** — one player per tier, editable until first tee time
4. **Picks auto-lock** — at the tournament start time (8 AM ET Thursday for The Masters)
5. **Live scoring** — when anyone has the leaderboard open, the browser polls ESPN every 60 seconds and writes updated scores to Supabase
6. **Leaderboard** — the pool page shows a live leaderboard that auto-refreshes every 60 seconds, with each member's total score computed from their picked players

