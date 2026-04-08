-- Golf Pools Initial Schema
-- Run this migration in your Supabase SQL editor or via the CLI

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  espn_event_id text not null unique,
  name text not null,
  course text,
  start_date timestamptz,
  end_date timestamptz,
  status text default 'upcoming',
  created_at timestamptz default now()
);

create table pools (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  creator_name text not null,
  admin_code text unique not null,
  name text not null,
  invite_code text unique not null,
  is_locked boolean default false,
  created_at timestamptz default now()
);

create table tiers (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references pools(id) on delete cascade,
  tier_number int not null,
  label text,
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
  display_name text not null,
  participant_token uuid not null,
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
  total_strokes int,
  to_par int,
  rounds jsonb,
  made_cut boolean default true,
  position text,
  last_updated timestamptz default now(),
  constraint unique_score_per_tournament unique (tournament_id, espn_player_id)
);

create table cut_score (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade unique,
  sat_field_avg numeric(5,2),
  sun_field_avg numeric(5,2)
);

-- Seed data: The Masters 2026
insert into tournaments (espn_event_id, name, course, start_date, end_date, status)
values (
  '401811941',
  'The Masters 2026',
  'Augusta National Golf Club',
  '2026-04-09T12:00:00Z',
  '2026-04-12T21:00:00Z',
  'upcoming'
);

-- Enable Row Level Security (permissive for this no-auth app)
alter table tournaments enable row level security;
alter table pools enable row level security;
alter table tiers enable row level security;
alter table tier_players enable row level security;
alter table pool_members enable row level security;
alter table picks enable row level security;
alter table player_scores enable row level security;
alter table cut_score enable row level security;

-- Public read access policies
create policy "Public read tournaments" on tournaments for select using (true);
create policy "Public read pools" on pools for select using (true);
create policy "Public read tiers" on tiers for select using (true);
create policy "Public read tier_players" on tier_players for select using (true);
create policy "Public read pool_members" on pool_members for select using (true);
create policy "Public read picks" on picks for select using (true);
create policy "Public read player_scores" on player_scores for select using (true);
create policy "Public read cut_score" on cut_score for select using (true);

-- Insert policies (allow inserts from anon for pool creation/joining)
create policy "Public insert pools" on pools for insert with check (true);
create policy "Public insert tiers" on tiers for insert with check (true);
create policy "Public insert tier_players" on tier_players for insert with check (true);
create policy "Public insert pool_members" on pool_members for insert with check (true);
create policy "Public insert picks" on picks for insert with check (true);
create policy "Public delete picks" on picks for delete using (true);

-- Service role handles player_scores and cut_score inserts/updates via server-side client
-- But we allow public insert for convenience (server-side uses service role key anyway)
create policy "Service insert player_scores" on player_scores for insert with check (true);
create policy "Service update player_scores" on player_scores for update using (true);
create policy "Service insert cut_score" on cut_score for insert with check (true);
create policy "Service update cut_score" on cut_score for update using (true);

-- Update policy for pools (lock)
create policy "Public update pools" on pools for update using (true);
